import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useClassifyDeal } from '@/hooks/useDeals'
import type { Deal, DealClassification } from '@/types'

const TERMINAL_STATES = ['DECLINED', 'STAGE2_GO', 'STAGE2_CONDITIONAL', 'STAGE2_NO_GO']

const LABELS: Record<DealClassification, string> = {
  ACTIVE: 'Active',
  NURTURE: 'Nurture (parked)',
  DEFERRED: 'Deferred (external blocker)',
}

const BADGE_CLASS: Record<DealClassification, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  NURTURE: 'bg-amber-100 text-amber-800',
  DEFERRED: 'bg-slate-200 text-slate-700',
}

export function ClassificationBadge({ deal }: { deal: Pick<Deal, 'classification' | 'next_review_date'> }) {
  if (!deal.classification || deal.classification === 'ACTIVE') return null
  return (
    <Badge className={BADGE_CLASS[deal.classification]}>
      {LABELS[deal.classification]}
      {deal.next_review_date ? ` · review ${deal.next_review_date}` : ''}
    </Badge>
  )
}

function defaultReviewDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90) // mirrors backend PIPELINE_REVIEW_DAYS default
  return d.toISOString().slice(0, 10)
}

interface Props {
  deal: Deal
  canAssess: boolean
}

/** Pipeline classification: park (nurture/defer) or reactivate a deal without moving the state machine. */
export function ClassificationPanel({ deal, canAssess }: Props) {
  const classify = useClassifyDeal(deal.id)
  const [editing, setEditing] = useState(false)
  const [classification, setClassification] = useState<DealClassification>(deal.classification ?? 'ACTIVE')
  const [note, setNote] = useState('')
  const [reviewDate, setReviewDate] = useState<string>(deal.next_review_date ?? defaultReviewDate())
  const [error, setError] = useState('')

  const terminal = TERMINAL_STATES.includes(deal.state)
  const needsDate = classification !== 'ACTIVE'

  if (terminal && (deal.classification ?? 'ACTIVE') === 'ACTIVE') return null

  const save = () => {
    setError('')
    classify.mutate(
      { classification, note, nextReviewDate: needsDate ? reviewDate || null : null },
      {
        onSuccess: () => setEditing(false),
        onError: (e: unknown) => {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setError(detail ?? 'Could not update classification.')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pipeline Classification</CardTitle>
          <ClassificationBadge deal={deal} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {deal.classification === 'NURTURE' && 'Parked for nurturing — not under active assessment.'}
          {deal.classification === 'DEFERRED' && 'Deferred pending an external blocker.'}
          {(deal.classification ?? 'ACTIVE') === 'ACTIVE' && 'Actively worked in the pipeline.'}
          {deal.next_review_date && ` Next review: ${deal.next_review_date}.`}
        </p>
        {deal.classification_note && (
          <p className="text-sm italic text-muted-foreground">“{deal.classification_note}”</p>
        )}

        {canAssess && !terminal && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change classification
          </Button>
        )}

        {canAssess && !terminal && editing && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Classification</Label>
                <Select value={classification} onValueChange={(v) => setClassification(v as DealClassification)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{LABELS.ACTIVE}</SelectItem>
                    <SelectItem value="NURTURE">{LABELS.NURTURE}</SelectItem>
                    <SelectItem value="DEFERRED">{LABELS.DEFERRED}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {needsDate && (
                <div className="space-y-1.5">
                  <Label>Next review date *</Label>
                  <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why is this deal being parked / reactivated?"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={classify.isPending || (needsDate && !reviewDate)}>
                {classify.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
