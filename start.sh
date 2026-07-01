#!/bin/sh
set -e

python manage.py migrate --no-input
python manage.py seed_framework

# Create superuser from env vars on first deploy; safe to re-run (no-ops if exists).
python manage.py createsuperuser --no-input 2>/dev/null || true

exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3
