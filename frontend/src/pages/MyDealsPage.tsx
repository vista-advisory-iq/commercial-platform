import { Link } from 'react-router-dom'
import { useDeals } from '@/hooks/useDeals'
import { DealStateBadge } from '@/components/DealStateBadge'
import { Button } from '@/components/ui/button'
import { Plus, Pencil } from 'lucide-react'

const EDITABLE_STATES = ['DRAFT', 'REJECTED_TO_BD']

export function MyDealsPage() {
  const { data, isLoading, error } = useDeals()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Deals</h1>
        <Button asChild>
          <Link to="/deals/new">
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive text-sm">Failed to load deals.</p>}

      {data && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Deal Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created by</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No deals yet. Create one to get started.
                  </td>
                </tr>
              )}
              {data.results.map((deal) => (
                <tr key={deal.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{deal.deal_ref}</td>
                  <td className="px-4 py-3">
                    <Link to={`/deals/${deal.id}`} className="font-medium hover:text-primary">
                      {deal.deal_name || <span className="text-muted-foreground italic">Untitled</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <DealStateBadge state={deal.state} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{deal.created_by_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(deal.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {deal.submitted_at ? new Date(deal.submitted_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {EDITABLE_STATES.includes(deal.state) && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/deals/${deal.id}/edit`}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
