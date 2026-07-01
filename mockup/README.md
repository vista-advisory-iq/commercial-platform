# VAP Commercial Platform — Demo Mockup

A **standalone, zero-setup** mockup for demos. No backend, no database, no build —
all data lives in memory and resets on reload.

## How to use

Just **double-click `index.html`** (or open it in any browser). That's it — works
offline, no internet or install needed.

- **Switch roles** with the **"Viewing as"** dropdown (top right) to see what each
  persona sees: Business Developer, Analyst, Manager, IC Member, Admin.
- Click a deal to open its detail; the available tabs/actions change by role and
  by the deal's stage.
- **It's a working prototype — drive the whole lifecycle:**
  - **BD:** create a new deal (form), edit intake, **submit** (with required-field
    validation), request edit access, re-submit a returned deal.
  - **Analyst/Manager:** take for review, set Stage 1 **gate verdicts** & finalize,
    grade **Stage 2 sub-criteria** (weighted total + GO/CONDITIONAL/NO-GO update
    live), build/edit the **cost model** (add/remove lines, edit assumptions →
    payback/NPV/IRR recompute), run the **proposal** (submit→send→accept) and the
    **delivery project** (milestone statuses, risks, project status), approve/deny
    edit requests, return a deal with a reason.
  - **IC:** record the GO/CONDITIONAL/NO-GO decision (accept or override the
    recommendation, with rationale).
  - Anyone on a deal: post **discussion messages**.
- **Working notifications:** the **💬 messages** and **🔔 notifications** icons are
  separate (as in the app) and their **counts update as you act** — e.g. submit a
  deal and switch to Analyst to see the alert; complete scoring and switch to IC to
  see the "ready for committee" alert; message the BD and switch to BD to see it.
  Click the icons for a real dropdown that jumps to the deal.
- **Your demo state persists** across page reloads (saved in the browser).
- **Reset** (top right) restores the original demo data.

## What it demonstrates

| Role | Sees |
|---|---|
| **BD** | All their own deals across every stage (edit only Draft/Returned), proposal, project, discussion |
| **Analyst / Manager** | Queue, all deals, edit requests; side-by-side intake + Stage 1 gates / Stage 2 scoring; cost model |
| **IC Member** | Deals ready for decision; read-only scoring + the GO/CONDITIONAL/NO-GO decision panel |
| **Admin** | Note pointing to the Django admin back office |

The sample deals cover the full lifecycle: Draft → Submitted → Under Review →
Stage 1 Passed → Stage 2 GO (with proposal + project + cost model), plus a
Returned-to-BD and a Declined example.

> This is a **throwaway prototype for clicking through** — it intentionally does
> not persist anything or talk to the real backend.
