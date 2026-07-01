import type { FieldHistoryEntry, StateHistoryEntry } from '@/types'
import { DealStateBadge } from './DealStateBadge'
import type { DealState } from '@/types'

interface Props {
  stateHistory: StateHistoryEntry[]
  fieldHistory: FieldHistoryEntry[]
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function AuditTimeline({ stateHistory, fieldHistory }: Props) {
  return (
    <div className="space-y-8">
      {/* State transitions */}
      <section>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          State Transitions
        </h4>
        {stateHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transitions yet.</p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-4">
            {stateHistory.map((entry) => (
              <li key={entry.id} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-muted-foreground" />
                <div className="flex flex-wrap items-center gap-2">
                  {entry.from_state && (
                    <>
                      <DealStateBadge state={entry.from_state as DealState} />
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <DealStateBadge state={entry.to_state as DealState} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actor_name ?? 'System'} · {fmt(entry.occurred_at)}
                </p>
                {entry.reason && (
                  <p className="mt-1 rounded bg-muted px-2 py-1 text-xs">{entry.reason}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Field changes */}
      {fieldHistory.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Field Changes
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4">Field</th>
                  <th className="pb-2 pr-4">Old value</th>
                  <th className="pb-2 pr-4">New value</th>
                  <th className="pb-2 pr-4">By</th>
                  <th className="pb-2">When</th>
                </tr>
              </thead>
              <tbody>
                {fieldHistory.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{entry.entity}.{entry.field_name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{entry.old_value ?? '—'}</td>
                    <td className="py-2 pr-4">{entry.new_value ?? '—'}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{entry.actor_name ?? '—'}</td>
                    <td className="py-2 text-muted-foreground">{fmt(entry.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
