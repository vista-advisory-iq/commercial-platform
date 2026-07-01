import client from './client'
import type { CostModel, CostLine, PaginatedResponse } from '@/types'

export async function getCostModelForDeal(dealId: string): Promise<CostModel | null> {
  const res = await client.get<PaginatedResponse<CostModel>>('/cost-models/', { params: { deal: dealId } })
  return res.data.results[0] ?? null
}

export async function createCostModel(dealId: string): Promise<CostModel> {
  const res = await client.post('/cost-models/', { deal: dealId })
  return res.data
}

export interface Assumptions {
  currency?: string
  annual_revenue?: string | null
  project_life_years?: number | null
  debt_pct?: string | null
  interest_rate_pct?: string | null
  debt_tenor_years?: number | null
  discount_rate_pct?: string | null
  notes?: string
}

export async function updateAssumptions(id: string, data: Assumptions): Promise<CostModel> {
  const res = await client.patch(`/cost-models/${id}/`, data)
  return res.data
}

export async function createLine(data: Partial<CostLine>): Promise<CostLine> {
  const res = await client.post('/cost-lines/', data)
  return res.data
}
export async function updateLine(id: string, data: Partial<CostLine>): Promise<CostLine> {
  const res = await client.patch(`/cost-lines/${id}/`, data)
  return res.data
}
export async function deleteLine(id: string): Promise<void> {
  await client.delete(`/cost-lines/${id}/`)
}
