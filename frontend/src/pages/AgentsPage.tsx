import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useCreateSalesAgent, useSalesAgents, useUpdateSalesAgent } from '@/hooks/useAgents'
import type { SalesAgent } from '@/types'

const EMPTY = {
  name: '',
  company: '',
  email: '',
  phone: '',
  agreement_signed_on: '',
  default_fee_pct: '',
  notes: '',
}

export function AgentsPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'ANALYST' || user?.role === 'MANAGER'
  const { data, isLoading } = useSalesAgents()
  const createAgent = useCreateSalesAgent()
  const updateAgent = useUpdateSalesAgent()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  const agents = data?.results ?? []
  const protectionDays = agents[0]?.protection_days

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value })

  const submit = () => {
    setError('')
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    createAgent.mutate(
      {
        ...form,
        agreement_signed_on: form.agreement_signed_on || null,
        default_fee_pct: form.default_fee_pct || null,
      } as Partial<SalesAgent>,
      {
        onSuccess: () => {
          setAdding(false)
          setForm(EMPTY)
        },
        onError: () => setError('Could not create agent — check the fields and try again.'),
      },
    )
  }

  const toggleStatus = (agent: SalesAgent) => {
    updateAgent.mutate({
      id: agent.id,
      data: { status: agent.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales Agents</h1>
          <p className="text-sm text-muted-foreground">
            External finders who source deals. Attribution is recorded on each deal's intake
            {protectionDays ? ` — finder protection runs ${protectionDays} days from introduction.` : '.'}
          </p>
        </div>
        {canManage && !adding && <Button onClick={() => setAdding(true)}>Add agent</Button>}
      </div>

      {canManage && adding && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Sales Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={set('name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={form.company} onChange={set('company')} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={set('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Agreement signed on</Label>
                <Input type="date" value={form.agreement_signed_on} onChange={set('agreement_signed_on')} />
              </div>
              <div className="space-y-1.5">
                <Label>Default fee (%)</Label>
                <Input type="number" step="0.01" min={0} max={100} value={form.default_fee_pct} onChange={set('default_fee_pct')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={set('notes')} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={submit} disabled={createAgent.isPending}>
                {createAgent.isPending ? 'Saving…' : 'Save agent'}
              </Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setError('') }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : agents.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No sales agents registered yet{canManage ? ' — add the first one above.' : '.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Agreement</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Deals</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.name}</div>
                      {a.company && <div className="text-xs text-muted-foreground">{a.company}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div>{a.email || '—'}</div>
                      {a.phone && <div className="text-xs text-muted-foreground">{a.phone}</div>}
                    </td>
                    <td className="px-4 py-3">{a.agreement_signed_on ?? '—'}</td>
                    <td className="px-4 py-3">{a.default_fee_pct ? `${a.default_fee_pct}%` : '—'}</td>
                    <td className="px-4 py-3">{a.deal_count}</td>
                    <td className="px-4 py-3">
                      <Badge className={a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}>
                        {a.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(a)}
                          disabled={updateAgent.isPending}
                        >
                          {a.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
