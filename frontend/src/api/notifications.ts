import client from './client'
import type { AppNotification, PaginatedResponse } from '@/types'

export interface NotifFilter {
  kind?: string
  excludeKind?: string
}

function toParams(filter?: NotifFilter, extra?: Record<string, string>) {
  const p: Record<string, string> = { ...extra }
  if (filter?.kind) p.kind = filter.kind
  if (filter?.excludeKind) p.exclude_kind = filter.excludeKind
  return p
}

export async function getNotifications(filter?: NotifFilter): Promise<PaginatedResponse<AppNotification>> {
  const res = await client.get('/notifications/', { params: toParams(filter) })
  return res.data
}

export async function getUnreadCount(filter?: NotifFilter): Promise<number> {
  const res = await client.get('/notifications/unread_count/', { params: toParams(filter) })
  return res.data.count
}

export async function markRead(id: string): Promise<AppNotification> {
  const res = await client.post(`/notifications/${id}/read/`)
  return res.data
}

export async function markAllRead(filter?: NotifFilter): Promise<void> {
  await client.post('/notifications/mark_all_read/', null, { params: toParams(filter) })
}
