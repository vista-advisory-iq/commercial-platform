/* ==========================================================================
   DEL Commercial Prototype — application logic (vanilla JS, no build step)
   State lives in localStorage so the demo is interactive and persistent.
   ========================================================================== */

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
const STORE_KEY = 'del-commercial-prototype-v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to seed */ }
  const fresh = { opportunities: structuredClone(SEED_OPPS), finders: structuredClone(SEED_FINDERS) };
  localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  return fresh;
}
let STATE = loadState();

function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(STATE)); }
function resetDemo() {
  if (!confirm('Reset the demo? All changes will be replaced with the original dummy data.')) return;
  localStorage.removeItem(STORE_KEY);
  location.reload();
}
function getOpp(id) { return STATE.opportunities.find(o => o.id === id); }
function nextOppId() {
  const nums = STATE.opportunities.map(o => parseInt(o.id.replace('OPP-', ''), 10));
  return 'OPP-' + (Math.max(1000, ...nums) + 1);
}
function today() { return new Date().toISOString().slice(0, 10); }
function addLog(opp, actor, action) { opp.log.push({ ts: today(), actor, action }); }

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function ngn(v) {
  if (!v) return '—';
  if (v >= 1e9) return '₦' + (v / 1e9).toFixed(1) + 'bn';
  if (v >= 1e6) return '₦' + (v / 1e6).toFixed(1) + 'm';
  return '₦' + Number(v).toLocaleString();
}
function kw(v) { return v ? Number(v).toLocaleString() + ' kW' : '—'; }
function stageLabel(key) { const s = STAGES.find(x => x.key === key); return s ? s.label : key; }
function stagePhase(key) { const s = STAGES.find(x => x.key === key); return s ? s.phase : 'ORIGINATE'; }
function classBadge(c) {
  const map = { ACTIVE: 'blue', NURTURE: 'amber', DEFERRED: 'amber', CONVERTED: 'green', REJECTED: 'red' };
  const cls = CLASSIFICATIONS.find(x => x.key === c);
  return `<span class="badge ${map[c] || 'grey'}">${esc(cls ? cls.label : c || '—')}</span>`;
}
function verdictBadge(v) {
  if (v === 'PASS' || v === 'GO') return `<span class="badge green">${v === 'PASS' ? 'PASS' : 'GO'}</span>`;
  if (v === 'CONDITIONAL') return '<span class="badge amber">CONDITIONAL</span>';
  if (v === 'FAIL' || v === 'NO_GO') return `<span class="badge red">${v === 'FAIL' ? 'FAIL' : 'NO-GO'}</span>`;
  return '<span class="badge grey">Pending</span>';
}
function ownerChip(o) {
  const cls = { DEL: 'del', JOINT: 'joint', CUSTOMER: 'customer' }[o] || '';
  return `<span class="owner-chip ${cls}">${esc(o)}</span>`;
}
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function openModal(title, bodyHtml, footHtml) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-back'; back.id = 'modal';
  back.innerHTML = `<div class="modal">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="btn ghost sm" onclick="closeModal()">✕ Close</button></div>
    <div class="modal-body">${bodyHtml}${footHtml ? `<div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end">${footHtml}</div>` : ''}</div>
  </div>`;
  back.addEventListener('click', e => { if (e.target === back) closeModal(); });
  document.body.appendChild(back);
}
function closeModal() { const m = document.getElementById('modal'); if (m) m.remove(); }

// ---------------------------------------------------------------------------
// Knockout + scorecard engines
// ---------------------------------------------------------------------------
function computeKnockout(gates) {
  const verdicts = KNOCKOUT_GATES.map(g => (gates[g.num] || {}).verdict || '');
  if (verdicts.some(v => !v)) return null;                    // incomplete
  if (verdicts.some(v => v === 'FAIL')) return 'NO_GO';       // any FAIL → auto NO-GO
  if (verdicts.some(v => v === 'CONDITIONAL')) return 'CONDITIONAL';
  return 'PASS';
}

function computeScore(opp) {
  const scores = opp.scorecard.scores || {};
  let total = 0, complete = true;
  const pillars = PILLARS.map(p => {
    let sum = 0, scored = 0;
    p.subs.forEach(s => { if (scores[s.id]) { sum += scores[s.id]; scored++; } });
    const max = p.subs.length * 5;
    const done = scored === p.subs.length;
    if (!done) complete = false;
    const contribution = done ? (sum / max) * p.weight : 0;
    total += contribution;
    return { ...p, sum, max, done, contribution, belowThreshold: done && sum < p.threshold };
  });
  total = Math.round(total * 10) / 10;
  let verdict = null;
  if (complete) verdict = total >= SCORE_BANDS.GO ? 'GO' : total >= SCORE_BANDS.CONDITIONAL ? 'CONDITIONAL' : 'NO_GO';
  return { pillars, total, complete, verdict };
}

// ---------------------------------------------------------------------------
// Generated documents (screening memo + decline letter, echoing the MTN memo)
// ---------------------------------------------------------------------------
function screeningMemoText(opp) {
  const g = opp.knockout.gates;
  const lines = KNOCKOUT_GATES.map(k => {
    const r = g[k.num] || {};
    return `Gate 0${k.num} — ${k.name}: ${r.verdict === 'CONDITIONAL' ? 'CONDITIONAL PASS' : (r.verdict || 'PENDING')}\n   Basis: ${r.notes || '—'}`;
  }).join('\n\n');
  const outcome = opp.knockout.outcome === 'NO_GO' ? 'NO-GO' : opp.knockout.outcome === 'CONDITIONAL' ? 'CONDITIONAL GO' : 'GO';
  return `INVESTMENT SCREENING MEMO
${opp.name} (${opp.id})

FROM:      Investment & Commercial Team
REVIEWED:  Head, Investment & Commercial / COO
TO:        Management Investment Committee
DATE:      ${today()}
SUBJECT:   Knockout Screening — ${opp.name}
PURPOSE:   Gate assessment to determine whether this opportunity should
           advance to full development and due diligence.

1. OPPORTUNITY OVERVIEW
${opp.customer} — ${opp.businessLine} / ${opp.subSector}. Estimated load ${kw(opp.demand.loadKw)}; ${opp.location.state} (${opp.location.lga}). Source: ${opp.source}${opp.finderId ? ' — registered finder attribution applies' : ''}.

2. KNOCKOUT GATE ASSESSMENT
${lines}

3. OVERALL RECOMMENDATION: ${outcome}
${opp.knockout.conditions ? '\nConditions to resolve before commitment:\n' + opp.knockout.conditions : ''}
${opp.knockout.declineReason ? '\nDecline rationale (logged):\n' + opp.knockout.declineReason : ''}

Prepared by ______________  Reviewed by ______________  Approved by ______________`;
}

function declineLetterText(opp) {
  return `${today()}

${opp.contact.name}
${opp.customer}
${opp.location.state}, Nigeria

Dear ${opp.contact.name.split(' ')[0]},

RE: ${opp.name.toUpperCase()} — OUTCOME OF INITIAL SCREENING

Thank you for the opportunity to evaluate the above proposal. Decentralised
Energy Limited assesses every opportunity against a standard set of screening
criteria covering demand, counterparty strength, regulatory pathway,
commercial viability and strategic fit.

Following a careful review, we regret to advise that DEL will not be
progressing this opportunity at this time. In summary:

${opp.knockout.declineReason || 'The opportunity did not meet one or more of DEL’s knockout screening criteria.'}

This decision reflects our screening criteria as at the date of this letter
and not the merits of your business. Should the underlying circumstances
change, we would welcome a fresh submission.

Yours sincerely,

_____________________________
Business Development Team
Decentralised Energy Limited — Making Energy Flow`;
}

function scorecardMemoText(opp) {
  const sc = computeScore(opp);
  const rows = sc.pillars.map(p =>
    `  ${p.key}. ${p.name} (${p.weight}%)  —  raw ${p.sum}/${p.max}  →  ${p.contribution.toFixed(1)} pts${p.belowThreshold ? '  ⚠ below pillar minimum (' + p.threshold + ')' : ''}`
  ).join('\n');
  return `STAGE 2 — WEIGHTED SCORECARD SUMMARY
${opp.name} (${opp.id}) · ${today()}

${rows}

WEIGHTED TOTAL: ${sc.total}%   →   ${sc.verdict === 'GO' ? 'GO (≥' + SCORE_BANDS.GO + '%)' : sc.verdict === 'CONDITIONAL' ? 'CONDITIONAL GO (' + SCORE_BANDS.CONDITIONAL + '–' + (SCORE_BANDS.GO - 1) + '%)' : 'NO-GO (<' + SCORE_BANDS.CONDITIONAL + '%)'}

Assessor commentary:
${opp.scorecard.comments || '—'}

