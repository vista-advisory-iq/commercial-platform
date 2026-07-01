import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications'
import type { NotifFilter } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import type { AppNotification } from '@/types'

interface Props {
  channel: string
  filter: NotifFilter
  icon: LucideIcon
  title: string
  emptyText: string
  badgeClass?: string
}

export function NotificationMenu({ channel, filter, icon: Icon, title, emptyText, badgeClass }: Props) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: unread = 0 } = useUnreadCount(channel, filter)
  const { data, isLoading } = useNotifications(channel, filter, open) // fetch list only when open
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead(filter)

  const items = data?.results ?? []

  const handleOpen = (n: AppNotification) => {
    if (!n.is_read) markRead.mutate(n.id)
    setOpen(false)
    if (n.deal) navigate(`/deals/${n.deal}`)
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} title={title}>
        <Icon className="h-4 w-4" />
        {unread > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${badgeClass ?? 'bg-destructive'}`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-semibold">{title}</span>
              {unread > 0 && (
                <button className="text-xs text-primary hover:underline" onClick={() => markAllRead.mutate()}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>}
              {!isLoading && items.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={`block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-accent ${n.is_read ? '' : 'bg-blue-50/50'}`}
                >
                  <p className="text-sm">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
