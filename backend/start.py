#!/usr/bin/env python
"""Single-command local backend bootstrap and development server runner.

It creates/reuses ``.venv``, installs missing dependencies, creates ``.env``
with a unique Django secret, starts Postgres through Docker Compose, waits for
it, validates Django, migrates, seeds demo data, and starts the dev server.

Usage:
    python start.py
"""

import os
import re
import shutil
import subprocess
import sys
import time
import venv
from importlib.util import find_spec
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
VENV_DIR = BACKEND_DIR / ".venv"
VENV_PYTHON = VENV_DIR / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
os.chdir(BACKEND_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "foresight_backend.settings")


def log(message: str) -> None:
    print(f"[start] {message}", flush=True)


def run(command: list[str], *, description: str) -> None:
    log(description)
    subprocess.run(command, check=True)


def ensure_runtime() -> None:
    """Run this script from the project virtual environment with dependencies."""
    if Path(sys.prefix).resolve() != VENV_DIR.resolve():
        if not VENV_PYTHON.exists():
            log("Creating backend virtual environment...")
            venv.EnvBuilder(with_pip=True).create(VENV_DIR)

        args = [str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]]
        if os.name == "nt":
            # On Windows, os.execv detaches the console causing migrate output
            # to block on a full pipe buffer. Use subprocess.run + sys.exit instead.
            sys.exit(subprocess.run(args).returncode)
        else:
            os.execv(str(VENV_PYTHON), args)

    required_modules = ("django", "environ", "psycopg")
    if any(find_spec(module) is None for module in required_modules):
        run(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
            description="Installing missing backend dependencies...",
        )


def ensure_env_file() -> None:
    env_path = BACKEND_DIR / ".env"
    example_path = BACKEND_DIR / ".env.example"
    if not env_path.exists():
        if not example_path.exists():
            raise RuntimeError("Missing .env and .env.example; cannot configure backend startup.")
        shutil.copy(example_path, env_path)
        log(
            ".env created from .env.example -- fill in real secrets "
            "(e.g. LEMON_SQUEEZY_WEBHOOK_SECRET) before using features that need them."
        )

    env_contents = env_path.read_text()
    # JWT_SECRET signs access/refresh tokens (rest_framework_simplejwt) and is
    # kept separate from DJANGO_SECRET_KEY so rotating one never invalidates
    # the other's tokens/sessions -- both get the same fill-in-if-blank
    # treatment on a fresh checkout.
    for env_var in ("DJANGO_SECRET_KEY", "JWT_SECRET"):
        if re.search(rf"^{env_var}=.+$", env_contents, flags=re.MULTILINE):
            continue

        from django.core.management.utils import get_random_secret_key

        generated_secret = f"{env_var}={get_random_secret_key()}"
        if re.search(rf"^{env_var}=.*$", env_contents, flags=re.MULTILINE):
            # Key present but blank -- fill it in in place.
            env_contents = re.sub(
                rf"^{env_var}=.*$", generated_secret, env_contents, flags=re.MULTILINE
            )
        else:
            # Key missing entirely (existing .env predating this var) -- append it.
            env_contents = env_contents.rstrip("\n") + f"\n{generated_secret}\n"
        log(f"Generated a unique local {env_var} in .env.")

    env_path.write_text(env_contents)


def docker_compose_cmd() -> list[str] | None:
    if shutil.which("docker") is None:
        return None
    probe = subprocess.run(["docker", "compose", "version"], capture_output=True)
    if probe.returncode == 0:
        return ["docker", "compose"]
    if shutil.which("docker-compose") is not None:
        return ["docker-compose"]
    return None