The verdict above is the framework recommendation; the Management Investment
Committee records the final decision at Gate 2 and may override with a
documented rationale.`;
}

// ---------------------------------------------------------------------------
// Shared top bar
// ---------------------------------------------------------------------------
function renderTopbar(active) {
  const links = [
    ['index.html', 'Dashboard'],
    ['pipeline.html', 'Pipeline'],
    ['intake.html', 'New Opportunity'],
    ['agents.html', 'Sales Agents & Finders'],
  ];
  document.getElementById('topbar').innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="index.html">
        <span class="logo-badge"><img src="assets/del-logo.png" alt="DEL — Decentralised Energy Limited"></span>
        <span class="brand-text"><b>Commercial Platform</b><span>Opportunity lifecycle — end-to-end</span></span>
      </a>
      <nav class="nav">${links.map(([href, label]) =>
        `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`).join('')}
      </nav>
      <span class="tagline">Making Energy Flow</span>
      <span class="proto-chip">PROTOTYPE</span>
      <button class="btn ghost sm" onclick="resetDemo()" title="Restore the original dummy data">↺ Reset demo</button>
    </div>`;
}

// ===========================================================================
// PAGE: Dashboard
// ===========================================================================
function renderDashboard() {
  const opps = STATE.opportunities;
  const by = k => opps.filter(o => o.classification === k).length;
  const openItems = opps.filter(o => !['CONVERTED', 'REJECTED'].includes(o.classification));
  const reviewsDue = opps.filter(o => (o.classification === 'NURTURE' || o.classification === 'DEFERRED') && o.reviewDate && o.reviewDate <= today());
  const mgmtNeeded = opps.filter(o => o.stage === 'mgmt_approval' || (o.stage === 'boundary_scoring' && computeScore(o).complete));

  const kpis = `
    <div class="grid cols-6">
      <div class="card tight kpi"><div class="val">${opps.length}</div><div class="lbl">Total Opportunities</div></div>
      <div class="card tight kpi blue"><div class="val">${by('ACTIVE')}</div><div class="lbl">Active</div></div>
      <div class="card tight kpi green"><div class="val">${by('CONVERTED')}</div><div class="lbl">Converted</div></div>
      <div class="card tight kpi amber"><div class="val">${by('NURTURE') + by('DEFERRED')}</div><div class="lbl">Parked / Deferred</div></div>
      <div class="card tight kpi red"><div class="val">${by('REJECTED')}</div><div class="lbl">Rejected / Dead</div></div>
      <div class="card tight kpi ${reviewsDue.length ? 'amber' : ''}"><div class="val">${reviewsDue.length}</div><div class="lbl">Reviews Due</div></div>
    </div>`;

  const stageRows = STAGES.map(s => {
    const n = openItems.filter(o => o.stage === s.key).length;
    return n ? `<tr onclick="location.href='pipeline.html'"><td>${esc(s.label)}</td><td><span class="badge navy">${stagePhase(s.key)}</span></td><td style="text-align:right"><b>${n}</b></td></tr>` : '';
  }).join('');

  const pmap = PHASES.map(p => {
    const items = STAGES.filter(s => s.phase === p.key).map(s =>
      `<div class="${s.gate ? 'gate-flag' : ''}">${s.gate ? '⛩ ' : ''}${esc(s.label)}</div>`).join('');
    return `<div class="pcol"><div class="pcol-head" style="background:${p.color}">${p.label}</div><div class="pcol-body">${items}</div></div>`;
  }).join('<div style="align-self:center;color:var(--muted);font-size:1.3rem">→</div>');

  const recent = opps.flatMap(o => o.log.map(l => ({ ...l, opp: o })))
    .sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8)
    .map(l => `<li><span class="ts">${l.ts} · <a href="opportunity.html?id=${l.opp.id}">${l.opp.id}</a></span><br>${esc(l.action)} <span class="muted">— ${esc(l.actor)}</span></li>`).join('');

  const alerts = [];
  reviewsDue.forEach(o => alerts.push(`<div class="callout amber"><b>Periodic review due:</b> <a href="opportunity.html?id=${o.id}">${o.id} — ${esc(o.name)}</a> (parked since ${o.reviewDate}). Activate, keep parked, or drop.</div>`));
  mgmtNeeded.forEach(o => alerts.push(`<div class="callout"><b>Management decision required (Gate 2):</b> <a href="opportunity.html?id=${o.id}">${o.id} — ${esc(o.name)}</a> — scorecard ready for committee review.</div>`));
  opps.filter(o => o.operate.contractExpiry && o.operate.contractExpiry <= '2027-01-01' && o.classification === 'CONVERTED')
    .forEach(o => alerts.push(`<div class="callout"><b>Tariff review approaching:</b> <a href="opportunity.html?id=${o.id}">${o.id} — ${esc(o.name)}</a> (review ${o.operate.tariffReviewDate || o.operate.contractExpiry}).</div>`));

  document.getElementById('app').innerHTML = `
    <div class="page-head">
      <div><h1>Commercial Dashboard</h1>
      <p class="muted">One pipeline, one lifecycle: <b>Originate → Qualify → Develop → Convert → Operate</b>, with three decision gates. Click any opportunity to walk it end-to-end.</p></div>
      <a class="btn primary" href="intake.html">+ Register New Opportunity</a>
    </div>
    ${kpis}
    ${alerts.length ? `<div style="margin-top:16px">${alerts.join('')}</div>` : ''}
    <div class="card" style="margin-top:16px">
      <div class="card-title"><h2>End-to-End Process Map</h2><span class="muted">⛩ = decision gate (1 Screening · 2 Management Approval · 3 COD Readiness)</span></div>
      <div class="pmap">${pmap}</div>
    </div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card">
        <div class="card-title"><h2>Open Items by Stage</h2><a href="pipeline.html">View pipeline →</a></div>
        <div class="tbl-wrap" style="box-shadow:none"><table><thead><tr><th>Stage</th><th>Phase</th><th style="text-align:right">Count</th></tr></thead><tbody>${stageRows || '<tr class="no-link"><td colspan="3" class="muted">No open items.</td></tr>'}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title"><h2>Recent Activity</h2></div>
        <ul class="timeline">${recent}</ul>
      </div>
    </div>`;
}

