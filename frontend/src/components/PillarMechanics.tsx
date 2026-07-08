import { useState } from 'react'
import { useScoring } from '@/hooks/useDeals'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Lock } from 'lucide-react'

interface Props {
  dealId: string
  /** True while Stage 1 is still open — shown as a read-only reference panel. */
  locked?: boolean
  defaultOpen?: boolean
}

/**
 * "The Five Pillars — Weightings & Scoring Mechanics" (Deal Screening
 * Framework). Follows the Stage 1 gates so assessors see how Stage 2 will be
 * scored before (and while) they score it. Weights, sub-criteria counts and
 * pillar minimums come from the same scoring endpoint the ScoringPanel uses,
 * so this stays in sync with the seeded framework; verdict bands come from
 * settings.STAGE2_SCORE_BANDS via the API and are never hardcoded here.
 */
export function PillarMechanics({ dealId, locked = false, defaultOpen }: Props) {
  const { data } = useScoring(dealId)
  const [open, setOpen] = useState(defaultOpen ?? locked)

  if (!data?.pillars.length) return null

  const totalSubs = data.pillars.reduce((n, p) => n + p.sub_criteria.length, 0)
  const go = data.bands?.GO
  const cond = data.bands?.CONDITIONAL

  return (
    <Card className={locked ? 'border-dashed' : ''}>
      <CardContent className="pt-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Stage 2 — The Five Pillars: Weightings &amp; Scoring Mechanics
          </span>
          {locked && (
            <Badge variant="muted" className="shrink-0">
              <Lock className="mr-1 h-3 w-3" />
              Unlocks after Stage 1
            </Badge>
          )}
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            {locked && (
              <p className="text-sm text-muted-foreground">
                Deals that clear the knockout gates are scored on five weighted pillars.
                Scoring opens once Stage 1 is finalised — a knockout ends the process at the gates.
              </p>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Pillar</th>
                    <th className="px-3 py-2 text-right">Weight</th>
                    <th className="px-3 py-2">Sub-criteria</th>
                    <th className="px-3 py-2">Pillar minimum</th>
                    <th className="px-3 py-2">Weighted contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.pillars.map((p) => {
                    const max = p.sub_criteria.length * 5
                    return (
                      <tr key={p.code}>
                        <td className="px-3 py-2">
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[11px] font-bold text-white">
                            {p.code}
                          </span>
                          <span className="font-medium">{p.name}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{p.weight_pct}%</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.sub_criteria.length} × graded 1–5</td>
                        <td className="px-3 py-2 tabular-nums">
                          {p.pass_threshold != null ? `≥ ${p.pass_threshold} of ${max}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          (raw ÷ {max}) × {p.weight_pct}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">{data.weight_sum}%</td>
                    <td className="px-3 py-2">{totalSubs} sub-criteria</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-xs">Weighted total 0–100</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
              <li>
                Every sub-criterion is graded against its band definitions — <strong>1</strong> deal-breaker
                weakness · <strong>3</strong> acceptable / mitigable · <strong>5</strong> fully de-risked.
                Numeric criteria are auto-scored from the measured figure.
              </li>
              <li>
                Each pillar's <strong>raw sum</strong> must clear its minimum; a shortfall is flagged to the
                committee even when the overall total is high.
              </li>
              <li>
                <strong>Weighted total</strong> = Σ (pillar raw ÷ pillar max) × pillar weight, on a 0–100 scale.
              </li>
              <li>
                {go != null && cond != null ? (
                  <>
                    Verdict bands: <strong className="text-emerald-700">≥ {go} GO</strong> ·{' '}
                    <strong className="text-amber-700">{cond}–{go - 1} CONDITIONAL GO</strong> ·{' '}
                    <strong className="text-red-700">&lt; {cond} NO-GO</strong> — a framework{' '}
                    <em>recommendation</em>; the Management Investment Committee takes the binding
                    decision with a documented rationale.
                  </>
                ) : (
                  <>Verdict bands are pending DEL sign-off — the committee decides on the numbers alone.</>
                )}
              </li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
