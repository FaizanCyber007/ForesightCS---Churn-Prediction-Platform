"""
Celery application entrypoint.

Background execution for work that must not run in-request (e.g. the
nightly Churn Scoring Engine sweep -- see customers/tasks.py). Config is
pulled from Django settings under the `CELERY_` namespace so broker/backend
URLs live in one place (.env via foresight_backend/settings.py), not
duplicated here.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "foresight_backend.settings")

app = Celery("foresight_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
