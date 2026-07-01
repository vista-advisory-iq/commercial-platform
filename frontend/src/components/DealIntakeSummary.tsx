import type { DealIntake } from '@/types'

const IDENTITY: [keyof DealIntake, string][] = [
  ['deal_name', 'Deal name'],
  ['deal_type', 'Deal type'],
  ['sub_sector', 'Sub-sector'],
  ['client_name', 'Client'],
  ['counterparty_class', 'Counterparty class'],
  ['location', 'Location'],
  ['sponsor', 'Sponsor'],
  ['sponsor_years', 'Sponsor years'],
  ['deal_source', 'Deal source'],
]

const ECONOMICS: [keyof DealIntake, string][] = [
  ['total_project_cost_usd_m', 'Total project cost (USD m)'],
  ['installed_capacity', 'Installed capacity'],
  ['proposed_tariff_ngn_kwh', 'Proposed tariff (NGN/kWh)'],
  ['tenor_years', 'Tenor (years)'],
  ['revenue_2_3yr_pct', 'Revenue 2–3yr (%)'],
  ['capital_structure', 'Capital structure'],
  ['ebitda_usd_m', 'EBITDA (USD m)'],
  ['leverage_usd_m', 'Leverage (USD m)'],
  ['cash_position_usd_m', 'Cash position (USD m)'],
]

function Rows({ intake, fields }: { intake: DealIntake; fields: [keyof DealIntake, string][] }) {
  return (
    <dl className="divide-y">
      {fields.map(([key, label]) => {
        const v = intake[key]
        return (
          <div key={key} className="flex gap-3 py-1.5 text-sm">
            <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="font-medium break-words">
              {v === null || v === '' || v === undefined ? <span className="text-muted-foreground">—</span> : String(v)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Compact, read-only intake view for the assessor's side-by-side workspace. */
export function DealIntakeSummary({ intake }: { intake: DealIntake | null | undefined }) {
  if (!intake) return <p className="text-sm text-muted-foreground">No intake data.</p>
  return (
    <div className="space-y-4">
      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project Identity</h4>
        <Rows intake={intake} fields={IDENTITY} />
      </section>
      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Economics</h4>
        <Rows intake={intake} fields={ECONOMICS} />
      </section>
    </div>
  )
}
