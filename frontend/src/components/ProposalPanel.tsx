import { useEffect, useState } from 'react'
import {
  useProposal, useProposalHistory, useCreateProposal, useUpdateOffer,
  useSubmitProposal, useReturnProposal, useSendProposal, useRecordOutcome,
} from '@/hooks/useProposals'
import { downloadProposalPdf } from '@/api/proposals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RejectModal } from '@/components/RejectModal'
import { FileDown, Plus } from 'lucide-react'
import type { Proposal, ProposalOffer, ProposalStatus } from '@/types'

const STATUS: Record<ProposalStatus, { label: string; variant: 'muted' | 'warning' | 'info' | 'success' | 'destructive' }> = {
  DRAFT: { label: 'Draft', variant: 'muted' },
  IN_REVIEW: { label: 'In Review', variant: 'warning' },
  SENT: { label: 'Sent to Client', variant: 'info' },
  ACCEPTED: { label: 'Accepted', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
}

interface Props {
  dealId: string
  canAssess: boolean
  isOwner: boolean
}

export function ProposalPanel({ dealId, canAssess, isOwner }: Props) {
  const { data: proposal, isLoading } = useProposal(dealId)
  const create = useCreateProposal(dealId)
  const [error, setError] = useState('')

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading proposal…</p>

  if (!proposal) {
    return (
      <div className="text-sm text-muted-foreground">
        <p>No proposal has been created for this deal yet.</p>
        {isOwner && (
          <Button
            className="mt-3"
            onClick={() => { setError(''); create.mutateAsync(undefined).catch(() => setError('Could not create the proposal.')) }}
            disabled={create.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            {create.isPending ? 'Creating…' : 'Create Proposal'}
          </Button>
        )}
        {error && <p className="mt-2 text-destructive">{error}</p>}
      </div>
    )
  }

  return <ProposalEditor proposal={proposal} dealId={dealId} canAssess={canAssess} isOwner={isOwner} />
}

const OFFER_FIELDS: { key: keyof ProposalOffer; label: string; type?: string; area?: boolean }[] = [
  { key: 'title', label: 'Title' },
  { key: 'executive_summary', label: 'Executive Summary', area: true },
  { key: 'scope_of_work', label: 'Scope of Work', area: true },
  { key: 'proposed_tariff_ngn_kwh', label: 'Proposed Tariff (NGN/kWh)', type: 'number' },
  { key: 'contract_tenor_years', label: 'Contract Tenor (years)', type: 'number' },
  { key: 'total_contract_value_usd_m', label: 'Total Contract Value (USD m)', type: 'number' },
  { key: 'validity_until', label: 'Valid Until', type: 'date' },
  { key: 'payment_terms', label: 'Payment Terms', area: true },
  { key: 'commercial_terms', label: 'Commercial Terms', area: true },
  { key: 'assumptions', label: 'Assumptions', area: true },
]

function ProposalEditor({ proposal, dealId, canAssess, isOwner }: { proposal: Proposal } & Props) {
  const update = useUpdateOffer(proposal.id, dealId)
  const submit = useSubmitProposal(proposal.id, dealId)
  const returnToDraft = useReturnProposal(proposal.id, dealId)
  const send = useSendProposal(proposal.id, dealId)
  const outcome = useRecordOutcome(proposal.id, dealId)
  const { data: history } = useProposalHistory(proposal.id)

  const [form, setForm] = useState<Partial<ProposalOffer>>({})
  const [error, setError] = useState('')
  const [returnOpen, setReturnOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  useEffect(() => {
    const o: Partial<ProposalOffer> = {}
    OFFER_FIELDS.forEach(({ key }) => { (o as Record<string, unknown>)[key] = proposal[key] ?? '' })
    setForm(o)
  }, [proposal])

  const editable = proposal.status === 'DRAFT' && isOwner
  const st = STATUS[proposal.status]

  const set = (key: keyof ProposalOffer, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const guard = async (fn: () => Promise<unknown>, msg: string) => {
    setError('')
    try { await fn() } catch (e: unknown) {
      const d = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(d ?? msg)
    }
  }

  const handlePdf = async () => {
    const blob = await downloadProposalPdf(proposal.id)
    window.open(URL.createObjectURL(blob), '_blank')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={st.variant}>{st.label}</Badge>
          {proposal.version > 0 && <span className="text-xs text-muted-foreground">v{proposal.version}</span>}
        </div>
        <Button variant="outline" size="sm" onClick={handlePdf}>
          <FileDown className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {proposal.status === 'REJECTED' && proposal.decision_reason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          Client rejected: {proposal.decision_reason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OFFER_FIELDS.map(({ key, label, type, area }) => (
          <div key={key} className={area ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
            <Label>{label}</Label>
            {area ? (
              <Textarea rows={2} disabled={!editable} value={(form[key] as string) ?? ''} onChange={(e) => set(key, e.target.value)} />
            ) : (
              <Input type={type} disabled={!editable} value={(form[key] as string) ?? ''} onChange={(e) => set(key, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {editable && (
          <>
            <Button variant="outline" onClick={() => guard(() => update.mutateAsync(form), 'Could not save.')} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button onClick={() => guard(() => submit.mutateAsync(undefined), 'Could not submit.')} disabled={submit.isPending}>
              Submit for Review
            </Button>
          </>
        )}
        {proposal.status === 'IN_REVIEW' && canAssess && (
          <>
            <Button variant="outline" onClick={() => setReturnOpen(true)}>Return to Draft</Button>
            <Button onClick={() => guard(() => send.mutateAsync(undefined), 'Could not send.')} disabled={send.isPending}>
              Send to Client
            </Button>
          </>
        )}
        {proposal.status === 'SENT' && (isOwner || canAssess) && (
          <>
            <Button variant="outline" onClick={() => setRejectOpen(true)}>Mark Rejected</Button>
            <Button onClick={() => guard(() => outcome.mutateAsync({ accepted: true, reason: '' }), 'Could not record outcome.')}>
              Mark Accepted
            </Button>
          </>
        )}
      </div>

      {/* Timeline */}
      {history && history.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h4>
          <ol className="space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                <span className="font-medium text-foreground">{h.to_status}</span>
                <span>· {h.actor_name || 'System'}</span>
                <span>· {new Date(h.occurred_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {h.reason && <span className="w-full text-xs">{h.reason}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      <RejectModal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        onConfirm={(reason) => guard(async () => { await returnToDraft.mutateAsync(reason); setReturnOpen(false) }, 'Could not return.')}
        isPending={returnToDraft.isPending}
        title="Return Proposal to Draft"
        description="Explain what the BD should revise."
      />
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => guard(async () => { await outcome.mutateAsync({ accepted: false, reason }); setRejectOpen(false) }, 'Could not record outcome.')}
        isPending={outcome.isPending}
        title="Mark Proposal Rejected"
        description="Record the client's reason for declining."
      />
    </div>
  )
}
