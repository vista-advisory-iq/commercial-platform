# Deploying VAP Commercial Platform (free, for testing)

The app is set up to deploy as **one service**: Django serves the **API**, the
**admin**, and the **built React app** (so you get a single shareable URL). The
recommended free host is **Render** (free web service + free PostgreSQL).

> Free-tier notes: the web service **sleeps after ~15 min idle**, so the first
> request after a pause takes ~50s to wake. Render's free Postgres is free for a
> limited window — fine for testing. Good enough to share a link with the team.

## What's already in the repo
- `Dockerfile` — multi-stage build (builds the React app, then runs Django).
- `render.yaml` — Render Blueprint: one web service + one Postgres DB.
- Settings read `DATABASE_URL`, generate-friendly `SECRET_KEY`, `DEBUG`, and trust
  Render's hostname automatically. WhiteNoise serves static + the SPA.

## Steps

### 1. Put the project on GitHub
This isn't a git repo yet, so:
```bash
cd vap-commercial-platform
git init
git add .
git commit -m "VAP Commercial Platform"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/vap-commercial-platform.git
git branch -M main
git push -u origin main
```
(`.gitignore` already excludes `venv/`, `node_modules/`, `.env`, etc. Don't commit your real `.env`.)

### 2. Create the service on Render
1. Sign in at **https://render.com** (free).
2. **New → Blueprint**, connect your GitHub and pick this repo.
3. Render reads `render.yaml` and proposes a **web service** + a **Postgres** DB.
   Click **Apply**. It generates `SECRET_KEY`, wires `DATABASE_URL`, and sets `DEBUG=False`.
4. Wait for the build + deploy (first build takes a few minutes).

### 3. Seed data + create your admin (once)
Open the web service → **Shell** tab and run:
```bash
python manage.py seed_framework
python manage.py createsuperuser     # email + username + password
```
(Migrations run automatically on every deploy.)

### 4. Open the link and log in
Your URL is `https://vap-commercial.onrender.com` (or whatever name you chose).
Log in with the superuser email + password. Share that URL with your team.

> The superuser has role **Admin**. To demo the other roles, create users in the
> admin (`/admin/accounts/user/`) with roles BD / Analyst / Manager / IC Member.

## Alternatives
- **Railway** / **Fly.io** also work with the same `Dockerfile` (point their build
  at it; set `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`, and `ALLOWED_HOSTS` /
  `CSRF_TRUSTED_ORIGINS` to your domain).
- **Split hosting** (frontend on Netlify/Vercel, backend on Render) is possible but
  needs CORS + an API base URL; the single-service setup above avoids that.

## Local dev is unaffected
None of this changes local development — without `DATABASE_URL` it uses your local
Postgres, and the Vite dev server still serves the SPA on :5173. See `README.md`.
