/* ==========================================================================
   DEL Commercial Prototype — domain model + dummy seed data
   Sources: Deal Screening Framework (24-04-26, authoritative), Business
   Development Process, Commercial Department Tracker, MTN Knockout Memo.
   Where the documents left gaps, industry-standard defaults are used and
   flagged in the README.
   ========================================================================== */

// --------------------------------------------------------------------------
// Lifecycle: 5 phases (BD Process) → canonical stage model (merged from the
// BD Process 11-step lifecycle + the tracker's stage dropdown list).
// --------------------------------------------------------------------------
const PHASES = [
  { key: 'ORIGINATE', label: 'Originate', color: '#1068D0' },
  { key: 'QUALIFY',   label: 'Qualify',   color: '#0B4FA3' },
  { key: 'DEVELOP',   label: 'Develop',   color: '#083060' },
  { key: 'CONVERT',   label: 'Convert',   color: '#00B050' },
  { key: 'OPERATE',   label: 'Operate',   color: '#067A3F' },
];

// owner: DEL | JOINT | CUSTOMER  (from BD Process development-step ownership)
const STAGES = [
  { key: 'lead_received',   label: 'Lead Received',                 phase: 'ORIGINATE', owner: 'DEL' },
  { key: 'lead_logged',     label: 'Lead Registered & Logged',      phase: 'ORIGINATE', owner: 'DEL' },
  { key: 'knockout',        label: 'Knockout Screening (Gate 1)',   phase: 'QUALIFY',   owner: 'DEL', gate: true },
  { key: 'classification',  label: 'Pipeline Classification',       phase: 'QUALIFY',   owner: 'DEL' },
  { key: 'nda_data',        label: 'NDA / MoU + Data Request',      phase: 'DEVELOP',   owner: 'JOINT' },
  { key: 'site_recon',      label: 'Site Reconnaissance',           phase: 'DEVELOP',   owner: 'JOINT' },
  { key: 'energy_audit',    label: 'Energy Audit',                  phase: 'DEVELOP',   owner: 'DEL' },
  { key: 'tech_review',     label: 'Technical Review / Indicative Solution & Tariff', phase: 'DEVELOP', owner: 'DEL' },
  { key: 'boundary_scoring',label: 'Commercial Boundary Analysis + Pillar Scoring',   phase: 'DEVELOP', owner: 'DEL' },
  { key: 'mgmt_approval',   label: 'Management Approval (Gate 2)',  phase: 'DEVELOP',   owner: 'DEL', gate: true },
  { key: 'proposal',        label: 'Proposal / Term Sheet',         phase: 'CONVERT',   owner: 'DEL' },
  { key: 'negotiation',     label: 'Negotiation',                   phase: 'CONVERT',   owner: 'JOINT' },
  { key: 'exco',            label: 'EXCO Approval',                 phase: 'CONVERT',   owner: 'DEL' },
  { key: 'contract',        label: 'Contract Signing (PPA / GSPA)', phase: 'CONVERT',   owner: 'CUSTOMER' },
  { key: 'onboarding',      label: 'KYC / Onboarding + Handover',   phase: 'OPERATE',   owner: 'JOINT' },
  { key: 'implementation',  label: 'Implementation (Gate 3: COD Readiness)', phase: 'OPERATE', owner: 'DEL', gate: true },
  { key: 'revenue',         label: 'Revenue Generation / COD',      phase: 'OPERATE',   owner: 'DEL' },
];
const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

// --------------------------------------------------------------------------
// Stage 1 — the five knockout gates (Screening Framework, authoritative)
// --------------------------------------------------------------------------
const KNOCKOUT_GATES = [
  { num: 1, name: 'Demand / Off-taker',
    pass: 'Verified, bankable demand exists for the power or gas offering.',
    evidence: 'Metered consumption data, signed LOIs, or 12 months of utility/diesel bills.' },
  { num: 2, name: 'Creditworthy Counterparty',
    pass: 'The off-taker can credibly pay over the contract tenor.',
    evidence: 'Two most recent years of audited financial statements; KYC pack; banking references.' },
  { num: 3, name: 'Regulatory Pathway',
    pass: 'A clear, achievable licensing/permitting route exists (NERC / NMDPRA / NUPRC as applicable).',
    evidence: 'Licence status or application receipts; regulatory counsel opinion for novel structures.' },
  { num: 4, name: 'Commercial Viability',
    pass: 'Proposed tariff is ≥10% below the customer’s current alternative AND projected IRR meets DEL’s hurdle rate.',
    evidence: 'Tariff benchmark vs current cost (diesel/grid); indicative financial model.' },
  { num: 5, name: 'Strategic Alignment',
    pass: 'Opportunity sits within gas, power or adjacent infrastructure, in Nigeria / West Africa.',
    evidence: 'One-page strategy fit note referencing DEL’s mandate.' },
];

// Any FAIL → automatic NO-GO + decline letter + logged rationale.
// CONDITIONAL PASS (per MTN memo precedent) → advance flagged, conditions logged.

