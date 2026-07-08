import { useState } from 'react'
import {
  useProject, useProjectHistory, useChangeProjectStatus, useUpdateProjectDetails,
  useMilestoneMutations, useRiskMutations, useHandoverMutations,
} from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus } from 'lucide-react'
import type { Health, Milestone, MilestoneStatus, Project, ProjectStatus, Risk } from '@/types'

const STATUS: Record<ProjectStatus, { label: string; variant: 'muted' | 'info' | 'warning' | 'success' | 'destructive' }> = {
  NOT_STARTED: { label: 'Not Started', variant: 'muted' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  ON_HOLD: { label: 'On Hold', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
}
const HEALTH: Record<Health, string> = { GREEN: 'bg-green-500', AMBER: 'bg-yellow-500', RED: 'bg-red-500' }
const MS_STATUS: MilestoneStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED']
const TRANSITIONS: Record<ProjectStatus, { to: ProjectStatus; label: string }[]> = {
  NOT_STARTED: [{ to: 'IN_PROGRESS', label: 'Start' }, { to: 'CANCELLED', label: 'Cancel' }],
  IN_PROGRESS: [{ to: 'ON_HOLD', label: 'Put On Hold' }, { to: 'COMPLETED', label: 'Complete' }, { to: 'CANCELLED', label: 'Cancel' }],
  ON_HOLD: [{ to: 'IN_PROGRESS', label: 'Resume' }, { to: 'CANCELLED', label: 'Cancel' }],
  COMPLETED: [],
  CANCELLED: [],
}

export function ProjectPanel({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: project, isLoading } = useProject(dealId)
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading project…</p>
  if (!project) {
    return <p className="text-sm text-muted-foreground">The delivery project opens automatically once the proposal is accepted.</p>
  }
  return <ProjectBody project={project} dealId={dealId} canEdit={canEdit} />
}

function ProjectBody({ project, dealId, canEdit }: { project: Project; dealId: string; canEdit: boolean }) {
  const changeStatus = useChangeProjectStatus(project.id, dealId)
  const updateDetails = useUpdateProjectDetails(project.id, dealId)
  const ms = useMilestoneMutations(dealId)
  const risk = useRiskMutations(dealId)
  const handover = useHandoverMutations(dealId)
  const { data: history } = useProjectHistory(project.id)

  const [note, setNote] = useState(project.status_note)
  const [newMs, setNewMs] = useState({ name: '', owner: '', due_date: '' })
  const [newRisk, setNewRisk] = useState({ description: '', kind: 'RISK', severity: 'MEDIUM' })
  const st = STATUS[project.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant={st.variant}>{st.label}</Badge>
          <span className="flex items-center gap-1.5 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${HEALTH[project.health]}`} />
            {project.health}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${project.percent_complete}%` }} />
          </div>
          {project.percent_complete}% complete
        </div>
      </div>

      {/* Lifecycle */}
      {canEdit && TRANSITIONS[project.status].length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[project.status].map((t) => (
            <Button
              key={t.to}
              size="sm"
              variant={t.to === 'CANCELLED' ? 'outline' : 'default'}
              onClick={() => changeStatus.mutate({ status: t.to, reason: '' })}
              disabled={changeStatus.isPending}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {canEdit && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Health</label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={project.health}
              onChange={(e) => updateDetails.mutate({ health: e.target.value as Health })}
            >
              {(['GREEN', 'AMBER', 'RED'] as Health[]).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        )}
        {(['planned_start', 'planned_end', 'actual_start', 'actual_end'] as const).map((f) => (
          <div key={f} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground capitalize">{f.replace('_', ' ')}</label>
            <Input
              type="date" disabled={!canEdit} defaultValue={project[f] ?? ''}
              onBlur={(e) => canEdit && updateDetails.mutate({ [f]: e.target.value || null })}
            />
          </div>
        ))}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Status note</label>
          <Textarea rows={2} disabled={!canEdit} value={note} onChange={(e) => setNote(e.target.value)}
            onBlur={() => canEdit && note !== project.status_note && updateDetails.mutate({ status_note: note })} />
        </div>
      </div>

      {/* Handover checklist */}
      {(project.handover_items ?? []).length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-semibold">
            Commercial → Delivery Handover
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {project.handover_items.filter((h) => h.done).length}/{project.handover_items.length} complete
            </span>
          </h4>
          <ul className="divide-y overflow-hidden rounded-lg border">
            {project.handover_items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={item.done}
                  disabled={!canEdit || handover.update.isPending}
                  onChange={(e) => handover.update.mutate({ id: item.id, data: { done: e.target.checked } })}
                />
                <span className={item.done ? 'text-muted-foreground line-through' : ''}>{item.name}</span>
                {item.done && item.done_by_name && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.done_by_name}
                    {item.done_at && ` · ${new Date(item.done_at).toLocaleDateString()}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Milestones */}
      <section>
        <h4 className="mb-2 text-sm font-semibold">Milestones</h4>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Due</th><th className="px-3 py-2">Status</th><th /></tr>
            </thead>
            <tbody>
              {project.milestones.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No milestones yet.</td></tr>
              )}
              {project.milestones.map((m: Milestone) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.owner || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.due_date || '—'}</td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <select className="rounded border border-input bg-background px-1.5 py-1 text-xs" value={m.status}
                        onChange={(e) => ms.update.mutate({ id: m.id, data: { status: e.target.value as MilestoneStatus } })}>
                        {MS_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <Badge variant="muted">{m.status}</Badge>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && (
                      <button onClick={() => ms.remove.mutate(m.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Milestone name" value={newMs.name} onChange={(e) => setNewMs({ ...newMs, name: e.target.value })} />
            <Input className="max-w-[10rem]" placeholder="Owner" value={newMs.owner} onChange={(e) => setNewMs({ ...newMs, owner: e.target.value })} />
            <Input className="max-w-[10rem]" type="date" value={newMs.due_date} onChange={(e) => setNewMs({ ...newMs, due_date: e.target.value })} />
            <Button size="sm" disabled={!newMs.name.trim() || ms.create.isPending}
              onClick={() => ms.create.mutate({ project: project.id, name: newMs.name, owner: newMs.owner, due_date: newMs.due_date || null }, { onSuccess: () => setNewMs({ name: '', owner: '', due_date: '' }) })}>
              <Plus className="mr-1 h-3.5 w-3.5" />Add
            </Button>
          </div>
        )}
      </section>

      {/* Risks */}
      <section>
        <h4 className="mb-2 text-sm font-semibold">Risks &amp; Issues</h4>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Status</th><th /></tr>
            </thead>
            <tbody>
              {project.risks.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No risks or issues logged.</td></tr>
              )}
              {project.risks.map((r: Risk) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.kind}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2">
                    <Badge variant={r.severity === 'HIGH' ? 'destructive' : r.severity === 'MEDIUM' ? 'warning' : 'muted'}>{r.severity}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <select className="rounded border border-input bg-background px-1.5 py-1 text-xs" value={r.status}
                        onChange={(e) => risk.update.mutate({ id: r.id, data: { status: e.target.value as Risk['status'] } })}>
                        {['OPEN', 'MITIGATING', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <Badge variant="muted">{r.status}</Badge>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canEdit && (
                      <button onClick={() => risk.remove.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="mt-2 flex flex-wrap gap-2">
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={newRisk.kind} onChange={(e) => setNewRisk({ ...newRisk, kind: e.target.value })}>
              <option value="RISK">Risk</option><option value="ISSUE">Issue</option>
            </select>
            <Input className="max-w-md" placeholder="Description" value={newRisk.description} onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })} />
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={newRisk.severity} onChange={(e) => setNewRisk({ ...newRisk, severity: e.target.value })}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
            </select>
            <Button size="sm" disabled={!newRisk.description.trim() || risk.create.isPending}
              onClick={() => risk.create.mutate({ project: project.id, kind: newRisk.kind as Risk['kind'], description: newRisk.description, severity: newRisk.severity as Risk['severity'] }, { onSuccess: () => setNewRisk({ description: '', kind: 'RISK', severity: 'MEDIUM' }) })}>
              <Plus className="mr-1 h-3.5 w-3.5" />Add
            </Button>
          </div>
        )}
      </section>

      {/* Timeline */}
      {history && history.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h4>
          <ol className="space-y-1 text-sm text-muted-foreground">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium text-foreground">{h.to_status}</span>
                <span>· {h.actor_name || 'System'}</span>
                <span>· {new Date(h.occurred_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {h.reason && <span className="w-full text-xs">{h.reason}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
