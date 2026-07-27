#!/usr/bin/env bash
# Render.com Web Service start command. Run from the `backend/` directory
# (Render "Root Directory" setting), with $PORT supplied by Render.
set -o errexit

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Runs the nightly Churn Scoring Engine sweep and other queued tasks.
# Backgrounded so Gunicorn (the process Render's health checks/port binding
# expect) becomes PID 1's foreground job below.
celery -A foresight_backend worker --loglevel=info &

exec gunicorn foresight_backend.wsgi:application --bind 0.0.0.0:"$PORT"
