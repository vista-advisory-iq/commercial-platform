import { useEffect, useMemo, useState } from 'react'
import { useScoring, useSaveScoring } from '@/hooks/useDeals'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { PillarScore, SubCriterionScore } from '@/types'

const GRADES = [
  { value: 1 as const, label: '1', hint: 'Very Poor', active: 'border-red-500 bg-red-50 text-red-700' },
  { value: 3 as const, label: '3', hint: 'Moderate', active: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  { value: 5 as const, label: '5', hint: 'Excellent', active: 'border-green-500 bg-green-50 text-green-700' },
]

interface Props {
  dealId: string
  editable: boolean
}

/** Recompute pillar raw/pct and the weighted total client-side for live preview. */
function recompute(pillars: PillarScore[]) {
  let weighted = 0
  const perPillar = pillars.map((p) => {
    const graded = p.sub_criteria.filter((s) => s.grade != null)
    const raw = graded.reduce((sum, s) => sum + (s.grade ?? 0), 0)
    const max = p.sub_criteria.length * 5
    const complete = graded.length === p.sub_criteria.length && p.sub_criteria.length > 0
    const pct = max ? (raw / max) * 100 : 0
    const passes = complete && p.pass_threshold != null ? raw >= p.pass_threshold : null
    weighted += (pct * Number(p.weight_pct)) / 100
    return { code: p.code, raw, max, pct, complete, passes }
  })
  const complete = perPillar.every((p) => p.complete)
  return { perPillar, weighted: Math.round(weighted * 10) / 10, complete }
}

export function ScoringPanel({ dealId, editable }: Props) {
  const { data: server, isLoading } = useScoring(dealId)
  const saveScoring = useSaveScoring(dealId)

  const [pillars, setPillars] = useState<PillarScore[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (server) setPillars(server.pillars)
  }, [server])

  const live = useMemo(() => recompute(pillars), [pillars])

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading scoring…</p>
  if (!pillars.length) return <p className="text-sm text-muted-foreground">No scoring framework found.</p>

  const setGrade = (pillarCode: string, subId: number, grade: 1 | 3 | 5) =>
    setPillars((ps) =>
      ps.map((p) =>
        p.code !== pillarCode
          ? p
          : { ...p, sub_criteria: p.sub_criteria.map((s) => (s.id === subId ? { ...s, grade } : s)) },
      ),
    )

  const setComment = (pillarCode: string, comment: string) =>
    setPillars((ps) => ps.map((p) => (p.code === pillarCode ? { ...p, comment } : p)))

  const handleSave = async () => {
    setError('')
    const grades = pillars
      .flatMap((p) => p.sub_criteria)
      .filter((s): s is SubCriterionScore & { grade: 1 | 3 | 5 } => s.grade != null)
      .map((s) => ({ sub_criterion: s.id, grade: s.grade, notes: s.notes }))
    const comments = pillars.map((p) => ({ pillar: p.code, comment: p.comment }))
    try {
      await saveScoring.mutateAsync({ grades, comments })
    } catch {
      setError('Could not save scoring.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Overall summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Weighted Total</p>
          <p className="text-3xl font-semibold">
            {live.weighted.toFixed(1)}
            <span className="text-base font-normal text-muted-foreground"> / 100</span>
          </p>
        </div>
        <div className="text-right">
          {server?.verdict ? (
            <Badge variant={server.verdict === 'GO' ? 'success' : server.verdict === 'CONDITIONAL' ? 'warning' : 'destructive'}>
              {server.verdict === 'GO' ? 'GO' : server.verdict === 'CONDITIONAL' ? 'CONDITIONAL GO' : 'NO-GO'}
            </Badge>
          ) : (
            <p className="max-w-xs text-xs text-muted-foreground">
              {live.complete
                ? 'Verdict bands are not configured.'
                : 'Grade every sub-criterion to see the verdict.'}
            </p>
          )}
        </div>
      </div>

      {/* Pillars */}
      {pillars.map((p) => {
        const lp = live.perPillar.find((x) => x.code === p.code)!
        return (
          <Card key={p.code}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {p.code}. {p.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">weight {p.weight_pct}%</span>
                  </p>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {lp.raw}/{lp.max} ({lp.pct.toFixed(0)}%)
                  </span>
                  {lp.passes === true && <Badge variant="success">Pass</Badge>}
                  {lp.passes === false && <Badge variant="destructive">Below threshold</Badge>}
                  {lp.passes === null && p.pass_threshold != null && (
                    <Badge variant="muted">needs {p.pass_threshold}+</Badge>
                  )}
                </div>
              </div>

              <div className="divide-y">
                {p.sub_criteria.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">weight {s.weight_in_pillar}% within pillar</p>
                    </div>
                    <div className="flex gap-1.5">
                      {GRADES.map((g) => {
                        const selected = s.grade === g.value
                        return (
                          <button
                            key={g.value}
                            type="button"
                            disabled={!editable}
                            title={g.hint}
                            onClick={() => setGrade(p.code, s.id, g.value)}
                            className={`h-8 w-9 rounded-md border text-sm font-semibold transition-colors disabled:opacity-60 ${
                              selected ? g.active : 'border-input bg-background hover:bg-accent'
                            }`}
                          >
                            {g.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Pillar comment</label>
                <Textarea
                  rows={2}
                  disabled={!editable}
                  value={p.comment}
                  onChange={(e) => setComment(p.code, e.target.value)}
                  placeholder="Rationale for this pillar's scoring…"
                />
              </div>
            </CardContent>
          </Card>
        )
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {editable && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveScoring.isPending}>
            {saveScoring.isPending ? 'Saving…' : 'Save Scoring'}
          </Button>
        </div>
      )}
    </div>
  )
}
