import client from './client'
import type { PaginatedResponse, SalesAgent } from '@/types'

export async function getSalesAgents(): Promise<PaginatedResponse<SalesAgent>> {
  const res = await client.get('/sales-agents/')
  return res.data
}

export async function createSalesAgent(data: Partial<SalesAgent>): Promise<SalesAgent> {
  const res = await client.post('/sales-agents/', data)
  return res.data
}

export async function updateSalesAgent(id: string, data: Partial<SalesAgent>): Promise<SalesAgent> {
  const res = await client.patch(`/sales-agents/${id}/`, data)
  return res.data
}
