import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeals } from '@/hooks/useDeals'
import { useTakeDeal, useRejectDeal } from '@/hooks/useDeals'
import { DealStateBadge } from '@/components/DealStateBadge'
import { RejectModal } from '@/components/RejectModal'
import { Button } from '@/components/ui/button'

export function AnalystQueuePage() {
  const { data, isLoading, error } = useDeals()
  const takeDeal = useTakeDeal()
  const rejectDeal = useRejectDeal()

  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const handleTake = async (id: string) => {
    setActionError('')
    try { await takeDeal.mutateAsync(id) }
    catch { setActionError('Could not take deal.') }
  }

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return
    setActionError('')
    try {
      await rejectDeal.mutateAsync({ id: rejectTarget, reason })
      setRejectTarget(null)
    } catch { setActionError('Could not return deal to BD.') }
  }

  const deals = data?.results ?? []
  const active = deals.filter((d) => ['SUBMITTED', 'UNDER_REVIEW'].includes(d.state))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Deal Queue</h1>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive text-sm">Failed to load queue.</p>}
      {actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Deal Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">BD</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No deals in the queue.
                </td>
              </tr>
            )}
            {active.map((deal) => (
              <tr key={deal.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{deal.deal_ref}</td>
                <td className="px-4 py-3">
                  <Link to={`/deals/${deal.id}`} className="font-medium hover:text-primary">
                    {deal.deal_name || <span className="italic text-muted-foreground">Untitled</span>}
                  </Link>
                </td>
                <td className="px-4 py-3"><DealStateBadge state={deal.state} /></td>
                <td className="px-4 py-3 text-muted-foreground">{deal.created_by_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {deal.submitted_at ? new Date(deal.submitted_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {deal.state === 'SUBMITTED' && (
                      <Button size="sm" onClick={() => handleTake(deal.id)} disabled={takeDeal.isPending}>
                        Take
                      </Button>
                    )}
                    {deal.state === 'UNDER_REVIEW' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setRejectTarget(deal.id)}>
                          Return
                        </Button>
                        <Button size="sm" asChild>
                          <Link to={`/deals/${deal.id}`}>Assess Gates</Link>
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/deals/${deal.id}`}>View</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        isPending={rejectDeal.isPending}
      />
    </div>
  )
}