// --------------------------------------------------------------------------
// Stage 2 — weighted pillar scorecard (Screening Framework weights: A/B/C 25%,
// D 15%, E 10%; per-pillar minimum thresholds are raw sums of 1–5 sub-scores)
// --------------------------------------------------------------------------
const PILLARS = [
  { key: 'A', name: 'Commercial', weight: 25, threshold: 15, subs: [
    { id: 'A1', name: 'Counterparty Credit', bands: { 1: 'Weak/unrated; payment history poor', 3: 'Acceptable credit; some mitigation needed', 5: 'Investment-grade or equivalent; strong payment record' } },
    { id: 'A2', name: 'Tariff Competitiveness', bands: { 1: 'Tariff above customer’s alternative', 3: 'At par / marginal saving vs alternative', 5: 'Well below alternative (≥10% saving)' }, note: 'Score-5 wording corrected — see README gap #5' },
    { id: 'A3', name: 'Contract Strength (tenor)', bands: { 1: '< 3 years', 3: '3 – 6 years', 5: '≥ 10 years' } },
    { id: 'A4', name: 'Demand Certainty', bands: { 1: 'Unverified / speculative demand', 3: 'Partially evidenced (bills, LOI)', 5: 'Metered, contracted or captive demand' } },
    { id: 'A5', name: 'Guaranteed Minimum Offtake', bands: { 1: 'No minimum / fully merchant exposure', 3: 'Partial take-or-pay (< 70%)', 5: 'Take-or-pay ≥ 80% of capacity' }, note: 'Bands were blank in the framework — suggested defaults, see README gap #4' },
  ]},
  { key: 'B', name: 'Technical', weight: 25, threshold: 12, subs: [
    { id: 'B1', name: 'Technology Maturity', bands: { 1: 'Unproven / first deployment', 3: 'Proven elsewhere, new to DEL', 5: 'Proven, DEL has operated it at scale' } },
    { id: 'B2', name: 'EPC Risk', bands: { 1: 'No credible EPC route; deal-breaker complexity', 3: 'Capable EPC identified; manageable interfaces', 5: 'Fixed-price wrap from tier-1 EPC' } },
    { id: 'B3', name: 'O&M Complexity', bands: { 1: 'No O&M capability or plan', 3: 'O&M plan defined; partner needed', 5: 'In-house or contracted O&M, proven regime' } },
    { id: 'B4', name: 'Site & Interconnection', bands: { 1: 'Site unsecured; interconnection unclear', 3: 'Site identified; interconnection feasible', 5: 'Site secured; interconnection agreed/existing' } },
  ]},
  { key: 'C', name: 'Risk & Regulatory', weight: 25, threshold: 12, subs: [
    { id: 'C1', name: 'Permits & Licences', bands: { 1: 'Blocked or undefined pathway', 3: 'Applications lodged; pathway defined', 5: 'All key permits in hand' } },
    { id: 'C2', name: 'Land / Title', bands: { 1: 'Disputed or no title', 3: 'Title verifiable; perfection in progress', 5: 'Clean, registered title or valid long lease' } },
    { id: 'C3', name: 'ESG', bands: { 1: 'Material unmitigable ESG issue', 3: 'Manageable impacts; ESMP required', 5: 'Low impact; full compliance evidenced' } },
    { id: 'C4', name: 'Security', bands: { 1: 'High-risk location; no mitigation', 3: 'Moderate risk; credible security plan', 5: 'Low-risk location / robust arrangements' } },
  ]},
  { key: 'D', name: 'Financial', weight: 15, threshold: 9, subs: [
    { id: 'D1', name: 'Equity IRR', bands: { 1: '< 18%', 3: '18 – 22%', 5: '≥ 25%' } },
    { id: 'D2', name: 'Payback Period', bands: { 1: '> 10 years', 3: '6 – 10 years', 5: '≤ 5 years' } },
    { id: 'D3', name: 'EBITDA Margin', bands: { 1: '< 20%', 3: '20 – 30%', 5: '≥ 30%' } },
  ]},
  { key: 'E', name: 'Ability to Fund', weight: 10, threshold: 9, subs: [
    { id: 'E1', name: 'Equity Availability', bands: { 1: 'No identified equity', 3: 'Equity identified, not committed', 5: 'Equity committed / on balance sheet' } },
    { id: 'E2', name: 'Co-investor Interest', bands: { 1: 'None; DEL alone at full exposure', 3: 'Early interest from credible partners', 5: 'Committed co-investor(s)' } },
    { id: 'E3', name: 'Funding Timeline', bands: { 1: 'Funding gap vs project timeline', 3: 'Achievable with effort', 5: 'Funding available when needed' } },
  ]},
];
// Verdict bands on the weighted total (Screening Framework slides 2 & 5 —
// the authoritative version; slide 12's 75/60 variant is flagged in README):
const SCORE_BANDS = { GO: 80, CONDITIONAL: 65 };

const CLASSIFICATIONS = [
  { key: 'ACTIVE',    label: 'Active',            desc: 'Being progressed now; owner + next action set.' },
  { key: 'NURTURE',   label: 'Nurture (Parked)',  desc: 'Not now — periodic review to activate, keep parked, or drop.' },
  { key: 'DEFERRED',  label: 'Deferred',          desc: 'Blocked by an external event (tender outcome, customer decision).' },
  { key: 'CONVERTED', label: 'Converted',         desc: 'Contract signed; handed over to Commercial Operations.' },
  { key: 'REJECTED',  label: 'Rejected / Dead',   desc: 'Failed knockout or dropped; reason logged; decline letter issued.' },
];

