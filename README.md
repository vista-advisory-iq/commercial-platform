# VAP Commercial Operations Platform

An internal web application for DEL's commercial deal lifecycle (a pilot, built
by VAP). A **Django + DRF + PostgreSQL** backend with a **React + Vite + Tailwind**
frontend, covering the full pipeline from deal origination through delivery.

The whole flow is enforced server-side, audited, and notified end to end:

```
Draft → Submit → Stage 1 gates ⇄ Stage 2 scoring → IC decision (GO)
   → Proposal → PDF → Accepted → Delivery project
        with a cost model, a discussion thread, and a full audit trail throughout
```

---

## What's in here

```
config/            Django project (settings, urls, wsgi/asgi)
apps/
  accounts/        Custom User (UUID PK, email login) + five roles
  audit/           CDC: append-only state + field history, current-user middleware
  screening/       Reference data: knockout gates, pillars, sub-criteria (3 levels)
  deals/           Core deal, intake, Stage 1 gates, Stage 2 scoring, IC decision,
                   discussion thread, lifecycle service, permissions, API
  notifications/   In-app + email alerts, one producer per lifecycle event
  proposals/       Module 2: commercial proposal lifecycle + PDF export (reportlab)
  projects/        Module 3: delivery tracker (milestones, risks, RAG, lifecycle)
  costing/         Module 4: cost model (CAPEX/OPEX + financing → payback/NPV/IRR)
  common/          Cross-cutting: DRF exception handler (TransitionError → HTTP 400)
frontend/          React + Vite + TypeScript SPA (Tailwind + shadcn-style UI)
```

### The pieces that matter most

- **`apps/deals/services.py`** — the deal lifecycle state machine. *All* state
  changes go through here, so every transition is validated and audited. Nothing
  else writes `deal.state` directly.
- **`apps/deals/scoring.py`** — the Stage 2 pillar scoring engine. Sub-criterion
  grades (1/3/5) roll up to weighted pillar scores and a 0–100 weighted total; the
  GO / CONDITIONAL / NO-GO bands are config-driven (`settings.STAGE2_SCORE_BANDS`).
- **`apps/audit/`** — the change-data-capture layer. Append-only history tables
  record who changed what, when, and why; the current user is captured via
  middleware and threaded into every audit write.
- **`apps/deals/permissions.py`** — the access-control matrix in code.

---

## The five roles

| Role | Does |
|---|---|
| **BD** (Business Developer) | Originates deals, fills intake, submits, runs the proposal |
| **Analyst / Manager** | Assess Stage 1 gates, score Stage 2, send proposals, run delivery, build cost models |
| **IC Member** | Records the final Stage 2 GO / CONDITIONAL / NO-GO decision |
| **Admin** | Full back-office (Django admin) |

---

## Local setup

### 1. Prerequisites
- **Python 3.12** (Django 5.0.6 supports 3.10–3.12 only — do **not** use 3.13+;
  it breaks the Django admin)
- **Node.js 18+** and npm (for the frontend)
- **PostgreSQL 14+** running locally

### 2. Create the database
```sql
-- In psql, as a superuser:
CREATE DATABASE vap_commercial;
CREATE USER vap_user WITH PASSWORD 'choose-a-password';
GRANT ALL PRIVILEGES ON DATABASE vap_commercial TO vap_user;
-- On PostgreSQL 15+, also grant schema rights:
\c vap_commercial
GRANT ALL ON SCHEMA public TO vap_user;
```

### 3. Set up the backend
```bash
cd vap-commercial-platform
py -3.12 -m venv venv                 # macOS/Linux: python3.12 -m venv venv
venv\Scripts\activate                 # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env                  # then edit .env: DB password + a SECRET_KEY
```

Generate a SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 4. Migrate, seed, and create an admin
```bash
python manage.py migrate
python manage.py seed_framework       # loads the 5 gates + 5 pillars + sub-criteria
python manage.py createsuperuser      # your Admin login (email + username + password)
```

### 5. Set up the frontend
```bash
cd frontend
npm install
```

### 6. Run both servers (two terminals)

**Terminal 1 — backend** (from the project root, venv active):
```bash
python manage.py runserver            # http://localhost:8000
```

**Terminal 2 — frontend** (from `frontend/`):
```bash
npm run dev                           # http://localhost:5173
```

Then open:
- **App:** http://localhost:5173 (log in with your superuser email + password)
- **Django admin:** http://localhost:8000/admin/ (or http://localhost:5173/admin/ — proxied)

> The Vite dev server proxies `/api`, `/admin`, and `/static` to Django on port
> 8000, so everything works from `:5173`. If port 8000 is taken by another app,
> run `python manage.py runserver 8001` and update the proxy targets in
> `frontend/vite.config.ts`.

---

## Configuration (`.env`)

