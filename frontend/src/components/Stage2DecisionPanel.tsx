import { useEffect, useState } from 'react'
import { useScoring, useDecideStage2 } from '@/hooks/useDeals'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Decision = 'GO' | 'CONDITIONAL' | 'NO_GO'

const OPTIONS: { value: Decision; label: string; active: string }[] = [
  { value: 'GO', label: 'GO', active: 'border-green-500 bg-green-50 text-green-700' },
  { value: 'CONDITIONAL', label: 'Conditional GO', active: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  { value: 'NO_GO', label: 'NO-GO', active: 'border-red-500 bg-red-50 text-red-700' },
]

const LABELS: Record<string, string> = { GO: 'GO', CONDITIONAL: 'Conditional GO', NO_GO: 'NO-GO' }

export function Stage2DecisionPanel({ dealId }: { dealId: string }) {
  const { data: scoring } = useScoring(dealId)
  const decide = useDecideStage2()

  const [decision, setDecision] = useState<Decision | null>(null)
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState('')

  // Prefill to the computed recommendation once scoring is complete.
  useEffect(() => {
    if (scoring?.complete && scoring.verdict && decision === null) {
      setDecision(scoring.verdict as Decision)
    }
  }, [scoring, decision])

  if (!scoring) return null

  const complete = scoring.complete
  const recommendation = scoring.verdict
  const overriding = complete && decision !== null && recommendation !== null && decision !== recommendation

  const handleSubmit = async () => {
    if (!decision) return
    setError('')
    try {
      await decide.mutateAsync({ id: dealId, decision, rationale: rationale.trim() })
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: unknown } })?.response?.data
      setError(typeof detail === 'string' ? detail : 'Could not record the decision.')
    }
  }

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">Management Investment Committee Decision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!complete ? (
          <p className="text-sm text-muted-foreground">
            All sub-criteria must be graded before the committee can record a decision.
          </p>
        ) : (
          <>
            <div className="rounded-md bg-muted px-4 py-2 text-sm">
              Weighted score <strong>{scoring.weighted_total.toFixed(1)}/100</strong> · recommendation{' '}
              <strong>{recommendation ? LABELS[recommendation] : 'n/a'}</strong>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Decision</p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setDecision(o.value)}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      decision === o.value ? o.active : 'border-input bg-background hover:bg-accent'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {overriding && (
                <p className="text-xs text-yellow-700">
                  This overrides the computed recommendation ({recommendation ? LABELS[recommendation] : ''}).
                  Please record your rationale.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rationale {overriding && <span className="text-destructive">*</span>}</label>
              <Textarea
                rows={3}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Record the committee's reasoning…"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!decision || decide.isPending || (overriding && !rationale.trim())}
              >
                {decide.isPending ? 'Recording…' : 'Record Decision'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
