import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/notifications'
import type { NotifFilter } from '@/api/notifications'

/** `channel` keeps the two inboxes (messages vs alerts) cached separately. */
export function useUnreadCount(channel: string, filter?: NotifFilter) {
  return useQuery({
    queryKey: ['notif-unread', channel],
    queryFn: () => api.getUnreadCount(filter),
    refetchInterval: 30_000, // poll for new items
  })
}

export function useNotifications(channel: string, filter?: NotifFilter, enabled = true) {
  return useQuery({
    queryKey: ['notifs', channel],
    queryFn: () => api.getNotifications(filter),
    enabled,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  // Refresh both channels — a read affects whichever inbox the item belongs to.
  return () => {
    qc.invalidateQueries({ queryKey: ['notif-unread'] })
    qc.invalidateQueries({ queryKey: ['notifs'] })
  }
}

export function useMarkRead() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.markRead(id), onSuccess: invalidate })
}

export function useMarkAllRead(filter?: NotifFilter) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: () => api.markAllRead(filter), onSuccess: invalidate })
}
