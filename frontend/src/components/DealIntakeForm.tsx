import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const set = (key: keyof DealIntake) => (e: React.ChangeEvent<HTMLInputElement>) =>
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
            <Input value={values.installed_capacity ?? ''} onChange={set('installed_capacity')} disabled={disabled} placeholder="e.g. 50 MW" />
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
    </div>
  )
}