// --------------------------------------------------------------------------
// Finder / Sales Agent programme (BD Process third-party framework)
// --------------------------------------------------------------------------
const FINDER_TYPES = [
  { key: 'INTRODUCER',  label: 'Introducer',          desc: 'Brings a lead; no ongoing role. Paid a one-off success fee on conversion.' },
  { key: 'SALES_AGENT', label: 'Sales Agent / Partner', desc: 'Outsourced originator working defined territories/segments. Same intake duties as a BD but no pricing, structuring or negotiation authority.' },
  { key: 'TECHNICAL',   label: 'Technical Partner',   desc: 'Contributes engineering/site capability alongside a lead.' },
  { key: 'DEVELOPMENT', label: 'Development Partner', desc: 'Co-develops the project; commercial terms agreed case-by-case.' },
];
const FINDER_RULES = [
  'Register first: a lead must be registered and logged by DEL before any claim to a fee exists.',
  'NDA and non-circumvention signed before commercial details are shared (suggested standard: 24 months).',
  'Registration protection window: 90 days, renewable if the finder is actively progressing the lead (suggested standard — not yet set by DEL).',
  'Minimum opportunity size: ~200–300 kW per site or cluster.',
  'DEL retains pricing, structuring, negotiation and the final decision in-house.',
  'Success fee is payable only on conversion (signed contract + first revenue). Fee bands to be standardised — see README.',
];

// --------------------------------------------------------------------------
// Dropdown option lists (aligned with the tracker's "Lists & Data Validation")
// --------------------------------------------------------------------------
const BUSINESS_LINES = ['Power', 'Captive Power', 'Gas Retail', 'Autogas/CNG', 'Collaboration', 'Venture'];
const OPP_TYPES = ['Greenfield', 'Brownfield / Acquisition', 'Venture (JV, Co-investment, Consortium)'];
const PROCUREMENT = ['Non-tender', 'Tender', 'Cluster / Strategic'];
const SOURCES = ['Direct BD', 'Sales Agent / Third-Party Finder', 'Referral – Existing Customer', 'Existing Customer Expansion', 'Strategic Partnership', 'Board / Management', 'Internal (DEL non-commercial)'];
const COUNTERPARTY_CLASSES = ['Industrial', 'Commercial', 'Utility', 'Public Sector', 'SME Cluster', 'Residential Estate'];
const SUB_SECTORS = ['Embedded Generation', 'Captive Power', 'Gas Distribution', 'Gas-to-Power', 'Transmission & Distribution', 'Retail Energy'];
const CONTRACT_TYPES = ['PPA', 'GSPA', 'Captive Power Agreement', 'Autogas Supply Agreement', 'Term Sheet', 'MOU / NDA'];
const NIGERIAN_STATES = ['Lagos', 'Ogun', 'Oyo', 'Rivers', 'Kano', 'Kaduna', 'Abuja (FCT)', 'Delta', 'Edo', 'Anambra', 'Enugu', 'Akwa Ibom', 'Other'];

// Implementation milestones (from the Power/Gas Business Tracker progress ladder)
const IMPL_MILESTONES = [
  { key: 'ded',     label: 'Detailed Engineering Design (DED)' },
  { key: 'vendor',  label: 'Vendor / EPC Selection' },
  { key: 'install', label: 'Equipment Installation' },
  { key: 'connect', label: 'Connection Completed & Metering' },
  { key: 'commiss', label: 'Commissioning & COD Readiness (Gate 3)' },
];

// --------------------------------------------------------------------------
// Seed finders (fictional)
// --------------------------------------------------------------------------
const SEED_FINDERS = [
  { id: 'FIN-01', name: 'Tunde Akerele', type: 'INTRODUCER', segment: 'Hotels & hospitals — Lekki/VI corridor', nda: true, registered: '2026-03-02', submissions: ['OPP-1001'] },
  { id: 'FIN-02', name: 'QuantaReach Ltd', type: 'SALES_AGENT', segment: 'Industrial clusters — Ogun & Ibadan corridor', nda: true, registered: '2026-01-15', submissions: ['OPP-1008'] },
  { id: 'FIN-03', name: 'Dada & Partners', type: 'DEVELOPMENT', segment: 'Residential estates — Freedom Way cluster', nda: false, registered: '2026-05-20', submissions: [] },
];

// --------------------------------------------------------------------------
// Seed opportunities (fictional, spread across the lifecycle)
// --------------------------------------------------------------------------
function _blankKnockout() {
  return { gates: {}, outcome: null, conditions: '', declineReason: '', finalized: null };
}
function _blankConvert() {
  return { proposalSent: false, negotiationDone: false, excoApproved: false, contractType: '', contractSigned: false, handoverDone: false };
}
function _blankOperate() {
  return { kyc: false, onboarding: false, milestones: {}, cod: false, revenueStatus: '', contractStart: '', contractExpiry: '', tariffReviewDate: '' };
}

