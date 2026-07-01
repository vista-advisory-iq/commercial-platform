import { useEffect, useState } from 'react'
import { useGates, useSaveGates, useFinalizeStage1 } from '@/hooks/useDeals'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import type { DealState, GateResult, GateVerdict } from '@/types'

const VERDICTS: { value: Exclude<GateVerdict, ''>; label: string; active: string }[] = [
  { value: 'PASS', label: 'Pass', active: 'border-green-500 bg-green-50 text-green-700' },
  { value: 'CONDITIONAL', label: 'Conditional', active: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  { value: 'FAIL', label: 'Fail', active: 'border-red-500 bg-red-50 text-red-700' },
]

interface Props {
  dealId: string
  dealState?: DealState
  editable?: boolean
}

/** Client-side preview of the outcome the backend will derive from the verdicts. */
function previewOutcome(gates: GateResult[]) {
  if (gates.some((g) => !g.verdict)) {
    return { ready: false, tone: 'muted', text: 'Assess all 5 gates to finalize.' }
  }
  if (gates.some((g) => g.verdict === 'FAIL')) {
    return { ready: true, tone: 'fail', text: 'Outcome: DECLINED — at least one knockout gate failed.' }
  }
  if (gates.some((g) => g.verdict === 'CONDITIONAL')) {
    return { ready: true, tone: 'cond', text: 'Outcome: advances to Stage 2, flagged CONDITIONAL.' }
  }
  return { ready: true, tone: 'pass', text: 'Outcome: advances to Stage 2 — all gates passed.' }
}

const TONE_CLASSES: Record<string, string> = {
  muted: 'bg-muted text-muted-foreground',
  pass: 'bg-green-50 text-green-700 border border-green-200',
  cond: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  fail: 'bg-red-50 text-red-700 border border-red-200',
}

export function GateAssessment({ dealId, dealState, editable = true }: Props) {
  const { data: serverGates, isLoading } = useGates(dealId)
  const saveGates = useSaveGates(dealId)
  const finalize = useFinalizeStage1()

  const [gates, setGates] = useState<GateResult[]>([])
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  // Re-assessing gates after the deal already passed Stage 1.
  const isReassessment = dealState === 'STAGE1_PASSED'

  useEffect(() => {
    if (serverGates) setGates(serverGates)
  }, [serverGates])

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading gates…</p>

  const setVerdict = (gateNum: number, verdict: GateVerdict) =>
    setGates((gs) => gs.map((g) => (g.gate === gateNum ? { ...g, verdict } : g)))

  const setNotes = (gateNum: number, notes: string) =>
    setGates((gs) => gs.map((g) => (g.gate === gateNum ? { ...g, evidence_notes: notes } : g)))

  const handleSave = async () => {
    setError('')
    try {
      await saveGates.mutateAsync(
        gates.map((g) => ({ gate: g.gate, verdict: g.verdict, evidence_notes: g.evidence_notes })),
      )
    } catch {
      setError('Could not save the assessment.')
    }
  }

  const doFinalize = async () => {
    setError('')
    setConfirmClear(false)
    try {
      // Persist current verdicts first, then derive the decision server-side.
      await saveGates.mutateAsync(
        gates.map((g) => ({ gate: g.gate, verdict: g.verdict, evidence_notes: g.evidence_notes })),
      )
      await finalize.mutateAsync(dealId)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: unknown } })?.response?.data
      setError(typeof detail === 'string' ? detail : 'Could not finalize the Stage 1 decision.')
    }
  }

  const outcome = previewOutcome(gates)
  const wouldDecline = outcome.tone === 'fail'

  const handleFinalize = () => {
    // Re-assessing to a knockout after Stage 2 began will clear the Stage 2 scores.
    if (isReassessment && wouldDecline) {
      setConfirmClear(true)
    } else {
      doFinalize()
    }
  }

  const busy = saveGates.isPending || finalize.isPending

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Stage 1 — Knockout Gates</h3>
        <p className="text-sm text-muted-foreground">
          {editable
            ? 'Assess each of the five gates. A FAIL on any gate declines the deal; a CONDITIONAL advances it but flags it.'
            : 'The five knockout gates and the recorded verdicts (read-only).'}
        </p>
      </div>

      {gates.map((g) => (
        <Card key={g.gate}>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  Gate {g.gate}. {g.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{g.pass_condition}</p>
                {g.required_evidence && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">Evidence:</span> {g.required_evidence}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {VERDICTS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    disabled={!editable}
                    onClick={() => editable && setVerdict(g.gate, v.value)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      g.verdict === v.value ? v.active : 'border-input bg-background hover:bg-accent'
                    } ${editable ? '' : 'cursor-default opacity-90'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            {(editable || g.evidence_notes) && (
              <Textarea
                rows={2}
                disabled={!editable}
                placeholder="Evidence notes / rationale (optional)…"
                value={g.evidence_notes}
                onChange={(e) => setNotes(g.gate, e.target.value)}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <div className={`rounded-md px-4 py-3 text-sm ${TONE_CLASSES[outcome.tone]}`}>{outcome.text}</div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {editable && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleSave} disabled={busy}>
            {saveGates.isPending && !finalize.isPending ? 'Saving…' : 'Save Progress'}
          </Button>
          <Button onClick={handleFinalize} disabled={!outcome.ready || busy}>
            {finalize.isPending
              ? 'Finalizing…'
              : isReassessment ? 'Re-assess Stage 1' : 'Finalize Stage 1 Decision'}
          </Button>
        </div>
      )}

      <Dialog open={confirmClear} onOpenChange={(o) => !o && setConfirmClear(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Stage 2 scores?</DialogTitle>
            <DialogDescription>
              This re-assessment fails a knockout gate, so the deal will be declined and can no longer
              proceed to Stage 2. The existing Stage 2 scores will be permanently cleared. Continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doFinalize} disabled={busy}>
              {finalize.isPending ? 'Declining…' : 'Decline & Clear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
