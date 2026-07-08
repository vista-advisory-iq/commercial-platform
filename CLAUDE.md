# CLAUDE.md — VAP Commercial Operations Platform

Context for Claude Code when working in this repository. Read this first.

## What this project is

An internal web application for DEL's commercial deal lifecycle (a pilot, built
by VAP). This repo is the **backend**: Django + DRF + PostgreSQL. It implements
the Stage 1 portion of the *Data Model & Audit Specification* — authentication,
the five-role hierarchy, the deal lifecycle, and append-only change data capture.

The builder is a solo developer. Favour clarity and small, reviewable changes
over cleverness.

## Architecture map

```
config/            Django project (settings, urls, wsgi/asgi)
apps/
  accounts/        Custom User (UUID PK, email login) + five roles
  audit/           CDC: append-only history tables + current-user middleware
  screening/       Reference data: knockout gates, pillars, sub-criteria
  deals/           Core deal, intake, lifecycle + Stage 1 gates + Stage 2 scoring/IC decision
  notifications/   In-app + email alerts, one producer per lifecycle event
  proposals/       Module 2: commercial proposal lifecycle + PDF export (reportlab)
  projects/        Module 3: delivery tracker (milestones, risks, RAG, lifecycle)
  costing/         Module 4: cost model (CAPEX/OPEX + financing -> payback/NPV/IRR)
  common/          Cross-cutting: DRF exception handler (TransitionError -> 400)
```

The five roles: BD (Business Developer), ANALYST, MANAGER, IC_MEMBER, ADMIN.

## Non-negotiable conventions

These encode the spec. Do not break them without the user explicitly asking.

1. **All deal state changes go through `apps/deals/services.py`.** Never set
   `deal.state` directly in a view, serializer, signal, or the admin. The service
   validates the transition (against `ALLOWED_TRANSITIONS`) and writes the audit
   row. A state change that bypasses the service is a bug.

2. **Audit tables are append-only.** `DealStateHistory` and `DealFieldHistory`
   are never updated or deleted — not in code, not in the admin (they are
   registered read-only). Every change to a deal must leave a history row that
   records who, when, old→new, and (for rejections) why.

3. **The current user reaches audit via middleware**, not by passing `request`
   into models. Use `apps/audit/services.py` helpers; they read the user from
   `apps/audit/middleware.py`. If you write history outside a request (shell,
   tests, management commands), pass `actor=` explicitly.

4. **A rejection requires a reason.** `reject_to_bd` refuses an empty reason.
   Keep that guard.

5. **Deal identity is assigned at draft creation** (the `deal_ref`, via the
   `pre_save` signal in `apps/deals/signals.py`). Do not move it to submission.

6. **Access control lives in `apps/deals/permissions.py`.** Updated 2026-06:
   BDs are a **shared team** — *any* authenticated user may **view** any deal
   (`can_view_full_pipeline` is now `True` for all), and any BD may **edit/submit**
   any deal while it's in a BD-editable state (DRAFT/REJECTED_TO_BD). Everyone can
   **view** Stage 1 gates and Stage 2 scoring read-only; only analysts/managers may
   **assess**; only IC/Admin decide Stage 2. Enforce authorization server-side, always.

7. **Pillars are scored indirectly.** A pillar's score derives from its weighted
   sub-criteria (graded 1/3/5), never entered directly. Keep the three-level
   structure (Pillar → SubCriterion → per-deal grade).

## Things that are deliberately NOT decided yet

Do not hardcode these — they are open items pending DEL sign-off:

- **Decision thresholds** (GO / CONDITIONAL / NO-GO bands). RESOLVED: weighted
  total ≥80 → GO, 65–79 → CONDITIONAL, <65 → NO-GO. Lives in config, not the
  engine: `settings.STAGE2_SCORE_BANDS` defaults to `{"GO":80,"CONDITIONAL":65}`,
  overridable via env JSON (set to `""` to disable verdicts). `apps/deals/scoring.py`
  reads it. Don't inline the numbers.