const SEED_OPPS = [
  {
    id: 'OPP-1001', name: 'Crestfield Specialist Hospital', customer: 'Crestfield Healthcare Ltd',
    businessLine: 'Power', oppType: 'Greenfield', procurement: 'Non-tender', subSector: 'Embedded Generation',
    counterpartyClass: 'Commercial', source: 'Sales Agent / Third-Party Finder', finderId: 'FIN-01',
    location: { state: 'Lagos', lga: 'Eti-Osa', gridNode: 'Eko Disco — Lekki feeder' },
    sponsor: 'Crestfield Healthcare Ltd', sponsorYears: 9,
    contact: { name: 'Dr. Amaka Obi', role: 'Facilities Director', phone: '0803 555 0161', email: 'a.obi@crestfield.example' },
    demand: { loadKw: 180, currentSupply: 'Disco + 2×250 kVA diesel gensets', currentTariffNgn: 285, monthlySpendNgn: 8200000, loadProfile: '24/7, night load ~60% of day', meteringData: 'Partial — 6 months of bills provided' },
    economics: { capexUsdM: 0.45, capacityKw: 250, tariffNgnKwh: 215, tenorYears: 7, revenueNgnYr: 210000000, debtEquity: '60:40', ebitdaPct: 32, irrPct: 21, paybackYears: 6 },
    qualification: { expectedClose: '2026-11-30', probability: 20, competition: 'Incumbent diesel supplier; one solar-hybrid bidder', risks: 'Night-shift load profile to be verified by audit' },
    stage: 'site_recon', classification: 'ACTIVE', reviewDate: '',
    owner: 'BD Team', nextAction: 'Convert reconnaissance into a full energy audit',
    knockout: { gates: { 1: { verdict: 'PASS', notes: '6 months of bills; 24/7 clinical load' }, 2: { verdict: 'PASS', notes: 'Audited FS 2024–25 received; profitable' }, 3: { verdict: 'PASS', notes: 'Embedded gen under existing Disco franchise — established route' }, 4: { verdict: 'PASS', notes: '≈25% below blended diesel cost; IRR 21% > hurdle' }, 5: { verdict: 'PASS', notes: 'Core embedded power, Lagos' } }, outcome: 'PASS', conditions: '', declineReason: '', finalized: '2026-05-14' },
    scorecard: { scores: {}, comments: '' }, mgmtDecision: null,
    development: { nda_data: true, site_recon: false, energy_audit: false, tech_review: false, boundary_scoring: false },
    convert: _blankConvert(), operate: _blankOperate(),
    dates: { received: '2026-05-08', logged: '2026-05-09' },
    log: [
      { ts: '2026-05-08', actor: 'Tunde Akerele (Finder)', action: 'Lead submitted via finder programme' },
      { ts: '2026-05-09', actor: 'BD Team', action: 'Lead registered & logged — finder protection window opened (90 days)' },
      { ts: '2026-05-14', actor: 'Commercial Analyst', action: 'Knockout screening finalised — all 5 gates PASS → advance to development' },
      { ts: '2026-05-16', actor: 'BD Team', action: 'Classified ACTIVE; NDA signed and data request issued' },
      { ts: '2026-06-20', actor: 'BD Team', action: 'Site reconnaissance scheduled' },
    ],
  },
  {
    id: 'OPP-1002', name: 'Meridian Trust Bank — HQ Campus', customer: 'Meridian Trust Bank PLC',
    businessLine: 'Power', oppType: 'Brownfield / Acquisition', procurement: 'Non-tender', subSector: 'Embedded Generation',
    counterpartyClass: 'Commercial', source: 'Direct BD', finderId: '',
    location: { state: 'Lagos', lga: 'Lagos Island', gridNode: 'Eko Disco — Marina 11kV' },
    sponsor: 'Meridian Trust Bank PLC', sponsorYears: 22,
    contact: { name: 'Femi Adeyanju', role: 'Head, Corporate Services', phone: '0805 555 0142', email: 'f.adeyanju@meridian.example' },
    demand: { loadKw: 2400, currentSupply: 'IPP (expiring) + grid backup', currentTariffNgn: 310, monthlySpendNgn: 96000000, loadProfile: 'Weekday-heavy; data-centre baseload 800 kW', meteringData: 'Full metered history (24 months)' },
    economics: { capexUsdM: 3.1, capacityKw: 3000, tariffNgnKwh: 245, tenorYears: 10, revenueNgnYr: 2450000000, debtEquity: '65:35', ebitdaPct: 34, irrPct: 24, paybackYears: 5 },
    qualification: { expectedClose: '2026-09-30', probability: 65, competition: 'Two IPPs shortlisted alongside DEL', risks: 'PPA tariff-escalation clause under negotiation' },
    stage: 'negotiation', classification: 'ACTIVE', reviewDate: '',
    owner: 'BD Team', nextAction: 'Conclude PPA tariff & escalation terms; target signing Q3',
    knockout: { gates: { 1: { verdict: 'PASS', notes: '24-month metered history' }, 2: { verdict: 'PASS', notes: 'Investment-grade national bank' }, 3: { verdict: 'PASS', notes: 'Embedded generation — established NERC route' }, 4: { verdict: 'PASS', notes: '21% below current blended cost; IRR 24%' }, 5: { verdict: 'PASS', notes: 'Core mandate' } }, outcome: 'PASS', conditions: '', declineReason: '', finalized: '2026-02-10' },
    scorecard: {
      scores: { A1: 5, A2: 5, A3: 5, A4: 5, A5: 3, B1: 5, B2: 3, B3: 5, B4: 5, C1: 5, C2: 5, C3: 5, C4: 3, D1: 3, D2: 5, D3: 5, E1: 5, E2: 3, E3: 5 },
      comments: 'Strong counterparty and demand certainty. Take-or-pay floor still at 65% — push to 80% in negotiation.',
    },
    mgmtDecision: { decision: 'GO', rationale: 'Weighted total 89.7% — clean GO. Proceed to proposal; secure ≥80% take-or-pay.', date: '2026-04-02', by: 'Management Investment Committee' },
    development: { nda_data: true, site_recon: true, energy_audit: true, tech_review: true, boundary_scoring: true },
    convert: { proposalSent: true, negotiationDone: false, excoApproved: false, contractType: 'PPA', contractSigned: false, handoverDone: false },
    operate: _blankOperate(),
    dates: { received: '2026-01-20', logged: '2026-01-21' },
    log: [
      { ts: '2026-01-20', actor: 'BD Team', action: 'Lead received (direct BD origination)' },
      { ts: '2026-01-21', actor: 'BD Team', action: 'Registered & logged as OPP-1002' },
      { ts: '2026-02-10', actor: 'Commercial Analyst', action: 'Knockout finalised — 5/5 PASS' },
      { ts: '2026-03-25', actor: 'Commercial Analyst', action: 'Pillar scorecard completed — weighted total 89.7% (GO band)' },
      { ts: '2026-04-02', actor: 'Management IC', action: 'Gate 2 decision: GO — advance to proposal' },
      { ts: '2026-04-18', actor: 'BD Team', action: 'Proposal & draft term sheet issued to customer' },
      { ts: '2026-06-28', actor: 'BD Team', action: 'Negotiation — tariff & escalation clauses in mark-up' },
    ],
  },
  {
    id: 'OPP-1003', name: 'Zenmark Foods FZE — Gas to Power & Heat', customer: 'Zenmark Foods FZE',
    businessLine: 'Gas Retail', oppType: 'Greenfield', procurement: 'Non-tender', subSector: 'Gas-to-Power',
    counterpartyClass: 'Industrial', source: 'Referral – Existing Customer', finderId: '',
    location: { state: 'Ogun', lga: 'Ado-Odo/Ota', gridNode: 'Off-grid — CNG trucked supply' },
    sponsor: 'Zenmark Group', sponsorYears: 14,
    contact: { name: 'Ibrahim Sule', role: 'Plant Manager', phone: '0802 555 0177', email: 'i.sule@zenmark.example' },
    demand: { loadKw: 1200, currentSupply: 'LPFO boilers + diesel gensets', currentTariffNgn: 0, monthlySpendNgn: 54000000, loadProfile: '2-shift production, 6 days/week', meteringData: 'Fuel purchase records (18 months)' },
    economics: { capexUsdM: 1.8, capacityKw: 1500, tariffNgnKwh: 0, tenorYears: 5, revenueNgnYr: 720000000, debtEquity: '55:45', ebitdaPct: 29, irrPct: 23, paybackYears: 5 },
    qualification: { expectedClose: '2025-08-31', probability: 100, competition: '', risks: '' },
    stage: 'revenue', classification: 'CONVERTED', reviewDate: '',
    owner: 'Commercial Ops', nextAction: 'Routine monitoring of volume offtake & billing',
    knockout: { gates: { 1: { verdict: 'PASS', notes: '18 months of fuel records' }, 2: { verdict: 'PASS', notes: 'FZE with audited accounts; group guarantee' }, 3: { verdict: 'PASS', notes: 'NMDPRA gas retail permit held' }, 4: { verdict: 'PASS', notes: 'CNG ~40% below LPFO/diesel equivalent' }, 5: { verdict: 'PASS', notes: 'Gas retail — core' } }, outcome: 'PASS', conditions: '', declineReason: '', finalized: '2025-03-05' },
    scorecard: {
      scores: { A1: 5, A2: 5, A3: 3, A4: 5, A5: 5, B1: 5, B2: 5, B3: 5, B4: 5, C1: 5, C2: 3, C3: 5, C4: 3, D1: 3, D2: 5, D3: 3, E1: 5, E2: 5, E3: 5 },
      comments: 'Converted reference case — GSPA with take-or-pay at 85%.',
    },
    mgmtDecision: { decision: 'GO', rationale: 'Weighted total 89% — GO.', date: '2025-04-10', by: 'Management Investment Committee' },
    development: { nda_data: true, site_recon: true, energy_audit: true, tech_review: true, boundary_scoring: true },
    convert: { proposalSent: true, negotiationDone: true, excoApproved: true, contractType: 'GSPA', contractSigned: true, handoverDone: true },
    operate: { kyc: true, onboarding: true, milestones: { ded: true, vendor: true, install: true, connect: true, commiss: true }, cod: true, revenueStatus: 'On Track', contractStart: '2025-09-01', contractExpiry: '2030-08-31', tariffReviewDate: '2026-09-01' },
    dates: { received: '2025-02-02', logged: '2025-02-03' },
    log: [
      { ts: '2025-02-02', actor: 'BD Team', action: 'Lead received via existing-customer referral' },
      { ts: '2025-03-05', actor: 'Commercial Analyst', action: 'Knockout finalised — 5/5 PASS' },
      { ts: '2025-04-10', actor: 'Management IC', action: 'Gate 2 decision: GO (scorecard 89%)' },
      { ts: '2025-06-30', actor: 'EXCO', action: 'EXCO approval granted; GSPA execution authorised' },
      { ts: '2025-07-15', actor: 'Customer', action: 'GSPA signed — 5-year tenor, 85% take-or-pay' },
      { ts: '2025-07-16', actor: 'BD Team', action: 'Handover pack issued to Commercial Operations' },
      { ts: '2025-09-01', actor: 'Commercial Ops', action: 'COD achieved — revenue generation began' },
    ],
  },
  {
    id: 'OPP-1004', name: 'Halcyon Data Centres — LNG PaaS (Equity)', customer: 'Halcyon Infra Ltd',
    businessLine: 'Venture', oppType: 'Venture (JV, Co-investment, Consortium)', procurement: 'Non-tender', subSector: 'Gas-to-Power',
    counterpartyClass: 'Industrial', source: 'Strategic Partnership', finderId: '',
    location: { state: 'Abuja (FCT)', lga: 'AMAC', gridNode: 'Off-grid — LNG containerised' },
    sponsor: 'Halcyon Infra Ltd', sponsorYears: 4,
    contact: { name: 'Ngozi Eze', role: 'CEO', phone: '0807 555 0114', email: 'n.eze@halcyon.example' },
    demand: { loadKw: 7000, currentSupply: 'Diesel prime power across 7 data-centre sites', currentTariffNgn: 0, monthlySpendNgn: 163000000, loadProfile: 'Mission-critical 24/7 baseload', meteringData: 'Site-level diesel consumption logs' },
    economics: { capexUsdM: 5.0, capacityKw: 7000, tariffNgnKwh: 0, tenorYears: 8, revenueNgnYr: 0, debtEquity: '0:100 (equity ask)', ebitdaPct: 0, irrPct: 0, paybackYears: 0 },
    qualification: { expectedClose: '2026-12-15', probability: 30, competition: 'Sponsor courting two other equity investors', risks: 'Offtake still at Heads of Terms; technology new to DEL at this scale' },
    stage: 'classification', classification: 'ACTIVE', reviewDate: '',
    owner: 'Investment & Commercial Team', nextAction: 'Receive open items (contract, model, audited accounts) before due diligence',
    knockout: {
      gates: {
        1: { verdict: 'CONDITIONAL', notes: 'Anchor off-taker at Heads of Terms — not yet an executed contract' },
        2: { verdict: 'CONDITIONAL', notes: 'Sponsor: 2 years audited FS (unqualified), live contracts; diligence needed on equity structure & track record at scale' },
        3: { verdict: 'CONDITIONAL', notes: 'NUPRC gas permit confirmed; SONCAP, NEMSA & State Fire approvals in process across 7 sites' },
        4: { verdict: 'PASS', notes: 'LNG ~88% cheaper than diesel per site; compelling customer economics' },
        5: { verdict: 'CONDITIONAL', notes: 'Fits gas-to-power mandate, but DEL has not deployed containerised LNG at this scale' },
      },
      outcome: 'CONDITIONAL', finalized: '2026-06-08',
      conditions: '1) Convert HoT to executed offtake; 2) sponsor equity-structure diligence; 3) independent technology/O&M validation; 4) regulatory close-out (SONCAP, NEMSA, Fire); 5) agree investment term sheet.',
      declineReason: '',
    },
    scorecard: { scores: {}, comments: '' }, mgmtDecision: null,
    development: { nda_data: false, site_recon: false, energy_audit: false, tech_review: false, boundary_scoring: false },
    convert: _blankConvert(), operate: _blankOperate(),
    dates: { received: '2026-05-28', logged: '2026-05-29' },
    log: [
      { ts: '2026-05-28', actor: 'Investment & Commercial Team', action: 'Equity opportunity introduced by sponsor' },
      { ts: '2026-06-08', actor: 'Commercial Analyst', action: 'Knockout finalised — CONDITIONAL GO with 5 logged conditions (screening memo issued)' },
    ],
  },
  {
    id: 'OPP-1005', name: 'Kaduna Agro-Processing Cluster', customer: 'Kaduna Agro Estates Consortium',
    businessLine: 'Collaboration', oppType: 'Greenfield', procurement: 'Cluster / Strategic', subSector: 'Gas Distribution',
    counterpartyClass: 'SME Cluster', source: 'Strategic Partnership', finderId: '',
    location: { state: 'Kaduna', lga: 'Chikun', gridNode: 'Kaduna Disco franchise — industrial layout' },
    sponsor: 'Consortium (7 processors)', sponsorYears: 6,
    contact: { name: 'Auwal Bello', role: 'Cluster Coordinator', phone: '0809 555 0193', email: 'a.bello@kadagro.example' },
    demand: { loadKw: 3200, currentSupply: 'Mixed diesel/grid; frequent outages', currentTariffNgn: 265, monthlySpendNgn: 88000000, loadProfile: 'Seasonal peaks (harvest); day-shift dominant', meteringData: 'None — estimates only' },
    economics: { capexUsdM: 4.2, capacityKw: 4000, tariffNgnKwh: 230, tenorYears: 10, revenueNgnYr: 0, debtEquity: '60:40', ebitdaPct: 0, irrPct: 0, paybackYears: 0 },
    qualification: { expectedClose: '2027-03-31', probability: 30, competition: 'None identified', risks: 'Multi-party credit aggregation; anchor tenant needed' },
    stage: 'nda_data', classification: 'ACTIVE', reviewDate: '',
    owner: 'Temitope', nextAction: 'Advance cluster structuring; weekly report to management',
    knockout: { gates: { 1: { verdict: 'CONDITIONAL', notes: 'Aggregate demand credible but unmetered — audit required' }, 2: { verdict: 'CONDITIONAL', notes: 'Cluster SPV proposed; anchor tenant financials pending' }, 3: { verdict: 'PASS', notes: 'Franchise-area distribution — defined pathway' }, 4: { verdict: 'PASS', notes: 'Indicative ~13% below blended cost' }, 5: { verdict: 'PASS', notes: 'Cluster strategy — strategic priority' } }, outcome: 'CONDITIONAL', conditions: 'Metered demand study; SPV credit structure with anchor tenant guarantee.', declineReason: '', finalized: '2026-04-22' },
    scorecard: { scores: {}, comments: '' }, mgmtDecision: null,
    development: { nda_data: false, site_recon: false, energy_audit: false, tech_review: false, boundary_scoring: false },
    convert: _blankConvert(), operate: _blankOperate(),
    dates: { received: '2026-04-10', logged: '2026-04-11' },
    log: [
      { ts: '2026-04-10', actor: 'BD Team', action: 'Cluster opportunity via strategic partnership' },
      { ts: '2026-04-22', actor: 'Commercial Analyst', action: 'Knockout: CONDITIONAL — advance flagged, conditions logged' },
      { ts: '2026-06-30', actor: 'Temitope', action: 'NDA circulated to consortium members' },
    ],
  },
  {
    id: 'OPP-1006', name: 'Silverline Estates — Phase 1', customer: 'Silverline Property Dev. Ltd',
    businessLine: 'Power', oppType: 'Greenfield', procurement: 'Non-tender', subSector: 'Embedded Generation',
    counterpartyClass: 'Residential Estate', source: 'Direct BD', finderId: '',
    location: { state: 'Ogun', lga: 'Obafemi Owode', gridNode: 'Ibadan Disco fringe' },
    sponsor: 'Silverline Property Dev. Ltd', sponsorYears: 2,
    contact: { name: 'Kola Martins', role: 'Estate Manager', phone: '0806 555 0129', email: 'k.martins@silverline.example' },
    demand: { loadKw: 90, currentSupply: 'Individual home gensets', currentTariffNgn: 0, monthlySpendNgn: 3100000, loadProfile: 'Evening-peak residential', meteringData: 'None' },
    economics: { capexUsdM: 0.35, capacityKw: 150, tariffNgnKwh: 240, tenorYears: 10, revenueNgnYr: 68000000, debtEquity: '50:50', ebitdaPct: 18, irrPct: 12, paybackYears: 11 },
    qualification: { expectedClose: '', probability: 0, competition: '', risks: 'Sub-scale; occupancy 35%; developer 2 years old, unaudited' },
    stage: 'knockout', classification: 'REJECTED', reviewDate: '',
    owner: 'BD Team', nextAction: 'Closed — decline letter issued',
    knockout: {
      gates: {
        1: { verdict: 'FAIL', notes: '90 kW current demand — below the ~200–300 kW minimum; occupancy only 35%' },
        2: { verdict: 'FAIL', notes: 'Developer 2 years old; no audited financials available' },
        3: { verdict: 'PASS', notes: 'Standard embedded route' },
        4: { verdict: 'FAIL', notes: 'IRR 12% — below hurdle; payback 11 years' },
        5: { verdict: 'PASS', notes: 'In-sector' },
      },
      outcome: 'NO_GO', conditions: '', finalized: '2026-06-02',
      declineReason: 'Demand is sub-scale (90 kW vs ~200–300 kW minimum) at 35% estate occupancy, the counterparty has no audited financial history, and projected returns (IRR 12%, 11-year payback) fall below DEL’s investment hurdle. DEL would welcome a re-submission once occupancy exceeds ~70% and two years of audited accounts are available.',
    },
    scorecard: { scores: {}, comments: '' }, mgmtDecision: null,
    development: { nda_data: false, site_recon: false, energy_audit: false, tech_review: false, boundary_scoring: false },
    convert: _blankConvert(), operate: _blankOperate(),
    dates: { received: '2026-05-25', logged: '2026-05-26' },
    log: [
      { ts: '2026-05-25', actor: 'BD Team', action: 'Lead received' },
      { ts: '2026-06-02', actor: 'Commercial Analyst', action: 'Knockout finalised — gates 01, 02, 04 FAIL → automatic NO-GO' },
      { ts: '2026-06-02', actor: 'BD Team', action: 'Decline letter issued; rationale logged for audit' },
    ],
  },
  {
    id: 'OPP-1007', name: 'Lagoon Front Resort — Captive Plant', customer: 'Lagoon Front Hospitality Ltd',
    businessLine: 'Captive Power', oppType: 'Greenfield', procurement: 'Tender', subSector: 'Captive Power',
    counterpartyClass: 'Commercial', source: 'Direct BD', finderId: '',
    location: { state: 'Lagos', lga: 'Ibeju-Lekki', gridNode: 'Off-grid resort' },
    sponsor: 'Lagoon Front Hospitality Ltd', sponsorYears: 11,
    contact: { name: 'Chidi Okafor', role: 'GM Operations', phone: '0808 555 0186', email: 'c.okafor@lagoonfront.example' },
    demand: { loadKw: 950, currentSupply: 'Diesel farm (4×500 kVA)', currentTariffNgn: 0, monthlySpendNgn: 41000000, loadProfile: 'Weekend/holiday peaks; 65% avg load factor', meteringData: 'Genset logs (12 months)' },
    economics: { capexUsdM: 1.2, capacityKw: 1200, tariffNgnKwh: 235, tenorYears: 8, revenueNgnYr: 480000000, debtEquity: '60:40', ebitdaPct: 27, irrPct: 19, paybackYears: 7 },
    qualification: { expectedClose: '2026-10-31', probability: 20, competition: 'Competitive tender — 3 bidders', risks: 'Tender outcome outside DEL control' },
    stage: 'proposal', classification: 'DEFERRED', reviewDate: '2026-08-01',
    owner: 'BD Team', nextAction: 'Await tender outcome; periodic review on 01 Aug 2026',
    knockout: { gates: { 1: { verdict: 'PASS', notes: '12-month genset logs' }, 2: { verdict: 'PASS', notes: '11-year operating history; audited FS' }, 3: { verdict: 'PASS', notes: 'Captive permit route defined' }, 4: { verdict: 'PASS', notes: '~18% below diesel; IRR 19%' }, 5: { verdict: 'PASS', notes: 'Captive power — core' } }, outcome: 'PASS', conditions: '', declineReason: '', finalized: '2026-03-12' },
    scorecard: {
      scores: { A1: 3, A2: 5, A3: 3, A4: 5, A5: 3, B1: 5, B2: 3, B3: 5, B4: 3, C1: 3, C2: 3, C3: 5, C4: 3, D1: 3, D2: 3, D3: 3, E1: 3, E2: 3, E3: 3 },
      comments: 'Solid mid-band opportunity; hinges on tender award.',
    },
    mgmtDecision: { decision: 'CONDITIONAL', rationale: 'Scorecard 71.5% — conditional band. Proceed with bid; do not commit development spend beyond tender costs until award.', date: '2026-04-05', by: 'Management Investment Committee' },
    development: { nda_data: true, site_recon: true, energy_audit: true, tech_review: true, boundary_scoring: true },
    convert: { proposalSent: true, negotiationDone: false, excoApproved: false, contractType: 'Captive Power Agreement', contractSigned: false, handoverDone: false },
    operate: _blankOperate(),
    dates: { received: '2026-02-14', logged: '2026-02-15' },
    log: [
      { ts: '2026-02-14', actor: 'BD Team', action: 'Tender opportunity identified' },
      { ts: '2026-03-12', actor: 'Commercial Analyst', action: 'Knockout finalised — 5/5 PASS' },
      { ts: '2026-04-05', actor: 'Management IC', action: 'Gate 2: CONDITIONAL GO (71.5%) — bid approved, spend capped' },
      { ts: '2026-05-02', actor: 'BD Team', action: 'Bid submitted; classified DEFERRED pending tender outcome (review 01-Aug-2026)' },
    ],
  },
  {
    id: 'OPP-1008', name: 'Golden Palm Hotel Cluster — Ibadan', customer: 'Golden Palm Hospitality Group',
    businessLine: 'Power', oppType: 'Greenfield', procurement: 'Cluster / Strategic', subSector: 'Embedded Generation',
    counterpartyClass: 'Commercial', source: 'Sales Agent / Third-Party Finder', finderId: 'FIN-02',
    location: { state: 'Oyo', lga: 'Ibadan North', gridNode: 'Ibadan Disco — Bodija feeder' },
    sponsor: 'Golden Palm Hospitality Group', sponsorYears: 8,
    contact: { name: 'Bisi Ajala', role: 'Group Facilities Lead', phone: '0810 555 0170', email: 'b.ajala@goldenpalm.example' },
    demand: { loadKw: 620, currentSupply: 'Disco + per-hotel gensets (3 sites)', currentTariffNgn: 275, monthlySpendNgn: 27000000, loadProfile: 'Evening peak; 3-site cluster within 2 km', meteringData: 'Bills for 2 of 3 sites' },
    economics: { capexUsdM: 0.9, capacityKw: 800, tariffNgnKwh: 0, tenorYears: 0, revenueNgnYr: 0, debtEquity: '', ebitdaPct: 0, irrPct: 0, paybackYears: 0 },
    qualification: { expectedClose: '', probability: 10, competition: 'Unknown', risks: 'Third site bills outstanding' },
    stage: 'lead_logged', classification: 'ACTIVE', reviewDate: '',
    owner: 'BD Team', nextAction: 'Run knockout screening',
    knockout: _blankKnockout(),
    scorecard: { scores: {}, comments: '' }, mgmtDecision: null,
    development: { nda_data: false, site_recon: false, energy_audit: false, tech_review: false, boundary_scoring: false },
    convert: _blankConvert(), operate: _blankOperate(),
    dates: { received: '2026-06-27', logged: '2026-06-29' },
    log: [
      { ts: '2026-06-27', actor: 'QuantaReach Ltd (Sales Agent)', action: 'Cluster lead submitted — 3 hotels, ~620 kW aggregate' },
      { ts: '2026-06-29', actor: 'BD Team', action: 'Registered & logged — agent protection window opened (90 days); ready for knockout' },
    ],
  },
];