// ===========================================================================
// PAGE: Pipeline
// ===========================================================================
let PIPE_FILTER = 'ALL';
function renderPipeline() {
  const q = (document.getElementById('pipe-q') || {}).value || '';
  const opps = STATE.opportunities.filter(o => {
    if (PIPE_FILTER === 'OPEN' && ['CONVERTED', 'REJECTED'].includes(o.classification)) return false;
    if (PIPE_FILTER !== 'ALL' && PIPE_FILTER !== 'OPEN' && o.classification !== PIPE_FILTER) return false;
    if (q && !(o.id + ' ' + o.name + ' ' + o.customer + ' ' + o.businessLine).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const tabs = [['ALL', 'All'], ['OPEN', 'Open'], ['ACTIVE', 'Active'], ['NURTURE', 'Nurture'], ['DEFERRED', 'Deferred'], ['CONVERTED', 'Converted'], ['REJECTED', 'Rejected']];
  const cnt = k => k === 'ALL' ? STATE.opportunities.length
    : k === 'OPEN' ? STATE.opportunities.filter(o => !['CONVERTED', 'REJECTED'].includes(o.classification)).length
    : STATE.opportunities.filter(o => o.classification === k).length;

  const rows = opps.map(o => {
    const sc = computeScore(o);
    return `<tr onclick="location.href='opportunity.html?id=${o.id}'">
      <td><b>${o.id}</b></td>
      <td>${esc(o.name)}<br><small class="muted">${esc(o.customer)}</small></td>
      <td>${esc(o.businessLine)}</td>
      <td>${esc(o.source.startsWith('Sales Agent') ? 'Finder' : o.source)}</td>
      <td>${kw(o.demand.loadKw)}</td>
      <td><span class="badge navy">${esc(stageLabel(o.stage))}</span></td>
      <td>${verdictBadge(o.knockout.outcome)}</td>
      <td>${sc.complete ? `<b>${sc.total}%</b> ${verdictBadge(sc.verdict)}` : '<span class="muted">—</span>'}</td>
      <td>${classBadge(o.classification)}</td>
      <td><small>${esc(o.nextAction || '—')}</small></td>
      <td><small>${esc(o.owner)}</small></td>
    </tr>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="page-head">
      <div><h1>Opportunity Pipeline</h1><p class="muted">Every opportunity, its stage, knockout result, scorecard and classification — the single source of truth.</p></div>
      <a class="btn primary" href="intake.html">+ Register New Opportunity</a>
    </div>
    <div class="tabbar">${tabs.map(([k, l]) =>
      `<button class="${PIPE_FILTER === k ? 'active' : ''}" onclick="PIPE_FILTER='${k}';renderPipeline()">${l}<span class="cnt">${cnt(k)}</span></button>`).join('')}
      <input id="pipe-q" placeholder="Search name, customer, line…" style="max-width:260px;margin-left:auto" value="${esc(q)}" oninput="renderPipeline()">
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>ID</th><th>Opportunity</th><th>Line</th><th>Source</th><th>Load</th><th>Stage</th><th>Knockout</th><th>Scorecard</th><th>Class</th><th>Next Action</th><th>Owner</th></tr></thead>
        <tbody>${rows || '<tr class="no-link"><td colspan="11" class="muted">No opportunities match.</td></tr>'}</tbody>
      </table>
    </div>`;
  const qEl = document.getElementById('pipe-q');
  if (q) { qEl.focus(); qEl.setSelectionRange(q.length, q.length); }
}

// ===========================================================================
// PAGE: Intake (New Opportunity)
// ===========================================================================
function opts(list, sel) { return list.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join(''); }

function renderIntake() {
  const finderOpts = STATE.finders.map(f => `<option value="${f.id}">${esc(f.name)} — ${esc((FINDER_TYPES.find(t => t.key === f.type) || {}).label || f.type)}</option>`).join('');
  document.getElementById('app').innerHTML = `
    <div class="page-head">
      <div><h1>Register New Opportunity</h1>
      <p class="muted">Information-gathering at origination. Fields marked <span class="badge blue">suggested</span> go beyond the current DEL intake — added per industry standards so screening and scoring need no second data pass. <span class="req">*</span> = required to log the lead.</p></div>
    </div>
    <form id="intake-form" onsubmit="return submitIntake(event)">
    <div class="grid cols-2">
    <div>
      <fieldset><legend>1 · Identity</legend>
        <div class="field"><label>Opportunity name <span class="req">*</span></label><input name="name" required placeholder="e.g. Harbour View Mall — Embedded Power"></div>
        <div class="grid cols-2">
          <div class="field"><label>Customer / counterparty <span class="req">*</span></label><input name="customer" required></div>
          <div class="field"><label>Counterparty class</label><select name="counterpartyClass">${opts(COUNTERPARTY_CLASSES)}</select></div>
          <div class="field"><label>Business line <span class="req">*</span></label><select name="businessLine">${opts(BUSINESS_LINES)}</select></div>
          <div class="field"><label>Sub-sector</label><select name="subSector">${opts(SUB_SECTORS)}</select></div>
          <div class="field"><label>Opportunity type</label><select name="oppType">${opts(OPP_TYPES)}</select></div>
          <div class="field"><label>Procurement route</label><select name="procurement">${opts(PROCUREMENT)}</select></div>
          <div class="field"><label>Sponsor</label><input name="sponsor"></div>
          <div class="field"><label>Sponsor operating years</label><input name="sponsorYears" type="number" min="0"></div>
        </div>
      </fieldset>
      <fieldset><legend>2 · Source & Attribution</legend>
        <div class="grid cols-2">
          <div class="field"><label>Source <span class="req">*</span></label>
            <select name="source" onchange="document.getElementById('finder-row').classList.toggle('hidden', !this.value.startsWith('Sales Agent'))">${opts(SOURCES)}</select></div>
          <div class="field hidden" id="finder-row"><label>Registered finder / agent <span class="req">*</span></label>
            <select name="finderId"><option value="">— select —</option>${finderOpts}</select>
            <div class="hint">Register-first rule: the lead must be logged against a registered finder before any fee claim exists.</div></div>
        </div>
        <div class="callout" style="margin:4px 0 10px">Logging this form creates the opportunity record, assigns the Opportunity ID, and (for agent-sourced leads) opens the finder’s 90-day protection window.</div>
      </fieldset>
      <fieldset><legend>3 · Location & Site <span class="badge blue" style="vertical-align:2px">expanded</span></legend>
        <div class="grid cols-2">
          <div class="field"><label>State <span class="req">*</span></label><select name="state">${opts(NIGERIAN_STATES)}</select></div>
          <div class="field"><label>LGA</label><input name="lga"></div>
          <div class="field"><label>Grid node / Disco franchise</label><input name="gridNode" placeholder="e.g. Eko Disco — Lekki feeder"></div>
          <div class="field"><label>Site address / coordinates <span class="sugg">suggested</span></label><input name="siteAddress" placeholder="Street address or lat, long"></div>
        </div>
      </fieldset>
      <fieldset><legend>4 · Customer Contact <span class="badge blue" style="vertical-align:2px">expanded</span></legend>
        <div class="grid cols-2">
          <div class="field"><label>Primary contact name <span class="sugg">suggested</span></label><input name="contactName"></div>
          <div class="field"><label>Role / title</label><input name="contactRole"></div>
          <div class="field"><label>Phone</label><input name="contactPhone"></div>
          <div class="field"><label>Email</label><input name="contactEmail" type="email"></div>
          <div class="field"><label>Decision maker (if different) <span class="sugg">suggested</span></label><input name="decisionMaker"></div>
          <div class="field"><label>Buying process <span class="sugg">suggested</span></label><input name="buyingProcess" placeholder="e.g. Board approval; procurement committee"></div>
        </div>
      </fieldset>
    </div>
    <div>
      <fieldset><legend>5 · Demand & Current Supply <span class="badge blue" style="vertical-align:2px">expanded</span></legend>
        <div class="grid cols-2">
          <div class="field"><label>Estimated load / demand (kW) <span class="req">*</span></label><input name="loadKw" type="number" min="0" required>
            <div class="hint">Finder-sourced leads: minimum ~200–300 kW per site or cluster.</div></div>
          <div class="field"><label>Current supply arrangement <span class="sugg">suggested</span></label><input name="currentSupply" placeholder="e.g. Disco + 2×500 kVA diesel"></div>
          <div class="field"><label>Current effective tariff (₦/kWh) <span class="sugg">suggested</span></label><input name="currentTariffNgn" type="number" min="0"></div>
          <div class="field"><label>Monthly energy spend (₦) <span class="sugg">suggested</span></label><input name="monthlySpendNgn" type="number" min="0"></div>
          <div class="field"><label>Load profile <span class="sugg">suggested</span></label><input name="loadProfile" placeholder="e.g. 24/7 baseload; evening peak"></div>
          <div class="field"><label>Metering / consumption data available?</label><select name="meteringData"><option>None — estimates only</option><option>Utility/diesel bills</option><option>Partial metered data</option><option>Full metered history</option></select>
            <div class="hint">Feeds Gate 01 (Demand) directly.</div></div>
        </div>
      </fieldset>
      <fieldset><legend>6 · Indicative Economics</legend>
        <div class="grid cols-2">
          <div class="field"><label>Est. project cost (US$m)</label><input name="capexUsdM" type="number" step="0.05" min="0"></div>
          <div class="field"><label>Proposed capacity (kW)</label><input name="capacityKw" type="number" min="0"></div>
          <div class="field"><label>Proposed tariff (₦/kWh)</label><input name="tariffNgnKwh" type="number" min="0"></div>
          <div class="field"><label>Contract tenor (years)</label><input name="tenorYears" type="number" min="0"></div>
          <div class="field"><label>Est. revenue (₦/yr) <span class="sugg">suggested</span></label><input name="revenueNgnYr" type="number" min="0"></div>
          <div class="field"><label>Capital structure (D:E)</label><input name="debtEquity" placeholder="e.g. 60:40"></div>
          <div class="field"><label>EBITDA margin (%)</label><input name="ebitdaPct" type="number" min="0" max="100"></div>
          <div class="field"><label>Indicative equity IRR (%) <span class="sugg">suggested</span></label><input name="irrPct" type="number" min="0"></div>
        </div>
      </fieldset>
      <fieldset><legend>7 · Qualification <span class="badge blue" style="vertical-align:2px">expanded</span></legend>
        <div class="grid cols-2">
          <div class="field"><label>Expected close date <span class="sugg">suggested</span></label><input name="expectedClose" type="date"></div>
          <div class="field"><label>Probability of conversion (%)</label><input name="probability" type="number" min="0" max="100" value="10"></div>
          <div class="field"><label>Competition <span class="sugg">suggested</span></label><input name="competition" placeholder="Known competing suppliers / bids"></div>
          <div class="field"><label>Owner <span class="req">*</span></label><select name="owner"><option>BD Team</option><option>Temitope</option><option>Damilare</option><option>Abdullateef</option><option>Mide (Commercial Manager)</option><option>Investment & Commercial Team</option></select></div>
        </div>
        <div class="field"><label>Key risks / notes</label><textarea name="risks" rows="2"></textarea></div>
      </fieldset>
      <div class="card tight" style="display:flex;gap:12px;align-items:center;justify-content:flex-end">
        <span class="muted">On save: Opportunity ID assigned · lead logged · knockout screening unlocked.</span>
        <button type="submit" class="btn green">Register & Log Opportunity</button>
      </div>
    </div>
    </div>
    </form>`;
}

function submitIntake(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const v = n => (f.get(n) || '').toString().trim();
  const num = n => parseFloat(v(n)) || 0;
  if (v('source').startsWith('Sales Agent') && !v('finderId')) { toast('Select the registered finder — register-first rule.'); return false; }
  const id = nextOppId();
  const opp = {
    id, name: v('name'), customer: v('customer'),
    businessLine: v('businessLine'), oppType: v('oppType'), procurement: v('procurement'), subSector: v('subSector'),
    counterpartyClass: v('counterpartyClass'), source: v('source'), finderId: v('finderId'),
    location: { state: v('state'), lga: v('lga'), gridNode: v('gridNode'), siteAddress: v('siteAddress') },
    sponsor: v('sponsor'), sponsorYears: num('sponsorYears'),
    contact: { name: v('contactName'), role: v('contactRole'), phone: v('contactPhone'), email: v('contactEmail'), decisionMaker: v('decisionMaker'), buyingProcess: v('buyingProcess') },
    demand: { loadKw: num('loadKw'), currentSupply: v('currentSupply'), currentTariffNgn: num('currentTariffNgn'), monthlySpendNgn: num('monthlySpendNgn'), loadProfile: v('loadProfile'), meteringData: v('meteringData') },
    economics: { capexUsdM: num('capexUsdM'), capacityKw: num('capacityKw'), tariffNgnKwh: num('tariffNgnKwh'), tenorYears: num('tenorYears'), revenueNgnYr: num('revenueNgnYr'), debtEquity: v('debtEquity'), ebitdaPct: num('ebitdaPct'), irrPct: num('irrPct'), paybackYears: 0 },
    qualification: { expectedClose: v('expectedClose'), probability: num('probability'), competition: v('competition'), risks: v('risks') },
    stage: 'lead_logged', classification: 'ACTIVE', reviewDate: '',
    owner: v('owner'), nextAction: 'Run knockout screening',
    knockout: { gates: {}, outcome: null, conditions: '', declineReason: '', finalized: null },
    scorecard: { scores: {}, comments: '' }, mgmtDecision: null,
    development: { nda_data: false, site_recon: false, energy_audit: false, tech_review: false, boundary_scoring: false },
    convert: { proposalSent: false, negotiationDone: false, excoApproved: false, contractType: '', contractSigned: false, handoverDone: false },
    operate: { kyc: false, onboarding: false, milestones: {}, cod: false, revenueStatus: '', contractStart: '', contractExpiry: '', tariffReviewDate: '' },
    dates: { received: today(), logged: today() },
    log: [{ ts: today(), actor: v('owner'), action: 'Lead received and registered as ' + id + (v('finderId') ? ' — finder protection window opened (90 days)' : '') }],
  };
  STATE.opportunities.push(opp);
  const finder = STATE.finders.find(x => x.id === v('finderId'));
  if (finder) finder.submissions.push(id);
  saveState();
  location.href = 'opportunity.html?id=' + id;
  return false;
}

// ===========================================================================
// PAGE: Opportunity workspace (end-to-end)
// ===========================================================================
function currentOpp() {
  const id = new URLSearchParams(location.search).get('id');
  return getOpp(id);
}
function mutateOpp(fn, logActor, logAction, toastMsg) {
  const opp = currentOpp();
  fn(opp);
  if (logAction) addLog(opp, logActor || 'You (demo user)', logAction);
  saveState();
  renderOpportunity();
  if (toastMsg) toast(toastMsg);
}

function renderOpportunity() {
  const opp = currentOpp();
  if (!opp) { document.getElementById('app').innerHTML = '<div class="card">Opportunity not found. <a href="pipeline.html">Back to pipeline</a>.</div>'; return; }
  const sc = computeScore(opp);
  const ko = opp.knockout;
  const isDead = opp.classification === 'REJECTED';
  const finder = STATE.finders.find(f => f.id === opp.finderId);

  // ---- stepper -------------------------------------------------------------
  const curPhase = stagePhase(opp.stage);
  const phaseIdx = PHASES.findIndex(p => p.key === curPhase);
  const stepper = `<div class="stepper">${PHASES.map((p, i) => {
    const cls = isDead && i >= phaseIdx ? 'dead' : i < phaseIdx ? 'done' : i === phaseIdx ? 'current' : '';
    return `<div class="step ${cls}"><div class="ph">${p.label}</div><div class="st">${i === phaseIdx ? esc(stageLabel(opp.stage)) : i < phaseIdx ? '✓ complete' : ''}</div></div>`;
  }).join('')}</div>`;

  // ---- section: knockout -----------------------------------------------------
  const gateRows = KNOCKOUT_GATES.map(g => {
    const r = ko.gates[g.num] || { verdict: '', notes: '' };
    return `<div class="gate-row v-${r.verdict}">
      <div class="gate-num">0${g.num}</div>
      <div><b>${esc(g.name)}</b><br><small class="muted">${esc(g.pass)}</small><br><small class="muted"><b>Evidence:</b> ${esc(g.evidence)}</small></div>
      <div><textarea rows="2" placeholder="Evidence / basis for verdict…" onchange="setGate(${g.num},'notes',this.value)">${esc(r.notes)}</textarea></div>
      <div><select onchange="setGate(${g.num},'verdict',this.value)">
        <option value="">— verdict —</option>
        <option ${r.verdict === 'PASS' ? 'selected' : ''} value="PASS">PASS</option>
        <option ${r.verdict === 'CONDITIONAL' ? 'selected' : ''} value="CONDITIONAL">CONDITIONAL PASS</option>
        <option ${r.verdict === 'FAIL' ? 'selected' : ''} value="FAIL">FAIL</option>
      </select></div>
    </div>`;
  }).join('');
  const koPreview = computeKnockout(ko.gates);
  let koBanner = '';
  if (ko.outcome === 'PASS') koBanner = `<div class="verdict-banner go">✔ Screening PASSED (finalised ${ko.finalized}) — all five gates cleared. Advance to development.</div>`;
  else if (ko.outcome === 'CONDITIONAL') koBanner = `<div class="verdict-banner cond">◐ CONDITIONAL GO (finalised ${ko.finalized}) — advances flagged. Conditions to resolve before commitment:<br><small>${esc(ko.conditions || '—')}</small></div>`;
  else if (ko.outcome === 'NO_GO') koBanner = `<div class="verdict-banner nogo">✖ NO-GO (finalised ${ko.finalized}) — one or more gates FAILED. Rationale logged; decline letter issued.<br><small>${esc(ko.declineReason)}</small></div>`;
  const knockoutCard = `
    <div class="card" id="sec-knockout">
      <div class="card-title"><h2>⛩ Gate 1 — Knockout Screening (Stage 1)</h2>
        <span class="muted">Any FAIL → automatic NO-GO · target 1–2 days from intake</span></div>
      ${gateRows}
      ${!ko.outcome ? `
      <div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">
        <button class="btn navy" ${koPreview ? '' : 'disabled'} onclick="finalizeKnockout()">Finalise Screening${koPreview ? ' → ' + (koPreview === 'NO_GO' ? 'NO-GO' : koPreview === 'CONDITIONAL' ? 'Conditional Go' : 'Pass') : ''}</button>
        ${koPreview ? '' : '<span class="muted">Record a verdict on all five gates to finalise.</span>'}
      </div>` : koBanner}
      ${ko.outcome ? `<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn ghost sm" onclick="showMemo()">📄 View Screening Memo</button>
        ${ko.outcome === 'NO_GO' ? '<button class="btn danger sm" onclick="showDecline()">📄 View Decline Letter</button>' : ''}
        <button class="btn ghost sm" onclick="reopenKnockout()">↺ Re-assess gates</button>
      </div>` : ''}
    </div>`;

  // ---- section: classification -----------------------------------------------
  const reviewDue = (opp.classification === 'NURTURE' || opp.classification === 'DEFERRED') && opp.reviewDate && opp.reviewDate <= today();
  const classificationCard = (ko.outcome && ko.outcome !== 'NO_GO') ? `
    <div class="card">
      <div class="card-title"><h2>Pipeline Classification</h2><span>${classBadge(opp.classification)}</span></div>
      <p class="muted">Passed screening — decide how the pipeline treats it. Parked items get a periodic review date (suggested cadence: quarterly).</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn ${opp.classification === 'ACTIVE' ? 'primary' : 'ghost'}" onclick="classify('ACTIVE')">Active — progress now</button>
        <button class="btn ${opp.classification === 'NURTURE' ? 'primary' : 'ghost'}" onclick="classify('NURTURE')">Nurture (park + review)</button>
        <button class="btn ${opp.classification === 'DEFERRED' ? 'primary' : 'ghost'}" onclick="classify('DEFERRED')">Deferred (external blocker)</button>
        <button class="btn danger" onclick="dropOpp()">Drop</button>
      </div>
      ${(opp.classification === 'NURTURE' || opp.classification === 'DEFERRED') ? `
        <div class="field" style="max-width:280px;margin-top:12px"><label>Periodic review date</label>
          <input type="date" value="${opp.reviewDate}" onchange="mutateOpp(o=>o.reviewDate=this.value,null,'Review date set to '+this.value)"></div>` : ''}
      ${reviewDue ? `<div class="callout amber"><b>Periodic review due.</b> Decide:
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn sm green" onclick="classify('ACTIVE')">Activate</button>
          <button class="btn sm ghost" onclick="keepParked()">Keep parked (+90 days)</button>
          <button class="btn sm danger" onclick="dropOpp()">Drop</button>
        </div></div>` : ''}
    </div>` : '';

  // ---- section: development checklist ------------------------------------------
  const devSteps = [
    { k: 'nda_data', label: 'NDA / MoU signed + Data Request issued', owner: 'JOINT', stage: 'nda_data' },
    { k: 'site_recon', label: 'Site Reconnaissance completed', owner: 'JOINT', stage: 'site_recon' },
    { k: 'energy_audit', label: 'Energy Audit completed', owner: 'DEL', stage: 'energy_audit' },
    { k: 'tech_review', label: 'Technical Review + Indicative Solution & Tariff issued', owner: 'DEL', stage: 'tech_review' },
  ];
  const devDone = devSteps.every(s => opp.development[s.k]);
  const developmentCard = (ko.outcome && ko.outcome !== 'NO_GO' && opp.classification === 'ACTIVE') ? `
    <div class="card">
      <div class="card-title"><h2>Development Steps</h2><span class="muted">${devSteps.filter(s => opp.development[s.k]).length}/${devSteps.length} complete</span></div>
      ${devSteps.map(s => `
        <div class="check-item ${opp.development[s.k] ? 'done' : ''}">
          <div class="tick">${opp.development[s.k] ? '✓' : ''}</div>
          <div class="ci-body"><b>${esc(s.label)}</b> ${ownerChip(s.owner)}</div>
          <button class="btn sm ${opp.development[s.k] ? 'ghost' : 'primary'}" onclick="toggleDev('${s.k}','${esc(s.label)}')">${opp.development[s.k] ? 'Undo' : 'Mark done'}</button>
        </div>`).join('')}
      ${devDone && !sc.complete ? '<div class="callout green">All development steps complete — finalise the Stage 2 pillar scorecard (above) and submit to Management.</div>' : ''}
    </div>` : '';

  // ---- section: the five pillars — weightings & scoring mechanics -----------------
  // Per the Screening Framework, this follows the knockout gates directly.
  const totalSubs = PILLARS.reduce((n, p) => n + p.subs.length, 0);
  const mechanicsHtml = `
      <div class="tbl-wrap" style="box-shadow:none;margin-bottom:12px"><table>
        <thead><tr><th></th><th>Pillar</th><th style="text-align:right">Weight</th><th>Sub-criteria</th><th>Pillar minimum</th><th>Weighted contribution</th></tr></thead>
        <tbody>
          ${PILLARS.map(p => `<tr class="no-link">
            <td><span class="pillar-key">${p.key}</span></td>
            <td><b>${esc(p.name)}</b></td>
            <td style="text-align:right"><b>${p.weight}%</b></td>
            <td>${p.subs.length} × graded 1–5</td>
            <td>≥ ${p.threshold} of ${p.subs.length * 5}</td>
            <td><small class="muted">(raw ÷ ${p.subs.length * 5}) × ${p.weight}</small></td>
          </tr>`).join('')}
          <tr class="no-link" style="background:var(--bg)">
            <td></td><td><b>Total</b></td><td style="text-align:right"><b>100%</b></td>
            <td><b>${totalSubs} sub-criteria</b></td><td></td><td><b>Weighted total 0–100</b></td>
          </tr>
        </tbody>
      </table></div>
      <div class="callout">
        <b>Scoring mechanics</b><br>
        <small>1 · Every sub-criterion is graded against its defined bands: <b>1</b> = deal-breaker weakness · <b>3</b> = acceptable / mitigable · <b>5</b> = fully de-risked (2 and 4 as intermediates).<br>
        2 · Each pillar's <b>raw sum</b> must clear its minimum (e.g. Commercial ≥ 15 of 25); a shortfall is flagged to the committee even if the total is high.<br>
        3 · <b>Weighted total</b> = Σ (pillar raw ÷ pillar max) × pillar weight, out of 100.<br>
        4 · Verdict bands: <b style="color:var(--del-green)">≥ ${SCORE_BANDS.GO}% GO</b> · <b style="color:var(--amber)">${SCORE_BANDS.CONDITIONAL}–${SCORE_BANDS.GO - 1}% CONDITIONAL GO</b> · <b style="color:var(--red)">&lt; ${SCORE_BANDS.CONDITIONAL}% NO-GO</b> — a framework <i>recommendation</i>; the binding decision is taken at Gate 2 with a documented rationale.</small>
      </div>`;

  // ---- section: scorecard --------------------------------------------------------
  const scoringUnlocked = ko.outcome && ko.outcome !== 'NO_GO';
  const pillarBlocks = sc.pillars.map(p => `
    <div class="pillar">
      <div class="pillar-head"><span class="pillar-key">${p.key}</span><b>${esc(p.name)}</b>
        <small class="muted">min ${p.threshold}/${p.max}</small>
        ${p.belowThreshold ? '<span class="badge red">below pillar minimum</span>' : ''}
        <span class="pw">${p.weight}% · ${p.done ? p.contribution.toFixed(1) + ' pts' : '—'}</span></div>
      ${p.subs.map(s => {
        const cur = opp.scorecard.scores[s.id] || 0;
        return `<div class="sub-row">
          <div><b>${esc(s.name)}</b>${s.note ? ` <small class="muted">ⓘ ${esc(s.note)}</small>` : ''}</div>
          <div class="score-btns">${[1, 2, 3, 4, 5].map(n =>
            `<button class="${cur === n ? 'sel-' + n : ''}" title="${esc(s.bands[n] || (n === 2 ? 'Between: ' + s.bands[1] + ' / ' + s.bands[3] : n === 4 ? 'Between: ' + s.bands[3] + ' / ' + s.bands[5] : ''))}" onclick="setScore('${s.id}',${n})">${n}</button>`).join('')}</div>
          <small class="muted">${esc(cur ? (s.bands[cur] || 'Between bands') : '1 = ' + s.bands[1] + ' · 5 = ' + s.bands[5])}</small>
        </div>`;
      }).join('')}
    </div>`).join('');
  const gaugeColor = !sc.complete ? '#B9C6D8' : sc.verdict === 'GO' ? 'var(--del-green)' : sc.verdict === 'CONDITIONAL' ? 'var(--amber)' : 'var(--red)';
  const scorecardCard = scoringUnlocked ? `
    <div class="card">
      <div class="card-title"><h2>Stage 2 — The Five Pillars: Weighted Scorecard</h2>
        <span class="muted">Commercial Boundary Analysis · 1 = deal-breaker · 5 = fully de-risked</span></div>
      <details class="mech"${sc.complete || Object.keys(opp.scorecard.scores).length ? '' : ' open'}>
        <summary>Weightings & scoring mechanics</summary>
        ${mechanicsHtml}
      </details>
      <div class="total-gauge" style="margin-bottom:6px">
        <div style="min-width:150px"><span style="font-size:1.9rem;font-weight:800;color:${gaugeColor}">${sc.complete ? sc.total + '%' : '—'}</span><br>
          <small class="muted">${sc.complete ? (sc.verdict === 'GO' ? 'GO (≥' + SCORE_BANDS.GO + '%)' : sc.verdict === 'CONDITIONAL' ? 'CONDITIONAL GO (' + SCORE_BANDS.CONDITIONAL + '–' + (SCORE_BANDS.GO - 1) + '%)' : 'NO-GO (<' + SCORE_BANDS.CONDITIONAL + '%)') : 'score all sub-criteria'}</small></div>
        <div style="flex:1">
          <div class="gauge-bar"><div class="gauge-fill" style="width:${sc.total}%;background:${gaugeColor}"></div></div>
          <div class="gauge-marks"><span style="position:absolute;left:${SCORE_BANDS.CONDITIONAL}%">▲ ${SCORE_BANDS.CONDITIONAL} conditional</span><span style="position:absolute;left:${SCORE_BANDS.GO}%">▲ ${SCORE_BANDS.GO} go</span></div>
        </div>
      </div>
      ${pillarBlocks}
      <div class="field"><label>Assessor commentary</label>
        <textarea rows="2" onchange="mutateOpp(o=>o.scorecard.comments=this.value)">${esc(opp.scorecard.comments)}</textarea></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn ghost" ${sc.complete ? '' : 'disabled'} onclick="showScoreMemo()">📄 Scorecard Summary</button>
        ${!opp.mgmtDecision ? `<button class="btn navy" ${sc.complete ? '' : 'disabled'} onclick="submitToMgmt()">Submit to Management (Gate 2) →</button>` : ''}
      </div>
    </div>` : !ko.outcome ? `
    <div class="card" style="border:1px dashed var(--line)">
      <div class="card-title"><h2>Stage 2 — The Five Pillars: Weightings & Scoring Mechanics</h2>
        <span class="badge grey">🔒 Unlocks after Gate 1</span></div>
      <p class="muted">Opportunities that clear (or conditionally clear) the knockout gates above are scored on five weighted pillars. Finalise the screening to begin scoring — a NO-GO ends the process here.</p>
      ${mechanicsHtml}
    </div>` : '';

  // ---- section: management decision (Gate 2) ----------------------------------------
  const mgmtCard = (opp.stage === 'mgmt_approval' || opp.mgmtDecision) ? `
    <div class="card">
      <div class="card-title"><h2>⛩ Gate 2 — Management Approval</h2>
        ${opp.mgmtDecision ? verdictBadge(opp.mgmtDecision.decision) : '<span class="badge amber">Awaiting decision</span>'}</div>
      ${sc.complete ? `<p class="muted">Framework recommendation from the scorecard: <b>${sc.total}% → ${sc.verdict === 'NO_GO' ? 'NO-GO' : sc.verdict}</b>. The committee may override with a documented rationale.</p>` : ''}
      ${opp.mgmtDecision ? `
        <div class="verdict-banner ${opp.mgmtDecision.decision === 'GO' ? 'go' : opp.mgmtDecision.decision === 'CONDITIONAL' ? 'cond' : 'nogo'}">
          <b>${opp.mgmtDecision.decision === 'NO_GO' ? 'NO-GO' : opp.mgmtDecision.decision}</b> — ${esc(opp.mgmtDecision.by)}, ${opp.mgmtDecision.date}<br>
          <small>${esc(opp.mgmtDecision.rationale)}</small></div>` : `
        <div class="field"><label>Decision rationale (required — goes to the audit trail)</label>
          <textarea id="mgmt-rationale" rows="2" placeholder="Basis for the committee's decision…"></textarea></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn green" onclick="decideMgmt('GO')">GO — advance to proposal</button>
          <button class="btn ghost" onclick="decideMgmt('CONDITIONAL')">CONDITIONAL GO</button>
          <button class="btn danger" onclick="decideMgmt('NO_GO')">NO-GO — close</button>
        </div>`}
    </div>` : '';

  // ---- section: convert ---------------------------------------------------------------
  const cv = opp.convert;
  const convertSteps = [
    { k: 'proposalSent', label: 'Proposal / Term Sheet issued', owner: 'DEL' },
    { k: 'negotiationDone', label: 'Negotiation concluded (terms agreed)', owner: 'JOINT' },
    { k: 'excoApproved', label: 'EXCO approval to execute', owner: 'DEL' },
    { k: 'contractSigned', label: 'Contract signed (' + (cv.contractType || 'PPA / GSPA') + ')', owner: 'CUSTOMER' },
  ];
  const convertCard = (opp.mgmtDecision && opp.mgmtDecision.decision !== 'NO_GO') ? `
    <div class="card">
      <div class="card-title"><h2>Conversion</h2><span class="muted">Proposal → Negotiation → EXCO → Signing</span></div>
      <div class="field" style="max-width:280px"><label>Contract type</label>
        <select onchange="mutateOpp(o=>o.convert.contractType=this.value,null,'Contract type set: '+this.value)">
          <option value="">— select —</option>${CONTRACT_TYPES.map(c => `<option ${cv.contractType === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      ${convertSteps.map((s, i) => {
        const prevDone = i === 0 || cv[convertSteps[i - 1].k];
        return `<div class="check-item ${cv[s.k] ? 'done' : ''}">
          <div class="tick">${cv[s.k] ? '✓' : ''}</div>
          <div class="ci-body"><b>${esc(s.label)}</b> ${ownerChip(s.owner)}</div>
          <button class="btn sm ${cv[s.k] ? 'ghost' : 'primary'}" ${prevDone || cv[s.k] ? '' : 'disabled'} onclick="toggleConvert('${s.k}','${esc(s.label)}')">${cv[s.k] ? 'Undo' : 'Mark done'}</button>
        </div>`;
      }).join('')}
      ${cv.contractSigned && !cv.handoverDone ? `
        <div class="callout green"><b>Contract signed — handover point.</b> At signing, ownership moves from Business Development to <b>Commercial Operations</b> with a handover pack (contract, tariff schedule, KYC file, metering plan, contacts).
        <div style="margin-top:8px"><button class="btn green sm" onclick="doHandover()">Complete handover to Commercial Ops</button></div></div>` : ''}
      ${cv.handoverDone ? '<div class="verdict-banner go">✔ Handed over to Commercial Operations. Opportunity classified CONVERTED.</div>' : ''}
    </div>` : '';

  // ---- section: operate ------------------------------------------------------------------
  const op = opp.operate;
  const milestonesDone = IMPL_MILESTONES.every(m => op.milestones[m.key]);
  const operateCard = cv.handoverDone ? `
    <div class="card">
      <div class="card-title"><h2>Operate — Onboarding, Implementation & Revenue</h2>
        ${op.cod ? '<span class="badge green">COD · Revenue Generating</span>' : '<span class="badge blue">Pre-COD</span>'}</div>
      <div class="grid cols-2">
        <div>
          <h3>KYC & Onboarding</h3>
          <div class="check-item ${op.kyc ? 'done' : ''}"><div class="tick">${op.kyc ? '✓' : ''}</div><div class="ci-body"><b>KYC complete</b> ${ownerChip('CUSTOMER')}</div>
            <button class="btn sm ${op.kyc ? 'ghost' : 'primary'}" onclick="mutateOpp(o=>o.operate.kyc=!o.operate.kyc,null,'KYC ${op.kyc ? 're-opened' : 'completed'}')">${op.kyc ? 'Undo' : 'Done'}</button></div>
          <div class="check-item ${op.onboarding ? 'done' : ''}"><div class="tick">${op.onboarding ? '✓' : ''}</div><div class="ci-body"><b>Customer onboarding complete</b> ${ownerChip('JOINT')}</div>
            <button class="btn sm ${op.onboarding ? 'ghost' : 'primary'}" onclick="mutateOpp(o=>o.operate.onboarding=!o.operate.onboarding,null,'Onboarding ${op.onboarding ? 're-opened' : 'completed'}')">${op.onboarding ? 'Undo' : 'Done'}</button></div>
          <h3 style="margin-top:14px">Contract & Tariff</h3>
          <div class="grid cols-2">
            <div class="field"><label>Contract start</label><input type="date" value="${op.contractStart}" onchange="mutateOpp(o=>o.operate.contractStart=this.value)"></div>
            <div class="field"><label>Contract expiry</label><input type="date" value="${op.contractExpiry}" onchange="mutateOpp(o=>o.operate.contractExpiry=this.value)"></div>
            <div class="field"><label>Next tariff review</label><input type="date" value="${op.tariffReviewDate}" onchange="mutateOpp(o=>o.operate.tariffReviewDate=this.value)"></div>
          </div>
        </div>
        <div>
          <h3>Implementation — ⛩ Gate 3: COD Readiness</h3>
          ${IMPL_MILESTONES.map(m => `
            <div class="check-item ${op.milestones[m.key] ? 'done' : ''}">
              <div class="tick">${op.milestones[m.key] ? '✓' : ''}</div>
              <div class="ci-body"><b>${esc(m.label)}</b></div>
              <button class="btn sm ${op.milestones[m.key] ? 'ghost' : 'primary'}" onclick="toggleMilestone('${m.key}','${esc(m.label)}')">${op.milestones[m.key] ? 'Undo' : 'Done'}</button>
            </div>`).join('')}
          ${!op.cod ? `<button class="btn green" style="margin-top:10px" ${milestonesDone ? '' : 'disabled'} onclick="declareCOD()">Declare COD — start revenue generation</button>
            ${milestonesDone ? '' : '<div class="hint">All Gate 3 milestones must be complete before COD.</div>'}` :
      `<div class="verdict-banner go" style="margin-top:10px">✔ Commercial Operations Date achieved. Revenue status: <b>${esc(op.revenueStatus || 'On Track')}</b></div>`}
        </div>
      </div>
    </div>` : '';

  // ---- right rail --------------------------------------------------------------------------
  const facts = `
    <div class="card tight">
      <h3>Key Facts</h3>
      <table style="font-size:.85rem"><tbody>
        <tr class="no-link"><td class="muted">Customer</td><td><b>${esc(opp.customer)}</b></td></tr>
        <tr class="no-link"><td class="muted">Line / type</td><td>${esc(opp.businessLine)} · ${esc(opp.subSector)}</td></tr>
        <tr class="no-link"><td class="muted">Procurement</td><td>${esc(opp.procurement)}</td></tr>
        <tr class="no-link"><td class="muted">Location</td><td>${esc(opp.location.state)}${opp.location.lga ? ' · ' + esc(opp.location.lga) : ''}<br><small class="muted">${esc(opp.location.gridNode || '')}</small></td></tr>
        <tr class="no-link"><td class="muted">Load / capacity</td><td>${kw(opp.demand.loadKw)} → ${kw(opp.economics.capacityKw)}</td></tr>
        <tr class="no-link"><td class="muted">Current spend</td><td>${ngn(opp.demand.monthlySpendNgn)}/mo</td></tr>
        <tr class="no-link"><td class="muted">Capex</td><td>${opp.economics.capexUsdM ? 'US$' + opp.economics.capexUsdM + 'm' : '—'}</td></tr>
        <tr class="no-link"><td class="muted">Tariff / tenor</td><td>${opp.economics.tariffNgnKwh ? '₦' + opp.economics.tariffNgnKwh + '/kWh' : '—'} · ${opp.economics.tenorYears ? opp.economics.tenorYears + ' yrs' : '—'}</td></tr>
        <tr class="no-link"><td class="muted">IRR / EBITDA</td><td>${opp.economics.irrPct ? opp.economics.irrPct + '%' : '—'} · ${opp.economics.ebitdaPct ? opp.economics.ebitdaPct + '%' : '—'}</td></tr>
        <tr class="no-link"><td class="muted">Probability</td><td>${opp.qualification.probability || 0}% · close ${esc(opp.qualification.expectedClose || '—')}</td></tr>
        <tr class="no-link"><td class="muted">Owner</td><td>${esc(opp.owner)}</td></tr>
      </tbody></table>
    </div>
    ${finder ? `<div class="card tight callout" style="border-left:4px solid var(--del-green)">
      <h3 style="margin-bottom:4px">Finder Attribution</h3>
      <b>${esc(finder.name)}</b> — ${esc((FINDER_TYPES.find(t => t.key === finder.type) || {}).label || '')}<br>
      <small class="muted">Registered ${finder.registered} · NDA ${finder.nda ? '✓ signed' : '✖ outstanding'} · success fee payable only on conversion. DEL retains pricing & negotiation.</small>
    </div>` : ''}
    <div class="card tight">
      <h3>Contact</h3>
      <b>${esc(opp.contact.name || '—')}</b><br><small class="muted">${esc(opp.contact.role || '')}</small><br>
      <small>${esc(opp.contact.phone || '')}${opp.contact.email ? ' · ' + esc(opp.contact.email) : ''}</small>
    </div>
    <div class="card tight">
      <h3>Activity Log <small class="muted">(append-only)</small></h3>
      <ul class="timeline">${opp.log.slice().reverse().map(l => `<li><span class="ts">${l.ts} — ${esc(l.actor)}</span><br>${esc(l.action)}</li>`).join('')}</ul>
    </div>`;

  document.getElementById('app').innerHTML = `
    <div class="page-head">
      <div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <h1 style="margin:0">${esc(opp.name)}</h1>
          <span class="badge navy">${opp.id}</span>${classBadge(opp.classification)}
          ${ko.outcome ? verdictBadge(ko.outcome === 'PASS' ? 'PASS' : ko.outcome) : ''}
          ${opp.mgmtDecision ? verdictBadge(opp.mgmtDecision.decision) : ''}
        </div>
        <p class="muted" style="margin-top:4px">Received ${opp.dates.received} · logged ${opp.dates.logged} · source: ${esc(opp.source)} · <b>Next:</b> ${esc(opp.nextAction || '—')}</p>
      </div>
      <a class="btn ghost" href="pipeline.html">← Pipeline</a>
    </div>
    ${stepper}
    <div class="grid" style="grid-template-columns:2fr 1fr;align-items:start">
      <div style="display:grid;gap:16px">
        ${knockoutCard}
        ${scorecardCard}
        ${classificationCard}
        ${developmentCard}
        ${mgmtCard}
        ${convertCard}
        ${operateCard}
      </div>
      <div style="display:grid;gap:16px">${facts}</div>
    </div>`;
}

// ---- opportunity actions ----------------------------------------------------
function setGate(num, field, value) {
  mutateOpp(o => {
    o.knockout.gates[num] = o.knockout.gates[num] || { verdict: '', notes: '' };
    o.knockout.gates[num][field] = value;
  });
}
function finalizeKnockout() {
  const opp = currentOpp();
  const outcome = computeKnockout(opp.knockout.gates);
  if (!outcome) return;
  if (outcome === 'NO_GO') {
    const failed = KNOCKOUT_GATES.filter(g => (opp.knockout.gates[g.num] || {}).verdict === 'FAIL');
    const reason = prompt('A gate FAILED → automatic NO-GO.\nA rejection requires a logged rationale (used in the decline letter):',
      failed.map(g => `Gate 0${g.num} (${g.name}): ${(opp.knockout.gates[g.num] || {}).notes || 'failed'}`).join(' · '));
    if (reason === null) return;
    mutateOpp(o => {
      o.knockout.outcome = 'NO_GO'; o.knockout.finalized = today(); o.knockout.declineReason = reason;
      o.classification = 'REJECTED'; o.nextAction = 'Closed — decline letter issued';
    }, 'Commercial Analyst', 'Knockout finalised — ' + failed.map(g => 'Gate 0' + g.num).join(', ') + ' FAIL → automatic NO-GO; decline letter issued', 'NO-GO recorded — decline letter generated');
  } else if (outcome === 'CONDITIONAL') {
    const conditions = prompt('CONDITIONAL PASS — list the conditions to resolve before commitment (semicolon-separated):',
      KNOCKOUT_GATES.filter(g => (opp.knockout.gates[g.num] || {}).verdict === 'CONDITIONAL').map(g => g.name + ': ' + ((opp.knockout.gates[g.num] || {}).notes || 'resolve')).join('; '));
    if (conditions === null) return;
    mutateOpp(o => {
      o.knockout.outcome = 'CONDITIONAL'; o.knockout.finalized = today(); o.knockout.conditions = conditions;
      if (STAGE_INDEX[o.stage] < STAGE_INDEX.classification) o.stage = 'classification';
      o.nextAction = 'Resolve screening conditions; classify and begin development';
    }, 'Commercial Analyst', 'Knockout finalised — CONDITIONAL GO, conditions logged', 'Conditional Go — advance flagged');
  } else {
    mutateOpp(o => {
      o.knockout.outcome = 'PASS'; o.knockout.finalized = today();
      if (STAGE_INDEX[o.stage] < STAGE_INDEX.classification) o.stage = 'classification';
      o.nextAction = 'Classify and begin development (NDA + data request)';
    }, 'Commercial Analyst', 'Knockout screening finalised — all 5 gates PASS', 'Screening passed — all five gates clear');
  }
}
function reopenKnockout() {
  if (!confirm('Re-open the knockout assessment? The previous outcome stays in the activity log.')) return;
  mutateOpp(o => { o.knockout.outcome = null; if (o.classification === 'REJECTED') o.classification = 'ACTIVE'; o.stage = 'knockout'; },
    'Commercial Analyst', 'Knockout re-opened for re-assessment', 'Gates re-opened');
}
function showMemo() { openModal('Screening Memo (auto-generated)', `<div class="doc-preview">${esc(screeningMemoText(currentOpp()))}</div>`); }
function showDecline() { openModal('Decline Letter (auto-generated)', `<div class="doc-preview">${esc(declineLetterText(currentOpp()))}</div>`); }
function showScoreMemo() { openModal('Scorecard Summary (auto-generated)', `<div class="doc-preview">${esc(scorecardMemoText(currentOpp()))}</div>`); }

function classify(cls) {
  mutateOpp(o => {
    o.classification = cls;
    if (cls === 'ACTIVE') { o.reviewDate = ''; if (STAGE_INDEX[o.stage] < STAGE_INDEX.nda_data) { o.stage = 'nda_data'; o.nextAction = 'Sign NDA and issue data request'; } }
    else { const d = new Date(); d.setDate(d.getDate() + 90); o.reviewDate = d.toISOString().slice(0, 10); o.nextAction = 'Parked — periodic review ' + o.reviewDate; }
  }, 'BD Team', 'Classified ' + cls + (cls !== 'ACTIVE' ? ' — periodic review scheduled' : ''), 'Classified ' + cls);
}
function keepParked() {
  mutateOpp(o => { const d = new Date(); d.setDate(d.getDate() + 90); o.reviewDate = d.toISOString().slice(0, 10); },
    'BD Team', 'Periodic review held — kept parked, next review in 90 days', 'Kept parked — next review in 90 days');
}
function dropOpp() {
  const reason = prompt('Dropping requires a logged reason:');
  if (!reason) return;
  mutateOpp(o => { o.classification = 'REJECTED'; o.nextAction = 'Closed — dropped'; },
    'BD Team', 'Dropped from pipeline — ' + reason, 'Opportunity dropped');
}
function toggleDev(key, label) {
  mutateOpp(o => {
    o.development[key] = !o.development[key];
    if (o.development[key]) {
      const order = ['nda_data', 'site_recon', 'energy_audit', 'tech_review'];
      const next = order.find(k => !o.development[k]);
      const target = next || 'boundary_scoring';
      if (STAGE_INDEX[target] > STAGE_INDEX[o.stage]) o.stage = target;
      o.nextAction = next ? 'Complete: ' + stageLabel(next) : 'Finalise pillar scorecard (commercial boundary analysis)';
    }
  }, 'BD Team', (currentOpp().development[key] ? 'Re-opened: ' : 'Completed: ') + label);
}
function setScore(subId, n) {
  mutateOpp(o => {
    o.scorecard.scores[subId] = o.scorecard.scores[subId] === n ? 0 : n;
    if (!o.scorecard.scores[subId]) delete o.scorecard.scores[subId];
    if (STAGE_INDEX[o.stage] < STAGE_INDEX.boundary_scoring) o.stage = 'boundary_scoring';
  });
}
function submitToMgmt() {
  const sc = computeScore(currentOpp());
  mutateOpp(o => { o.stage = 'mgmt_approval'; o.nextAction = 'Awaiting Gate 2 decision (Management Investment Committee)'; },
    'Commercial Analyst', 'Scorecard completed (' + sc.total + '% → ' + (sc.verdict === 'NO_GO' ? 'NO-GO' : sc.verdict) + ' recommendation) — submitted to Management (Gate 2)', 'Submitted to Management');
}
function decideMgmt(decision) {
  const rationale = (document.getElementById('mgmt-rationale') || {}).value || '';
  if (!rationale.trim()) { toast('A decision rationale is required — it goes to the audit trail.'); return; }
  mutateOpp(o => {
    o.mgmtDecision = { decision, rationale, date: today(), by: 'Management Investment Committee' };
    if (decision === 'NO_GO') { o.classification = 'REJECTED'; o.nextAction = 'Closed at Gate 2'; }
    else { o.stage = 'proposal'; o.nextAction = 'Prepare and issue proposal / term sheet'; }
  }, 'Management IC', 'Gate 2 decision: ' + (decision === 'NO_GO' ? 'NO-GO' : decision) + ' — ' + rationale, 'Gate 2 decision recorded');
}
function toggleConvert(key, label) {
  mutateOpp(o => {
    o.convert[key] = !o.convert[key];
    if (o.convert[key]) {
      if (key === 'proposalSent') { o.stage = 'negotiation'; o.nextAction = 'Negotiate terms'; }
      if (key === 'negotiationDone') { o.stage = 'exco'; o.nextAction = 'Obtain EXCO approval to execute'; }
      if (key === 'excoApproved') { o.stage = 'contract'; o.nextAction = 'Execute contract with customer'; }
      if (key === 'contractSigned') { o.nextAction = 'Complete handover to Commercial Operations'; }
    }
  }, key === 'contractSigned' ? 'Customer' : key === 'excoApproved' ? 'EXCO' : 'BD Team',
    (currentOpp().convert[key] ? 'Re-opened: ' : 'Completed: ') + label);
}
function doHandover() {
  mutateOpp(o => {
    o.convert.handoverDone = true; o.classification = 'CONVERTED'; o.stage = 'onboarding';
    o.owner = 'Commercial Ops'; o.nextAction = 'Complete KYC and onboarding';
  }, 'BD Team', 'Handover pack issued — ownership transferred to Commercial Operations', 'Handed over to Commercial Ops');
}
function toggleMilestone(key, label) {
  mutateOpp(o => {
    o.operate.milestones[key] = !o.operate.milestones[key];
    if (STAGE_INDEX[o.stage] < STAGE_INDEX.implementation) o.stage = 'implementation';
  }, 'Commercial Ops', (currentOpp().operate.milestones[key] ? 'Re-opened: ' : 'Milestone completed: ') + label);
}
function declareCOD() {
  mutateOpp(o => {
    o.operate.cod = true; o.operate.revenueStatus = 'On Track'; o.stage = 'revenue';
    o.operate.contractStart = o.operate.contractStart || today();
    o.nextAction = 'Routine monitoring of consumption & billing';
  }, 'Commercial Ops', 'Gate 3 cleared — COD declared, revenue generation started', 'COD declared 🎉');
}

// ===========================================================================
// PAGE: Sales Agents & Finders
// ===========================================================================
function renderAgents() {
  const rows = STATE.finders.map(f => {
    const t = FINDER_TYPES.find(x => x.key === f.type) || {};
    const subs = f.submissions.map(id => {
      const o = getOpp(id);
      return o ? `<a href="opportunity.html?id=${id}">${id}</a> ${o.classification === 'CONVERTED' ? '<span class="badge green">converted — fee due</span>' : classBadge(o.classification)}` : id;
    }).join('<br>') || '<span class="muted">None yet</span>';
    return `<tr class="no-link">
      <td><b>${esc(f.name)}</b><br><small class="muted">${f.id} · registered ${f.registered}</small></td>
      <td><span class="badge blue">${esc(t.label || f.type)}</span></td>
      <td><small>${esc(f.segment)}</small></td>
      <td>${f.nda ? '<span class="badge green">NDA ✓</span>' : '<span class="badge red">NDA outstanding</span>'}</td>
      <td>${subs}</td>
    </tr>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="page-head">
      <div><h1>Sales Agents & Finders</h1>
      <p class="muted">Third-party origination alongside the in-house BD team. A <b>Business Developer</b> is DEL staff owning the full lifecycle; a <b>Sales Agent / finder</b> is an outsourced originator — same intake standards, no pricing/structuring/negotiation authority, paid only on conversion.</p></div>
      <button class="btn primary" onclick="showRegisterFinder()">+ Register Finder / Agent</button>
    </div>
    <div class="grid cols-2" style="align-items:start">
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-title"><h2>Registry</h2></div>
          <div class="tbl-wrap" style="box-shadow:none"><table>
            <thead><tr><th>Finder</th><th>Type</th><th>Territory / Segment</th><th>Compliance</th><th>Submissions</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
        </div>
        <div class="card">
          <div class="card-title"><h2>Submission Flow</h2></div>
          <div class="pmap">${['Agent submits lead', 'DEL registers & logs (before any claim)', 'Knockout evaluation', 'Feedback to agent', 'Success fee on conversion'].map((s, i, a) =>
            `<div class="pcol"><div class="pcol-head" style="background:${['#1068D0', '#0B4FA3', '#083060', '#067A3F', '#00B050'][i]}">Step ${i + 1}</div><div class="pcol-body"><div>${s}</div></div></div>${i < a.length - 1 ? '<div style="align-self:center;color:var(--muted);font-size:1.3rem">→</div>' : ''}`).join('')}
          </div>
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <div class="card">
          <div class="card-title"><h2>Partner Types</h2></div>
          ${FINDER_TYPES.map(t => `<p style="margin:.4em 0"><span class="badge blue">${t.label}</span><br><small class="muted">${esc(t.desc)}</small></p>`).join('')}
        </div>
        <div class="card">
          <div class="card-title"><h2>Governance Rules</h2></div>
          <ol style="padding-left:18px;margin:0">${FINDER_RULES.map(r => `<li style="margin-bottom:8px"><small>${esc(r)}</small></li>`).join('')}</ol>
          <div class="callout amber" style="margin-top:12px"><small><b>To standardise:</b> success-fee bands, protection-window length and non-circumvention tenor are suggested defaults — DEL has not yet fixed them. See the README.</small></div>
        </div>
      </div>
    </div>`;
}
function showRegisterFinder() {
  openModal('Register Finder / Sales Agent', `
    <div class="field"><label>Name / company <span class="req">*</span></label><input id="fin-name"></div>
    <div class="grid cols-2">
      <div class="field"><label>Type</label><select id="fin-type">${FINDER_TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}</select></div>
      <div class="field"><label>Territory / segment</label><input id="fin-seg" placeholder="e.g. Hotels — Ikeja corridor"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="fin-nda" style="width:auto;margin-right:8px">NDA & non-circumvention signed</label></div>
    <div class="callout"><small>Registration precedes any lead submission. Fees only ever arise from leads registered and logged by DEL first.</small></div>`,
    `<button class="btn green" onclick="registerFinder()">Register</button>`);
}
function registerFinder() {
  const name = document.getElementById('fin-name').value.trim();
  if (!name) { toast('Name is required'); return; }
  const id = 'FIN-' + String(STATE.finders.length + 1).padStart(2, '0');
  STATE.finders.push({ id, name, type: document.getElementById('fin-type').value, segment: document.getElementById('fin-seg').value, nda: document.getElementById('fin-nda').checked, registered: today(), submissions: [] });
  saveState(); closeModal(); renderAgents(); toast(name + ' registered as ' + id);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  renderTopbar(page);
  ({ 'index.html': renderDashboard, 'pipeline.html': renderPipeline, 'intake.html': renderIntake, 'opportunity.html': renderOpportunity, 'agents.html': renderAgents }[page] || (() => {}))();
});