- **Verdict cap rule** (how a Conditional gate caps the outcome). Stage 1 reads
  `settings.STAGE1_CONDITIONAL_POLICY` (`ADVANCE_CAPPED` default | `BLOCK` | `PASS`);
  a FAIL always declines. Keep it config-driven.

## Stack & versions

- Python 3.12 (Django 5.0.6 supports 3.10–3.12 only; 3.13+ breaks admin
  template rendering — do not use a newer interpreter) · Django 5.0.6 · DRF
  3.15 · djangorestframework-simplejwt
- PostgreSQL 14+ via `psycopg[binary]` 3.2/3.3 (Django 5.0 speaks psycopg 3)
- Auth is JWT (`/api/auth/login/`, `/api/auth/refresh/`)
- `reportlab` 4.x for proposal PDF export (pure-Python, no native deps)

## Working commands

```bash
python manage.py migrate
python manage.py seed_framework        # gates + pillars + sub-criteria (idempotent)
python manage.py createsuperuser
python manage.py runserver
python manage.py makemigrations        # after model changes
python manage.py check
```

There is no automated test suite yet. When you add non-trivial logic (especially
in services.py or scoring), add tests alongside it. A scripted end-to-end
lifecycle check was used during the initial build and is a good model to follow:
create users of each role, drive a deal through the state machine, and assert the
audit history is correct.

## How to extend (next stages, in order)

1. ~~Stage 2 pillar scoring engine~~ — DONE. `apps/deals/scoring.py`:
   sub-criterion grades (1/3/5) → weighted pillar scores → weighted total (0–100);
   per-deal grades in `DealSubCriterionScore`. Verdict banding still config-gated
   (see above). Stage 1 is now a per-gate knockout assessment (`DealGateResult`,
   `save_gate_results` / `finalize_stage1`), not a manual boolean.
2. ~~Notifications~~ — DONE. New `apps/notifications/` app with a producer per
   lifecycle event: submit → assessors; take / return / Stage 1 decision → BD;
   edit requested → assessors; edit approved/denied → BD. In-app `Notification`
   rows + best-effort email via `on_commit` (console backend in dev). API
   `/api/notifications/` (list, `unread_count`, `read`, `mark_all_read`); frontend
   `NotificationBell` in the navbar.
3. ~~Frontend~~ — DONE (React + Vite + Tailwind/shadcn in `frontend/`):
   login, BD drafts, deal form, deal detail (gate assessment + Stage 2 scoring +
   audit), analyst queue, all-deals pipeline, edit requests.
