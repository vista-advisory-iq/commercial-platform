# Multi-stage build: build the React app, then run Django + the built SPA.

# --- Stage 1: build the frontend ---
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python runtime ---
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Bring in the built SPA so Django/WhiteNoise can serve it.
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Collect Django admin + DRF static into STATIC_ROOT (no DB needed).
RUN python manage.py collectstatic --no-input

# Apply migrations, then serve. $PORT is provided by the host (Render).
CMD python manage.py migrate --no-input && \
    gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3
