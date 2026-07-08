import { useEffect, useMemo, useState } from 'react'
import { useScoring, useSaveScoring } from '@/hooks/useDeals'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Grade, PillarScore, SubCriterionScore } from '@/types'

const GRADES = [
  { value: 1 as const, label: '1', hint: 'Very Poor', active: 'border-red-500 bg-red-50 text-red-700' },
  { value: 3 as const, label: '3', hint: 'Moderate', active: 'border-amber-500 bg-amber-50 text-amber-700' },
  { value: 5 as const, label: '5', hint: 'Excellent', active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
]

const SCORE_TONE: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-lime-100 text-lime-700',
  5: 'bg-emerald-100 text-emerald-700',
}

interface Props {
  dealId: string
  editable: boolean
}

/** Mirror of the backend's SubCriterion.grade_for_value — live preview only. */
function gradeFromValue(sub: SubCriterionScore, rawValue: string | null): Grade {
  if (rawValue == null || rawValue === '') return null
  const value = Number(rawValue)
  if (Number.isNaN(value)) return null
  const bands = [...(sub.numeric_bands ?? [])].sort((a, b) => b.score - a.score)
  for (const b of bands) {
    if (sub.higher_is_better ? value >= b.threshold : value <= b.threshold) return b.score as Grade
  }
  return 1
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

  const setGrade = (pillarCode: string, subId: number, grade: Grade) =>
    setPillars((ps) =>
      ps.map((p) =>
        p.code !== pillarCode
          ? p
          : { ...p, sub_criteria: p.sub_criteria.map((s) => (s.id === subId ? { ...s, grade } : s)) },
      ),
    )

  const setMeasured = (pillarCode: string, subId: number, measured_value: string) =>
    setPillars((ps) =>
      ps.map((p) =>
        p.code !== pillarCode
          ? p
          : {
              ...p,
              sub_criteria: p.sub_criteria.map((s) =>
                s.id === subId
                  ? { ...s, measured_value, grade: gradeFromValue(s, measured_value) }
                  : s,
              ),
            },
      ),
    )

  const setComment = (pillarCode: string, comment: string) =>
    setPillars((ps) => ps.map((p) => (p.code === pillarCode ? { ...p, comment } : p)))

  const handleSave = async () => {
    setError('')
    const grades = pillars
      .flatMap((p) => p.sub_criteria)
      .filter((s) => s.grade != null || (s.input_type === 'NUMERIC' && s.measured_value != null && s.measured_value !== ''))
      .map((s) =>
        s.input_type === 'NUMERIC'
          ? { sub_criterion: s.id, measured_value: s.measured_value, notes: s.notes }
          : { sub_criterion: s.id, grade: s.grade, notes: s.notes },
      )
    const comments = pillars.map((p) => ({ pillar: p.code, comment: p.comment }))
    try {
      await saveScoring.mutateAsync({ grades, comments })
    } catch {
      setError('Could not save scoring. Check that every numeric field has a figure.')
    }
  }

  const verdictVariant = (v: string) =>
    v === 'GO' ? 'success' : v === 'CONDITIONAL' ? 'warning' : 'destructive'

  return (
    <div className="space-y-5">
      {/* Overall summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-5 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Weighted Total</p>
          <p className="text-4xl font-bold tabular-nums text-slate-800">
            {live.weighted.toFixed(1)}
            <span className="text-lg font-normal text-muted-foreground"> / 100</span>
          </p>
        </div>
        <div className="text-right">
          {server?.verdict ? (
            <Badge variant={verdictVariant(server.verdict)} className="text-sm">
              {server.verdict === 'GO' ? 'GO' : server.verdict === 'CONDITIONAL' ? 'CONDITIONAL GO' : 'NO-GO'}
            </Badge>
          ) : (
            <p className="max-w-xs text-xs text-muted-foreground">
              {live.complete ? 'Verdict bands are not configured.' : 'Score every sub-criterion to see the verdict.'}
            </p>
          )}
        </div>
      </div>

      {/* Pillars */}
      {pillars.map((p) => {
        const lp = live.perPillar.find((x) => x.code === p.code)!
        return (
          <Card key={p.code} className="overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-slate-700 to-slate-400" />
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-white">
                      {p.code}
                    </span>
                    {p.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">weight {p.weight_pct}%</span>
                  </p>
                  {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="tabular-nums text-muted-foreground">
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
                  <div key={s.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          weight {s.weight_in_pillar}% within pillar
                          {s.input_type === 'NUMERIC' && (
                            <span className="ml-1 text-slate-400">· auto-scored from figure</span>
                          )}
                        </p>
                      </div>

                      {s.input_type === 'NUMERIC' ? (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              disabled={!editable}
                              value={s.measured_value ?? ''}
                              onChange={(e) => setMeasured(p.code, s.id, e.target.value)}
                              placeholder="figure"
                              className="h-9 w-28 rounded-md border border-input bg-background px-3 pr-10 text-sm tabular-nums outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
                            />
                            {s.unit && (
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {s.unit}
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold ${
                              s.grade ? SCORE_TONE[s.grade] : 'bg-slate-100 text-slate-400'
                            }`}
                            title="Derived score"
                          >
                            {s.grade ?? '–'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          {GRADES.map((g) => {
                            const selected = s.grade === g.value
                            const def =
                              g.value === 1 ? s.band_1_def : g.value === 3 ? s.band_3_def : s.band_5_def
                            return (
                              <button
                                key={g.value}
                                type="button"
                                disabled={!editable}
                                title={def ? `${g.hint}: ${def}` : g.hint}
                                onClick={() => setGrade(p.code, s.id, g.value)}
                                className={`h-9 w-10 rounded-md border text-sm font-semibold transition-colors disabled:opacity-60 ${
                                  selected ? g.active : 'border-input bg-background hover:bg-accent'
                                }`}
                              >
                                {g.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Band reference for numeric criteria */}
                    {s.input_type === 'NUMERIC' && (s.band_1_def || s.band_5_def) && (
                      <p className="mt-1.5 text-xs text-slate-400">
                        {s.band_5_def && <span>5: {s.band_5_def}</span>}
                        {s.band_3_def && <span> · 3: {s.band_3_def}</span>}
                        {s.band_1_def && <span> · 1: {s.band_1_def}</span>}
                      </p>
                    )}
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