| Variable | Purpose | Default |
|---|---|---|
| `SECRET_KEY` | Django secret | insecure dev key |
| `DEBUG` | Debug mode | `True` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | PostgreSQL | `vap_commercial` / `vap_user` / — / `localhost` / `5432` |
| `CORS_ALLOWED_ORIGINS` | Frontend origin(s) | `http://localhost:5173` |
| `STAGE1_CONDITIONAL_POLICY` | How a CONDITIONAL gate caps the outcome | `ADVANCE_CAPPED` (\| `BLOCK` \| `PASS`) |
| `STAGE2_SCORE_BANDS` | GO/CONDITIONAL/NO-GO bands (JSON) | `{"GO":80,"CONDITIONAL":65}` |
| `EMAIL_BACKEND` | Email transport | console (prints to terminal in dev) |

**Stage 2 decision bands (DEL-confirmed):** weighted total **≥80 → GO**,
**65–79 → CONDITIONAL GO**, **<65 → NO-GO**. Read from config, not hardcoded.

---

## The deal lifecycle (enforced)

```
DRAFT ─submit─> SUBMITTED ─take─> UNDER_REVIEW ─┬─ reject(reason) ─> REJECTED_TO_BD ─resubmit─┐
                                                ├─ Stage 1 pass ───> STAGE1_PASSED            │
                                                └─ Stage 1 fail ───> DECLINED                 │
   REJECTED_TO_BD ───────────────────────────────────────────────────────────────────────────┘

STAGE1_PASSED ─IC decision─> STAGE2_GO | STAGE2_CONDITIONAL | STAGE2_NO_GO
              └─ re-assess gates ─> (still pass) stays, or (knockout) ─> DECLINED (clears Stage 2 scores)
```

- **Stage 1** is a per-gate knockout assessment (5 gates, PASS / CONDITIONAL / FAIL);
  the outcome is derived from the verdicts, not entered manually. Gates stay
  editable through Stage 2 — re-assessing to a knockout declines the deal and
  clears its Stage 2 scores (with confirmation).
- **Stage 2** scores the 5 pillars via weighted sub-criteria; the **IC** records
  the final GO / CONDITIONAL / NO-GO (it may override the computed recommendation).
- A rejection requires a reason — the transition is refused without one.

---

## Modules

| Module | What it does |
|---|---|
| **1 — Deal lifecycle** | Intake, Stage 1 gates, Stage 2 scoring, IC decision, audit, discussion |
| **2 — Proposal** | One per GO deal: structured offer, DRAFT→IN_REVIEW→SENT→ACCEPTED/REJECTED, PDF export |
| **3 — Project Tracker** | Auto-created on proposal acceptance: milestones, RAG health, risks/issues, key dates |
| **4 — Cost Modeller** | Per-deal CAPEX/OPEX + financing → total cost, payback, NPV, IRR (computed live) |

---

## API quick reference

```bash
# 1. Get a token (your superuser email + password)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"you@del.test","password":"yourpassword"}'

# 2. Use the access token
curl http://localhost:8000/api/me/ -H "Authorization: Bearer <access_token>"
```

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET /api/me/` |
| Deals | `GET/POST /api/deals/`, `/{id}/submit/`, `/take/`, `/reject/`, `/history/`, `/comments/` |
| Stage 1 | `GET/POST /api/deals/{id}/gates/`, `POST /api/deals/{id}/finalize_stage1/` |
| Stage 2 | `GET/POST /api/deals/{id}/scoring/`, `POST /api/deals/{id}/decide_stage2/` |
| Edit access | `POST /api/deals/{id}/request-edit/`, `/api/edit-access-requests/{id}/approve/` \| `/deny/` |
| Notifications | `GET /api/notifications/`, `/unread_count/`, `/{id}/read/`, `/mark_all_read/` |
| Proposals | `GET/POST/PATCH /api/proposals/`, `/{id}/submit/`, `/send/`, `/outcome/`, `/document/` (PDF) |
| Projects | `GET/PATCH /api/projects/` (+ `/change_status/`), `/api/milestones/`, `/api/risks/` |
| Costing | `GET/POST/PATCH /api/cost-models/`, `/api/cost-lines/` |

---

## Notes & conventions

- **State changes go through the service layer** (`apps/*/services.py`); never set
  a status field directly in a view, serializer, signal, or the admin.
- **Audit tables are append-only** — never updated or deleted (read-only in the admin).
- **Pillars are scored indirectly** — sub-criteria graded 1/3/5 roll up; pillars
  are never graded directly.
- There is no automated test suite yet; non-trivial logic was verified with
  scripted end-to-end checks during the build. See `CLAUDE.md` for the full set of
  conventions and config knobs.

---

## Tech stack

- **Backend:** Python 3.12 · Django 5.0.6 · DRF 3.15 · djangorestframework-simplejwt ·
  PostgreSQL 14+ (psycopg 3) · reportlab (PDF)
- **Frontend:** React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · React Router · axios