def start_database() -> None:
    """Start the Postgres and Redis containers and block until healthy.

    Uses ``docker compose up --wait`` which polls each container's built-in
    healthcheck (pg_isready / redis-cli ping) instead of our own TCP retry
    loop, so startup is faster and we avoid repeatedly hammering the port
    before the services are ready to accept connections.
    """
    compose = docker_compose_cmd()
    if compose is None:
        log(
            "Docker not found on PATH -- assuming Postgres and Redis are already "
            "running (see .env DB_HOST/DB_PORT, REDIS_URL)."
        )
        return

    log("Starting Postgres and Redis via Docker Compose...")

    # --wait: block until all services with a healthcheck report healthy.
    # Falls back to the old -d path if the installed Docker version is too old
    # to support --wait (Docker Compose v2.1.0+, Docker Desktop ships this).
    result = subprocess.run(
        [*compose, "up", "-d", "--wait", "db", "redis"],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        log("Postgres and Redis are ready.")
        return

    # --wait unsupported or Docker Desktop not running: fall back gracefully.
    log(
        "Docker Compose --wait failed (Docker Desktop may still be starting). "
        "Retrying without --wait and polling the port..."
    )
    if result.stderr.strip():
        log(result.stderr.strip())

    result2 = subprocess.run([*compose, "up", "-d", "db", "redis"], capture_output=True, text=True)
    if result2.returncode != 0:
        log(
            "Docker Compose could not start Postgres/Redis (is Docker Desktop running?) -- "
            "falling back to already-running services (see .env DB_HOST/DB_PORT, REDIS_URL)."
        )
        if result2.stderr.strip():
            log(result2.stderr.strip())
        return

    # Manual wait loop as a last resort when --wait isn't supported. Only
    # Postgres is polled here (Django can't even boot without it); Redis is
    # only needed for Celery, which is optional for running the dev server.
    _wait_for_database_tcp()


def _wait_for_database_tcp(timeout: int = 60) -> None:
    """Legacy TCP-probe loop used when docker compose --wait is unavailable."""
    import environ
    import psycopg

    env = environ.Env()
    environ.Env.read_env(BACKEND_DIR / ".env")
    dsn_kwargs = {
        "dbname": env("DB_NAME", default="foresight_db"),
        "user": env("DB_USER", default="foresight_user"),
        "password": env("DB_PASSWORD", default="foresight_dev_password"),
        "host": env("DB_HOST", default="127.0.0.1"),
        "port": env("DB_PORT", default="5432"),
    }

    log("Waiting for Postgres to accept connections...")
    deadline = time.monotonic() + timeout
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            conn = psycopg.connect(**dsn_kwargs, connect_timeout=3)
            conn.close()
            log("Postgres is ready.")
            return
        except psycopg.OperationalError as exc:
            last_error = exc
            time.sleep(1)
    raise RuntimeError(f"Postgres did not become ready within {timeout}s: {last_error}")


def run_manage(*args: str) -> None:
    run([sys.executable, "manage.py", *args], description="manage.py " + " ".join(args))


def ensure_migrations() -> None:
    """Auto-generate migrations if any model has drifted from its migration state.

    Prevents the startup warning: 'Your models in app(s): ... have changes
    that are not yet reflected in a migration'. Runs makemigrations only when
    --check exits non-zero (i.e. there actually are unapplied model changes),
    so clean runs add zero overhead.
    """
    check = subprocess.run(
        [sys.executable, "manage.py", "makemigrations", "--check"],
        capture_output=True,
    )
    if check.returncode != 0:
        log("Model changes detected -- generating migrations automatically...")
        run([sys.executable, "manage.py", "makemigrations"], description="manage.py makemigrations")


def main() -> None:
    ensure_runtime()
    ensure_env_file()
    start_database()
    run_manage("check")
    ensure_migrations()
    run_manage("migrate", "--noinput")
    run_manage("seed_demo_data")

    host = os.environ.get("RUNSERVER_HOST", "127.0.0.1:8000")
    log(f"Starting Django dev server on {host} (Ctrl+C to stop)...")
    try:
        subprocess.run([sys.executable, "manage.py", "runserver", host], check=True)
    except KeyboardInterrupt:
        log("Stopped.")


if __name__ == "__main__":
    main()
