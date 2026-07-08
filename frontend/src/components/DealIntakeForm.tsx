import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSalesAgents } from '@/hooks/useAgents'
import type { DealIntake } from '@/types'

interface Props {
  values: Partial<DealIntake>
  onChange: (values: Partial<DealIntake>) => void
  disabled?: boolean
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function DealIntakeForm({ values, onChange, disabled = false }: Props) {
  const { data: agentsData } = useSalesAgents()
  const agents = agentsData?.results ?? []

  const set = (key: keyof DealIntake) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...values, [key]: e.target.value })

  const setVal = (key: keyof DealIntake) => (v: string) =>
    onChange({ ...values, [key]: v })

  return (
    <div className="space-y-8">
      {/* Project Identity */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Project Identity
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Deal Name *">
            <Input
              value={values.deal_name ?? ''}
              onChange={set('deal_name')}
              disabled={disabled}
              placeholder="e.g. Abuja Solar Phase 1"
            />
          </Field>

          <Field label="Deal Type *">
            <Select value={values.deal_type ?? ''} onValueChange={setVal('deal_type')} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GREENFIELD">Greenfield</SelectItem>
                <SelectItem value="BROWNFIELD">Brownfield</SelectItem>
                <SelectItem value="JV">JV</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Sub-sector">
            <Input value={values.sub_sector ?? ''} onChange={set('sub_sector')} disabled={disabled} placeholder="e.g. Solar PV" />
          </Field>

          <Field label="Client Name *">
            <Input value={values.client_name ?? ''} onChange={set('client_name')} disabled={disabled} />
          </Field>

          <Field label="Counterparty Class">
            <Input value={values.counterparty_class ?? ''} onChange={set('counterparty_class')} disabled={disabled} />
          </Field>

          <Field label="Location *">
            <Input value={values.location ?? ''} onChange={set('location')} disabled={disabled} placeholder="e.g. Lagos, Nigeria" />
          </Field>

          <Field label="Sponsor">
            <Input value={values.sponsor ?? ''} onChange={set('sponsor')} disabled={disabled} />
          </Field>

          <Field label="Sponsor Years">
            <Input
              type="number"
              min={0}
              value={values.sponsor_years ?? ''}
              onChange={set('sponsor_years')}
              disabled={disabled}
            />
          </Field>

          <Field label="Deal Source">
            <Input value={values.deal_source ?? ''} onChange={set('deal_source')} disabled={disabled} />
          </Field>
        </div>
      </section>

      {/* Economics */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Economics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Total Project Cost (USD m) *">
            <Input type="number" step="0.01" value={values.total_project_cost_usd_m ?? ''} onChange={set('total_project_cost_usd_m')} disabled={disabled} />
          </Field>

          <Field label="Installed Capacity">
            <div className="relative">
              <Input
                value={values.installed_capacity ?? ''}
                onChange={set('installed_capacity')}
                disabled={disabled}
                placeholder="e.g. 50000"
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                kWh
              </span>
            </div>
          </Field>

          <Field label="Proposed Tariff (NGN/kWh) *">
            <Input type="number" step="0.01" value={values.proposed_tariff_ngn_kwh ?? ''} onChange={set('proposed_tariff_ngn_kwh')} disabled={disabled} />
          </Field>

          <Field label="Tenor (years) *">
            <Input type="number" min={0} value={values.tenor_years ?? ''} onChange={set('tenor_years')} disabled={disabled} />
          </Field>

          <Field label="Revenue 2–3yr (%)">
            <Input type="number" step="0.01" value={values.revenue_2_3yr_pct ?? ''} onChange={set('revenue_2_3yr_pct')} disabled={disabled} />
          </Field>

          <Field label="Capital Structure">
            <Input value={values.capital_structure ?? ''} onChange={set('capital_structure')} disabled={disabled} placeholder="e.g. 70/30 D/E" />
          </Field>

          <Field label="EBITDA (USD m)">
            <Input type="number" step="0.01" value={values.ebitda_usd_m ?? ''} onChange={set('ebitda_usd_m')} disabled={disabled} />
          </Field>

          <Field label="Leverage (USD m)">
            <Input type="number" step="0.01" value={values.leverage_usd_m ?? ''} onChange={set('leverage_usd_m')} disabled={disabled} />
          </Field>

          <Field label="Cash Position (USD m)">
            <Input type="number" step="0.01" value={values.cash_position_usd_m ?? ''} onChange={set('cash_position_usd_m')} disabled={disabled} />
          </Field>
        </div>
      </section>

      {/* Site & Contacts */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Site &amp; Contacts
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Site Address">
              <Input value={values.site_address ?? ''} onChange={set('site_address')} disabled={disabled} placeholder="Physical location of the site" />
            </Field>
          </div>

          <Field label="Primary Contact Name">
            <Input value={values.primary_contact_name ?? ''} onChange={set('primary_contact_name')} disabled={disabled} />
          </Field>

          <Field label="Primary Contact Email">
            <Input type="email" value={values.primary_contact_email ?? ''} onChange={set('primary_contact_email')} disabled={disabled} />
          </Field>

          <Field label="Primary Contact Phone">
            <Input value={values.primary_contact_phone ?? ''} onChange={set('primary_contact_phone')} disabled={disabled} />
          </Field>

          <Field label="Decision Maker">
            <Input value={values.decision_maker ?? ''} onChange={set('decision_maker')} disabled={disabled} placeholder="Who signs off on the client side?" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Approval Process">
              <Textarea
                value={values.approval_process ?? ''}
                onChange={set('approval_process')}
                disabled={disabled}
                rows={2}
                placeholder="How does the client approve a deal of this size?"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Demand Baseline */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Demand Baseline
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Current Supply">
            <Input value={values.current_supply ?? ''} onChange={set('current_supply')} disabled={disabled} placeholder="e.g. Diesel gensets + grid" />
          </Field>

          <Field label="Current Tariff (NGN/kWh)">
            <Input type="number" step="0.01" value={values.current_tariff_ngn_kwh ?? ''} onChange={set('current_tariff_ngn_kwh')} disabled={disabled} />
          </Field>

          <Field label="Monthly Energy Spend (NGN)">
            <Input type="number" step="0.01" value={values.monthly_energy_spend_ngn ?? ''} onChange={set('monthly_energy_spend_ngn')} disabled={disabled} />
          </Field>

          <Field label="Metering Data Available?">
            <Select
              value={values.metering_data_available === true ? 'yes' : values.metering_data_available === false ? 'no' : 'unknown'}
              onValueChange={(v) =>
                onChange({ ...values, metering_data_available: v === 'yes' ? true : v === 'no' ? false : null })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unknown" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Load Profile">
              <Textarea
                value={values.load_profile ?? ''}
                onChange={set('load_profile')}
                disabled={disabled}
                rows={2}
                placeholder="Daily/seasonal consumption pattern, peak demand"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Qualification */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Qualification
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Expected Close Date">
            <Input type="date" value={values.expected_close_date ?? ''} onChange={set('expected_close_date')} disabled={disabled} />
          </Field>

          <Field label="Win Probability (%)">
            <Input type="number" step="1" min={0} max={100} value={values.win_probability_pct ?? ''} onChange={set('win_probability_pct')} disabled={disabled} />
          </Field>

          <Field label="Competition">
            <Input value={values.competition ?? ''} onChange={set('competition')} disabled={disabled} placeholder="Competing offers or providers" />
          </Field>

          <Field label="Key Risks">
            <Textarea
              value={values.key_risks ?? ''}
              onChange={set('key_risks')}
              disabled={disabled}
              rows={2}
              placeholder="Top risks to closing this deal"
            />
          </Field>
        </div>
      </section>

      {/* Attribution */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Attribution
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sales Agent (if externally sourced)">
            <Select
              value={values.sales_agent ?? 'none'}
              onValueChange={(v) => onChange({ ...values, sales_agent: v === 'none' ? null : v })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="None — sourced in-house" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — sourced in-house</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.company ? ` — ${a.company}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>
    </div>
  )
}
