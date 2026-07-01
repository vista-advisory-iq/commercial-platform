import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEditRequests, useApproveRequest, useDenyRequest } from '@/hooks/useEditRequests'
import { RejectModal } from '@/components/RejectModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANTS = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'secondary',
} as const

export function EditRequestsPage() {
  const { data, isLoading, error } = useEditRequests()
  const approve = useApproveRequest()
  const deny = useDenyRequest()

  const [denyTarget, setDenyTarget] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const handleApprove = async (id: string) => {
    setActionError('')
    try { await approve.mutateAsync(id) }
    catch { setActionError('Could not approve request.') }
  }

  const handleDeny = async (reason: string) => {
    if (!denyTarget) return
    setActionError('')
    try {
      await deny.mutateAsync({ id: denyTarget, reason })
      setDenyTarget(null)
    } catch { setActionError('Could not deny request.') }
  }

  const requests = data?.results ?? []

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Access Requests</h1>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive text-sm">Failed to load requests.</p>}
      {actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Requested by</th>
              <th className="px-4 py-3">Justification</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No edit requests.
                </td>
              </tr>
            )}
            {requests.map((req) => (
              <tr key={req.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/deals/${req.deal}`} className="font-medium hover:text-primary font-mono text-xs">
                    {req.deal}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{req.requested_by}</td>
                <td className="px-4 py-3 max-w-xs truncate">{req.justification}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[req.status]}>{req.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {req.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(req.id)} disabled={approve.isPending}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDenyTarget(req.id)}>
                        Deny
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RejectModal
        open={!!denyTarget}
        onClose={() => setDenyTarget(null)}
        onConfirm={handleDeny}
        isPending={deny.isPending}
        title="Deny Edit Request"
        description="Provide a reason for denying this request."
      />
    </div>
  )
}
