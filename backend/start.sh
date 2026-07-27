#!/usr/bin/env bash
# Render.com Web Service start command. Run from the `backend/` directory
# (Render "Root Directory" setting), with $PORT supplied by Render.
set -o errexit
# Print every command before running it so Render's deploy logs show exactly
# which step failed when the script exits with status 1.
set -o xtrace

echo "==> Step 1/4: Applying database migrations..."
python manage.py migrate --noinput

echo "==> Step 2/4: Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Step 3/4: Starting Celery worker (backgrounded)..."
# Only start Celery if REDIS_URL points to a real broker (not the local-dev
# default). On Render free tier without a Redis add-on the worker would
# crash-loop; skip it so Gunicorn (step 4) still comes up.
if [ -n "${REDIS_URL:-}" ] && [ "${REDIS_URL}" != "redis://127.0.0.1:6379/0" ]; then
    celery -A foresight_backend worker --loglevel=info &
else
    echo "    REDIS_URL not configured or points to localhost -- skipping Celery worker."
fi

echo "==> Step 4/4: Starting Gunicorn on port ${PORT}..."
exec gunicorn foresight_backend.wsgi:application --bind 0.0.0.0:"${PORT}"