4. Modules 2–4:
   - ~~Module 2 (Proposal)~~ — DONE. `apps/proposals/`: one Proposal per
     Stage 2-GO deal; offer fields + lifecycle DRAFT→IN_REVIEW→SENT→ACCEPTED/REJECTED
     (service-guarded, `ProposalStateHistory` append-only, offer edits logged to
     the deal's audit trail); versioned `ProposalDocument` snapshot on send;
     PDF export via reportlab (`/api/proposals/:id/document/`). Frontend: Proposal
     tab on the deal detail page.
   - ~~Module 3 (Project Tracker)~~ — DONE. `apps/projects/`: one Project per
     accepted proposal (auto-created from `record_outcome`), tracks milestones,
     RAG health/status, risks/issues, key dates; guarded lifecycle
     NOT_STARTED→IN_PROGRESS→(ON_HOLD)→COMPLETED/CANCELLED with
     `ProjectStateHistory`. Assessors update, pipeline viewers read. APIs
     `/api/projects/` (+ change_status/history), `/api/milestones/`, `/api/risks/`.
     Frontend: Project tab on the deal detail page.
   - ~~Module 4 (Cost Modeller)~~ — DONE. `apps/costing/`: one `CostModel` per
     deal (assessor-built, non-draft); `CostLine`s (CAPEX/OPEX) + financing
     assumptions; `calc.py` derives total cost, payback, NPV, and a bisection IRR
     (outputs computed, never stored). APIs `/api/cost-models/`, `/api/cost-lines/`.
     Frontend: Cost Model tab on the deal detail page. **All 4 modules complete.**

   Cross-cutting changes (2026-06):
   - Submission requires core intake fields (`REQUIRED_INTAKE_FOR_SUBMIT` in
     deals/services); My Deals lists all the BD's deals (edit only
     DRAFT/REJECTED_TO_BD); assessors get a side-by-side intake+assessment
     workspace on the deal detail page.
   - Deal discussion: `DealComment` + `/api/deals/:id/comments/` (GET/POST,
     visible to the deal's BD + pipeline roles); posting notifies the other side.
     Frontend `DealChat` on the deal detail page.
   - Stage 1 gates stay editable through STAGE1_PASSED (not just UNDER_REVIEW).
     `finalize_stage1` re-runs as a re-assessment: still-passing just updates the
     flag; a knockout moves STAGE1_PASSED → DECLINED and CLEARS Stage 2 scores
     (`DealSubCriterionScore`/`DealPillarComment`). UI confirms before clearing.
   Cross-cutting changes (2026-07, ported from the prototype's lifecycle):
   - **Sales Agent registry** — new `apps/agents/`: `SalesAgent` (external
     finders; status, agreement date, default fee %). `/api/sales-agents/`
     (read: any authed; write: assessors). Attribution via
     `DealIntake.sales_agent` FK (SET_NULL, audited as `sales_agent_id`).
     `settings.FINDER_PROTECTION_DAYS` (env, default 90) is surfaced in the
     serializer — display-only, no enforcement yet.
   - **Expanded intake** — `DealIntake` gained Site & Contacts, Demand Baseline
     (current supply/tariff/spend/load profile/metering flag), Qualification
     (expected close, win %, competition, key risks) and attribution fields;
     all in `AUDITED_FIELDS`.
   - **Pipeline classification** — `Deal.classification`
     (ACTIVE/NURTURE/DEFERRED) + `next_review_date` + note, orthogonal to the
     state machine. `services.classify_deal` (assessors only, non-terminal
     states, NURTURE/DEFERRED require a review date) writes field history;
     `/api/deals/:id/classify/`. `settings.PIPELINE_REVIEW_DAYS` (default 90)
     is the suggested review horizon.
   - **Handover checklist** — `apps/projects/` `HandoverItem`; a 5-item
     commercial→delivery pack (`DEFAULT_PACK`) is seeded on project creation;
     ticking stamps done_by/done_at via `services.set_handover_done`.
     `/api/handover-items/`.
   - **Outcome documents** — `apps/deals/reports.py`:
     `build_screening_memo_pdf` (gate-by-gate Stage 1 record) and
     `build_decline_letter_pdf` (client-facing letter, reason recovered from
     state history). `/api/deals/:id/screening-memo/` and `/decline-letter/`
     (letter only for DECLINED / STAGE2_NO_GO).
   - Frontend: Sales Agents page (`/agents`), intake form/summary sections for
     the new fields, `ClassificationPanel` + badges, handover checklist in the
     Project tab, memo/letter download buttons on the deal detail page.

5. ~~Stage 2 outcome transition~~ — DONE. `decide_stage2` service + IC-only
   `/api/deals/:id/decide_stage2/`: the IC records GO/CONDITIONAL/NO-GO (the
   computed verdict is a recommendation they may override), requires complete
   scoring, and moves the deal to a terminal `STAGE2_GO` / `STAGE2_CONDITIONAL` /
   `STAGE2_NO_GO` state. Frontend `Stage2DecisionPanel` on the deal detail page.
   (Also added `apps/common/exceptions.py` so service `TransitionError`s return
   HTTP 400, not 500, across all endpoints.)

## When in doubt

- Match the existing module structure (models / serializers / services / views /
  permissions). Add a new app for a genuinely new domain rather than overloading
  an existing one.
- Keep the BRD-level "what" out of code comments; reference the spec instead.
- If a change would weaken auditability, separation of duties, or the access
  matrix, stop and flag it to the user rather than proceeding.