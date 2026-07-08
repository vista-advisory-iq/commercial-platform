import { useState } from 'react'
import { useComments, usePostComment } from '@/hooks/useDeals'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  BD: 'BD', ANALYST: 'Analyst', MANAGER: 'Manager', ADMIN: 'Admin',
}

export function DealChat({ dealId }: { dealId: string }) {
  const { user } = useAuth()
  const { data: comments, isLoading } = useComments(dealId)
  const post = usePostComment(dealId)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const send = async () => {
    if (!body.trim()) return
    setError('')
    try {
      await post.mutateAsync(body.trim())
      setBody('')
    } catch {
      setError('Could not send the message.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {comments && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet. Ask the BD a question or add a clarification.</p>
        )}
        {comments?.map((c) => {
          const mine = c.author === user?.id
          return (
            <div key={c.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <div className="mb-0.5 flex items-center gap-2 text-xs opacity-80">
                  <span className="font-medium">{c.author_name || 'User'}</span>
                  <Badge variant={mine ? 'secondary' : 'muted'} className="px-1.5 py-0 text-[10px]">
                    {ROLE_LABELS[c.author_role] ?? c.author_role}
                  </Badge>
                  <span>{new Date(c.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
          placeholder="Write a message… (Ctrl/⌘+Enter to send)"
        />
        <Button onClick={send} disabled={!body.trim() || post.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
