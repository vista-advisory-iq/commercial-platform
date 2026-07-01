import { useEffect, useState } from 'react'
import {
  useCostModel, useCreateCostModel, useUpdateAssumptions, useLineMutations,
} from '@/hooks/useCosting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus } from 'lucide-react'
import type { CostLine, CostLineKind, CostModel } from '@/types'

const ASSUMPTIONS: { key: keyof AssumState; label: string }[] = [
  { key: 'annual_revenue', label: 'Annual revenue' },
  { key: 'project_life_years', label: 'Project life (yrs)' },
  { key: 'debt_pct', label: 'Debt (%)' },
  { key: 'interest_rate_pct', label: 'Interest rate (%)' },
  { key: 'debt_tenor_years', label: 'Debt tenor (yrs)' },
  { key: 'discount_rate_pct', label: 'Discount rate (%)' },
]

interface AssumState {
  annual_revenue: string
  project_life_years: string
  debt_pct: string
  interest_rate_pct: string
  debt_tenor_years: string
  discount_rate_pct: string
}

export function CostModelPanel({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: model, isLoading } = useCostModel(dealId)
  const create = useCreateCostModel(dealId)
  const [error, setError] = useState('')

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading cost model…</p>
  if (!model) {
    return (
      <div className="text-sm text-muted-foreground">
        <p>No cost model has been built for this deal yet.</p>
        {canEdit && (
          <Button className="mt-3" disabled={create.isPending}
            onClick={() => { setError(''); create.mutateAsync(undefined).catch(() => setError('Could not create the cost model.')) }}>
            <Plus className="mr-2 h-4 w-4" />{create.isPending ? 'Creating…' : 'Build Cost Model'}
          </Button>
        )}
        {error && <p className="mt-2 text-destructive">{error}</p>}
      </div>
    )
  }
  return <CostBody model={model} dealId={dealId} canEdit={canEdit} />
}

function num(v: number | null, suffix = '') {
  return v === null || v === undefined ? '—' : `${v.toLocaleString()}${suffix}`
}

function CostBody({ model, dealId, canEdit }: { model: CostModel; dealId: string; canEdit: boolean }) {
  const updateAssumptions = useUpdateAssumptions(model.id, dealId)
  const lines = useLineMutations(dealId)
  const o = model.outputs
  const cur = model.currency

  const [form, setForm] = useState<AssumState>({ annual_revenue: '', project_life_years: '', debt_pct: '', interest_rate_pct: '', debt_tenor_years: '', discount_rate_pct: '' })
  const [newLine, setNewLine] = useState<Record<CostLineKind, { category: string; description: string; amount: string }>>({
    CAPEX: { category: '', description: '', amount: '' },
    OPEX: { category: '', description: '', amount: '' },
  })

  useEffect(() => {
    setForm({
      annual_revenue: model.annual_revenue ?? '',
      project_life_years: model.project_life_years?.toString() ?? '',
      debt_pct: model.debt_pct ?? '',
      interest_rate_pct: model.interest_rate_pct ?? '',
      debt_tenor_years: model.debt_tenor_years?.toString() ?? '',
      discount_rate_pct: model.discount_rate_pct ?? '',
    })
  }, [model])

  const saveAssumptions = () => updateAssumptions.mutate({
    annual_revenue: form.annual_revenue || null,
    project_life_years: form.project_life_years ? Number(form.project_life_years) : null,
    debt_pct: form.debt_pct || null,
    interest_rate_pct: form.interest_rate_pct || null,
    debt_tenor_years: form.debt_tenor_years ? Number(form.debt_tenor_years) : null,
    discount_rate_pct: form.discount_rate_pct || null,
  })

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )

  const lineTable = (kind: CostLineKind, title: string) => {
    const rows = model.lines.filter((l) => l.kind === kind)
    const nl = newLine[kind]
    return (
      <section>
        <h4 className="mb-2 text-sm font-semibold">{title}</h4>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Category</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Amount ({cur})</th><th /></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-muted-foreground">No lines.</td></tr>}
              {rows.map((l: CostLine) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.category || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.description || '—'}</td>
                  <td className="px-3 py-2 text-right">{Number(l.amount).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && (
                      <button onClick={() => lines.remove.mutate(l.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Input className="max-w-[10rem]" placeholder="Category" value={nl.category} onChange={(e) => setNewLine({ ...newLine, [kind]: { ...nl, category: e.target.value } })} />
            <Input className="max-w-xs" placeholder="Description" value={nl.description} onChange={(e) => setNewLine({ ...newLine, [kind]: { ...nl, description: e.target.value } })} />
            <Input className="max-w-[8rem]" type="number" placeholder="Amount" value={nl.amount} onChange={(e) => setNewLine({ ...newLine, [kind]: { ...nl, amount: e.target.value } })} />
            <Button size="sm" disabled={!nl.amount || lines.create.isPending}
              onClick={() => lines.create.mutate(
                { cost_model: model.id, kind, category: nl.category, description: nl.description, amount: nl.amount },
                { onSuccess: () => setNewLine({ ...newLine, [kind]: { category: '', description: '', amount: '' } }) },
              )}>
              <Plus className="mr-1 h-3.5 w-3.5" />Add
            </Button>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {/* Outputs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stat('Total CAPEX', `${cur} ${num(o.total_capex)}`)}
        {stat('Annual OPEX', `${cur} ${num(o.total_opex_annual)}`)}
        {stat('Net annual cashflow', `${cur} ${num(o.net_annual_cashflow)}`)}
        {stat('Simple payback', num(o.simple_payback_years, ' yrs'))}
        {stat('NPV', o.npv === null ? '—' : `${cur} ${num(o.npv)}`)}
        {stat('IRR', num(o.irr_pct, '%'))}
        {stat('Debt / Equity', o.debt_amount === null ? '—' : `${num(o.debt_amount)} / ${num(o.equity_amount)}`)}
      </div>

      {/* Assumptions */}
      <section>
        <h4 className="mb-2 text-sm font-semibold">Assumptions</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ASSUMPTIONS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{label}</label>
              <Input type="number" disabled={!canEdit} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
        </div>
        {canEdit && (
          <Button size="sm" className="mt-3" onClick={saveAssumptions} disabled={updateAssumptions.isPending}>
            {updateAssumptions.isPending ? 'Saving…' : 'Save Assumptions'}
          </Button>
        )}
      </section>

      {lineTable('CAPEX', 'Capital Costs (CAPEX)')}
      {lineTable('OPEX', 'Operating Costs (OPEX, annual)')}
    </div>
  )
}
