# VAP Commercial Operations Platform — Backend

Stage 1 backend foundation: authentication, the five-role hierarchy, the deal
lifecycle, and append-only change data capture (CDC). Built with Django + DRF
against PostgreSQL.

This is the foundation the rest of the platform builds on. It implements the
Stage 1 portion of the *Data Model & Audit Specification*.

---

## What's in here

```
config/            Django project (settings, urls, wsgi/asgi)
apps/
  accounts/        Custom User + five roles (BD, Analyst, Manager, IC, Admin)
  audit/           CDC: append-only state + field history, current-user middleware
  screening/       Reference data: knockout gates, pillars, sub-criteria (3 levels)
  deals/           Core deal, intake, lifecycle service, permissions, API
```

### The pieces that matter most

- **`apps/deals/services.py`** — the deal lifecycle state machine. *All* state
  changes go through here, so every transition is validated and audited. Nothing
  else writes `deal.state` directly.
- **`apps/audit/`** — the change-data-capture layer. Two append-only tables
  (`deal_state_history`, `deal_field_history`) record who changed what, when, and
  why. The current user is captured via middleware and threaded into every audit
  write.
- **`apps/deals/permissions.py`** — the access-control matrix in code (BD sees
  only their own deals, read-only after submit; analysts/managers assess; etc.).

---

## Local setup (Python venv + PostgreSQL)

### 1. Prerequisites
- Python 3.11+ (3.12 fine)
- PostgreSQL 14+ running locally

### 2. Create the database
```bash
# In psql, as a superuser:
CREATE DATABASE vap_commercial;
CREATE USER vap_user WITH PASSWORD 'choose-a-password';
GRANT ALL PRIVILEGES ON DATABASE vap_commercial TO vap_user;
-- On PostgreSQL 15+, also grant schema rights:
\c vap_commercial
GRANT ALL ON SCHEMA public TO vap_user;
```

### 3. Set up the project
```bash
cd vap-commercial-platform
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then edit .env with your DB password + a SECRET_KEY
```

Generate a SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 4. Migrate, seed, and create an admin
```bash
python manage.py migrate
python manage.py seed_framework          # loads the 5 gates + 5 pillars + sub-criteria
python manage.py createsuperuser         # your Admin login (email + username + password)
```

### 5. Run it
```bash
python manage.py runserver
```

- Admin back office: http://localhost:8000/admin/
- API root (auth required): http://localhost:8000/api/

---

## Trying the API

```bash
# 1. Get a token (use your superuser email + password)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"you@del.test","password":"yourpassword"}'

# 2. Use the access token
curl http://localhost:8000/api/me/ -H "Authorization: Bearer <access_token>"

# Key deal endpoints
#   GET  /api/deals/                 list (filtered by your role)
#   POST /api/deals/                 create a draft (BD)
#   GET  /api/deals/drafts/          the BD's own drafts
#   POST /api/deals/{id}/submit/     BD submits
#   POST /api/deals/{id}/take/       analyst takes for review
#   POST /api/deals/{id}/reject/     analyst rejects  {"reason": "..."}  (required)
#   POST /api/deals/{id}/decide_stage1/   {"passed": true|false}
#   GET  /api/deals/{id}/history/    full audit history (state + field)
#   POST /api/deals/{id}/request-edit/    BD requests edit access after submit
#   POST /api/edit-access-requests/{id}/approve/   analyst or manager
```

The fastest way to *see* the model working is the admin: create a couple of
users with different roles, create a deal, and watch the **state history**
inline on the deal page fill in as you move it through the lifecycle.

---

## The deal lifecycle (enforced)

```
DRAFT ──submit──> SUBMITTED ──take──> UNDER_REVIEW ──┬─ reject(reason) ─> REJECTED_TO_BD ─┐
                                                     ├─ stage1 pass ────> STAGE1_PASSED    │
                                                     └─ stage1 fail ────> DECLINED         │
        REJECTED_TO_BD ──resubmit──> SUBMITTED  <───────────────────────────────────────┘
```

Rejection requires a reason — the transition is refused without one. The same
deal record is reused across the round trip, so its history accumulates.

---

## Notes carried from the spec

- **Decision thresholds (GO/CONDITIONAL/NO-GO)** are an open item — the framework
  slides disagree (80/65 vs 75/60). They belong to the Stage 2 scoring engine and
  are deliberately **not** seeded. Confirm with DEL before building scoring.
- Pillars are scored **indirectly**: sub-criteria are graded 1/3/5 and roll up.
  The reference structure is seeded; per-deal scoring is the next build stage.

---

## Next build stages (not in this foundation)

1. Stage 2 pillar scoring engine (sub-criterion grades → pillar → weighted total).
2. Notifications/alerts to the analyst on submission.
3. The frontend (BD draft page, analyst queue, deal detail, history view).
4. Modules 2–4 (Proposal, Project Tracker, Cost Modeller).
