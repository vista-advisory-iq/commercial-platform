import client from './client'
import type { EditAccessRequest, PaginatedResponse } from '@/types'

export async function getEditRequests(): Promise<PaginatedResponse<EditAccessRequest>> {
  const res = await client.get('/edit-access-requests/')
  return res.data
}

export async function approveRequest(id: string): Promise<EditAccessRequest> {
  const res = await client.post(`/edit-access-requests/${id}/approve/`)
  return res.data
}

export async function denyRequest(id: string, reason: string): Promise<EditAccessRequest> {
  const res = await client.post(`/edit-access-requests/${id}/deny/`, { reason })
  return res.data
}
