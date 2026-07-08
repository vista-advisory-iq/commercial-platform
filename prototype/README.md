# DEL Commercial Prototype — End-to-End Opportunity Lifecycle

An interactive, click-through prototype of DEL's commercial process from first
lead to revenue generation, built from four source documents:

| Document | Role |
|---|---|
| **Deal Screening Framework (24-04-26)** | **Authoritative** — where documents conflict, this one wins |
| Business Development Process | Phases, gates, org model, development steps, finder programme |
| Commercial Department Tracker (xlsx) | Live pipeline vocabulary, stage lists, ops tracking fields |
| Knockout Memo — MTN Data Centre rev1.1 | Worked example of a real knockout screening |

Where DEL's operations are not yet standardised, the prototype fills the gap
with an industry-standard default and **flags it** (in the UI and in the gap
list below) so the team can confirm or replace it.

## Running it

No build, no server. Open `prototype/index.html` in any browser.
(Or: `cd prototype && python -m http.server 8080` → http://localhost:8080.)

All interactions persist in your browser (localStorage). The **↺ Reset demo**
button in the top bar restores the original dummy data at any time.

## What to click

1. **Dashboard** — pipeline KPIs, the end-to-end process map with its three
   decision gates, alerts (periodic reviews due, Gate 2 decisions pending).
2. **Pipeline** — every opportunity with stage, knockout result, scorecard and
   classification. Click any row.
3. **A fresh lead**: open **OPP-1008 (Golden Palm Hotel Cluster)** — an
   agent-sourced lead that has only been registered. Run the five knockout
   gates yourself, finalise, classify, tick off the development steps, score
   the pillars, take the Gate 2 decision, issue the proposal, sign the
   contract, hand over to Commercial Ops, and declare COD. That's the whole
   lifecycle in one sitting.
4. **A worked failure**: **OPP-1006 (Silverline Estates)** — three gates
   FAILED → automatic NO-GO with a generated decline letter.
5. **A conditional pass**: **OPP-1004 (Halcyon Data Centres)** — a faithful
   echo of the MTN memo: conditional verdicts, logged conditions, screening
   memo.
6. **A parked item**: **OPP-1007 (Lagoon Front Resort)** — deferred pending a
   tender, with the periodic-review flow (activate / keep parked / drop).
7. **A converted customer**: **OPP-1003 (Zenmark Foods)** — full history from
   lead to revenue generation, now in Commercial Ops monitoring.
8. **New Opportunity** — the expanded intake form (see "Intake fields" below).
9. **Sales Agents & Finders** — the third-party origination programme:
   registry, submission flow, governance rules, finder attribution on deals.

---

## Naming: "Deal" → **"Opportunity"** (recommended)

You asked for a naming suggestion. The evidence is already in DEL's own files:
the Commercial Department Tracker titles its main sheet **"Opportunity
Pipeline Tracker"** and numbers records **OPP-001…OPP-022**, while the
screening deck says "deal". Recommendation:

- **Opportunity** — the pipeline record from lead to contract signing. This is
  the standard CRM/B2B term (Salesforce, HubSpot, Dynamics all use it), it
  covers non-transactional items (ventures, clusters, collaborations) that
  "deal" fits awkwardly, and it matches the tracker DEL already uses.
- **Customer / Contract** — what an opportunity becomes after signing, when it
  moves to Commercial Operations.
- Keep **"Deal Screening Framework"** as a document title if desired, but the
  system, IDs and reports should say Opportunity.

The prototype uses Opportunity throughout (`OPP-xxxx`).

---

## Gaps and inconsistencies found (standardisation list)

### A. Direct conflicts between/within documents

1. **GO / CONDITIONAL / NO-GO bands conflict *inside* the Screening
   Framework.** Slides 2 and 5 say **≥80% GO · 65–79% CONDITIONAL · <65%
   NO-GO**; the slide-12 scorecard example uses **≥75 / 60–74 / <60** and
   shows 77.8% → GO. The prototype uses **80/65** (the stated framework rule).
   → *Decide one set of bands and delete the other.*

2. **Pillar E ("Ability to Fund") weight**: Screening Framework says **10%**
   (total 100%); the BD Process slide says **15%**, making the weights total
   **105%**. Prototype uses 10%. → *Fix the BD Process deck.*

3. **Pillar pass thresholds are defined two different ways**: the Screening
   Framework uses raw-sum minimums per pillar (e.g. Commercial ≥15 of 25);
   the BD Process uses per-pillar averages (≥3.5, credit ≥3…). These are not
   equivalent. Prototype uses the raw-sum minimums. → *Pick one convention.*

4. **"All 9 gates PASS"** appears in the Screening Framework text, but only
   **5 gates** are defined (and the MTN memo assesses 5, splitting Gate 02
   into 02a/02b). → *Correct the text; decide whether dual-counterparty
   deals formally split Gate 02.*

5. **Stage vocabulary differs across all three process documents**: the BD
   Process 11-step lifecycle, the tracker's stage dropdown (13 stages), and
   the Screening Framework timeline (Day 0 → Week 8) each name stages
   differently. The prototype merges them into one canonical 17-stage model
   grouped under the five phases (see the Dashboard process map).
   → *Adopt a single stage list; retire the others.*

6. **Classification labels differ**: BD Process says Active / Non-Active
   (Parked) / Rejected-Dropped; the tracker dashboard counts Active /
   Converted / Nurture / Deferred / Rejected-Dead. Prototype standardises on:
   **Active · Nurture (parked + review date) · Deferred (external blocker) ·
   Converted · Rejected/Dead.**

### B. Blanks and errors in the source material

7. **"Guaranteed Minimum Offtake" sub-criterion has no scoring bands** in the
   Screening Framework. Prototype suggests: 1 = fully merchant · 3 = partial
   take-or-pay (<70%) · 5 = take-or-pay ≥80%. → *Confirm bands.*

8. **"Tariff Competitiveness" band text is broken**: score 1 and score 5
   carry the same wording ("tariff > customer's alternative"). Score 5 must
   be the opposite — prototype uses "well below alternative (≥10% saving)",
   consistent with Gate 04. → *Fix the deck.*

9. **Tracker data hygiene**: the Cycle Time column is all `#REF!` errors, Avg
   Cycle Time shows "-", and Date Received / Est. Revenue Potential /
   Expected Conversion Date are almost entirely empty — so conversion-speed
   and pipeline-value metrics cannot be computed today. The prototype's
   intake makes the key dates/values required or structurally captured.
   → *Repair the formulas; make date-received mandatory at logging.*

10. **Screening Framework slide 13, step 4 label is missing** (blank box in
    the timeline). Prototype assumes it is the full-DD workstream step.

### C. Things DEL has not yet standardised (defaults supplied)

11. **The IRR hurdle rate** — Gate 04 says "IRR ≥ hurdle" but no hurdle is
    published anywhere. Pillar D implies 18–22% is mid-band. → *Publish one
    number (suggest: 18% floor at knockout; 22%+ for a strong score).*

12. **Knockout verdict vocabulary** — the framework is binary PASS/FAIL, but
    the MTN memo (real practice) uses **CONDITIONAL PASS** per gate and an
    overall **CONDITIONAL GO**. The prototype formalises this: any FAIL →
    auto NO-GO; any CONDITIONAL (no FAIL) → advance flagged, with conditions
    logged and carried until resolved. → *Ratify this rule (it matches the
    platform's `STAGE1_CONDITIONAL_POLICY = ADVANCE_CAPPED`).*

13. **Finder / Sales Agent commercial terms** — the programme defines the
    flow (submit → register-first → knockout → feedback → success fee) but
    not: fee amounts, protection-window length, or non-circumvention tenor.
    Industry-standard defaults used in the prototype:
    - registration protection window: **90 days**, renewable while active;
    - non-circumvention: **24 months**;
    - success fee: **payable only on conversion** (signed contract + first
      revenue); suggest banding as % of first-year contracted revenue
      (typically 1–3%) or a fixed ₦/kW schedule. → *Set the numbers.*

14. **Sales Agent vs Business Developer** — new actor, defined as follows in
    the prototype: a **BD is DEL staff** owning the opportunity end-to-end; a
    **Sales Agent is an outsourced originator** (a finder-programme category)
    held to the same intake standard, with **no pricing, structuring or
    negotiation authority**, no visibility beyond their own submissions, and
    compensation only on success. → *Confirm role boundary.*

15. **Periodic review cadence for parked items** — "periodic review" is
    mentioned with no cadence. Prototype default: **every 90 days**, with a
    forced Activate / Keep parked / Drop decision. → *Confirm cadence.*

16. **Minimum opportunity size** — ~200–300 kW appears only in the finder
    programme. Does it bind direct-BD leads too? Prototype treats it as
    guidance (Gate 01 evidence), not a hard block. → *Decide scope.*

17. **Single accountable owner** — tracker items are mostly owned by "BD
    Team" (a group). Standard practice: one named owner per opportunity plus
    an escalation point. The intake form requires a named owner.

18. **Decline letter** — required by the framework ("decline letter + logged
    rationale") but no template exists. The prototype generates one (see
    OPP-1006). → *Adopt a template.*

19. **Handover to Commercial Operations** — the BD Process fixes the handover
    at contract signing but defines no checklist. Prototype includes a
    handover pack: contract, tariff schedule, KYC file, metering plan,
    contacts. → *Adopt a checklist.*

20. **Screening memo template** — the MTN memo is excellent; it should be the
    standard output of every knockout screening. The prototype auto-generates
    a memo in that structure for every finalised screening.

### D. Intake fields added (industry standard)

The current intake (Screening Framework slide 4) captures identity + headline
economics. Added in the prototype — marked **suggested** in the form:

- **Site**: address/coordinates (site visits, logistics).
- **Contacts**: primary contact, decision maker, buying process — deals stall
  on unmapped decision chains.
- **Demand baseline**: current supply arrangement, current effective tariff,
  monthly energy spend, load profile, metering-data availability — this is
  the evidence Gate 01 and Gate 04 need, captured once at intake.
- **Qualification**: expected close date, probability %, competition, key
  risks — enables weighted pipeline value and cycle-time metrics the tracker
  currently can't produce.
- **Attribution**: source + registered finder link (register-first rule
  enforced at intake).

---

## What the prototype implements (faithful to the documents)

- **Five phases, three gates**: Originate → Qualify → Develop → Convert →
  Operate, with Gate 1 (Knockout Screening), Gate 2 (Management Approval) and
  Gate 3 (COD Readiness) marked ⛩ on the process map.
- **Stage 1 — five knockout gates** with per-gate evidence and PASS /
  CONDITIONAL PASS / FAIL verdicts; any FAIL → automatic NO-GO + decline
  letter + logged rationale (MTN-memo style screening memo generated).
- **Stage 2 — the five pillars, directly after the gates** (framework order):
  a **Weightings & Scoring Mechanics** panel follows the knockout section on
  every opportunity — pillar weights (A Commercial 25% · B Technical 25% ·
  C Risk & Regulatory 25% · D Financial 15% · E Ability to Fund 10%), each
  pillar's raw-sum minimum, and the mechanics (sub-criteria graded 1–5 against
  band definitions; weighted total = Σ (pillar raw ÷ pillar max) × weight;
  bands ≥80 GO / 65–79 CONDITIONAL / <65 NO-GO). It is visible read-only
  before screening and becomes the interactive scorecard once Gate 1 clears.
  The verdict is a **recommendation** — the Management Investment Committee
  records the final Gate 2 decision with a mandatory rationale.
- **Development steps with ownership** (DEL / JOINT / CUSTOMER chips): NDA +
  Data Request → Site Recon → Energy Audit → Technical Review → Commercial
  Boundary Analysis, per the BD Process step table.
- **Conversion chain**: Proposal → Negotiation → EXCO approval → Contract
  signing (PPA/GSPA/CPA…) → **handover to Commercial Operations at signing**.
- **Operate**: KYC/onboarding, implementation milestones from the tracker's
  progress ladder (DED → vendor → install → connect → commission), COD
  declaration, contract/tariff-review dates.
- **Append-only activity log** on every opportunity — who, when, what — the
  same auditability principle as the main platform.

## Relationship to the main platform

This is a **standalone communication artifact** for the DEL team — plain
HTML/JS, no backend, dummy data. It is deliberately broader than the Django
platform (which currently implements intake → Stage 1 → Stage 2 → decision →
proposal → project → costing) so the team can see and react to the full
end-to-end vision before the remaining scope is committed to the real system.
