import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeals } from '@/hooks/useDeals'
import { DealStateBadge } from '@/components/DealStateBadge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { DealState } from '@/types'

const STATE_FILTERS: { value: 'ALL' | DealState; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'REJECTED_TO_BD', label: 'Returned' },
  { value: 'STAGE1_PASSED', label: 'Stage 1 Passed' },
  { value: 'AWAITING_IC_REVIEW', label: 'Awaiting Committee' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'STAGE2_GO', label: 'Stage 2 — GO' },
  { value: 'STAGE2_CONDITIONAL', label: 'Stage 2 — Conditional' },
  { value: 'STAGE2_NO_GO', label: 'Stage 2 — NO-GO' },
]

export function AllDealsPage() {
  const { data, isLoading, error } = useDeals()
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<'ALL' | DealState>('ALL')

  const deals = data?.results ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deals.filter((d) => {
      if (stateFilter !== 'ALL' && d.state !== stateFilter) return false
      if (!q) return true
      return (
        d.deal_ref.toLowerCase().includes(q) ||
        (d.deal_name ?? '').toLowerCase().includes(q) ||
        (d.created_by_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [deals, search, stateFilter])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Deals</h1>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {deals.length}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search ref, name, or BD…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {STATE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStateFilter(f.value)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                stateFilter === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive text-sm">Failed to load deals.</p>}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Deal Name</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Stage 1</th>
              <th className="px-4 py-3">BD</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No deals match.
                </td>
              </tr>
            )}
            {filtered.map((deal) => (
              <tr key={deal.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{deal.deal_ref}</td>
                <td className="px-4 py-3">
                  <Link to={`/deals/${deal.id}`} className="font-medium hover:text-primary">
                    {deal.deal_name || <span className="italic text-muted-foreground">Untitled</span>}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DealStateBadge state={deal.state} />
                    {deal.classification === 'NURTURE' && <Badge className="bg-amber-100 text-amber-800">Nurture</Badge>}
                    {deal.classification === 'DEFERRED' && <Badge className="bg-slate-200 text-slate-700">Deferred</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {deal.stage1_decision === 'PASSED' && <Badge variant="success">Passed</Badge>}
                  {deal.stage1_decision === 'CONDITIONAL' && <Badge variant="warning">Conditional</Badge>}
                  {deal.stage1_decision === 'DECLINED' && <Badge variant="destructive">Declined</Badge>}
                  {!deal.stage1_decision && <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{deal.created_by_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(deal.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {deal.submitted_at ? new Date(deal.submitted_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
