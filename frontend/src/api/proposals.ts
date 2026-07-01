import client from './client'
import type { Proposal, ProposalHistoryEntry, ProposalOffer, PaginatedResponse } from '@/types'

export async function getProposalForDeal(dealId: string): Promise<Proposal | null> {
  const res = await client.get<PaginatedResponse<Proposal>>('/proposals/', { params: { deal: dealId } })
  return res.data.results[0] ?? null
}

export async function createProposal(dealId: string): Promise<Proposal> {
  const res = await client.post('/proposals/', { deal: dealId })
  return res.data
}

export async function updateOffer(id: string, offer: Partial<ProposalOffer>): Promise<Proposal> {
  const res = await client.patch(`/proposals/${id}/`, offer)
  return res.data
}

export async function submitProposal(id: string): Promise<Proposal> {
  const res = await client.post(`/proposals/${id}/submit/`)
  return res.data
}

export async function returnProposal(id: string, reason: string): Promise<Proposal> {
  const res = await client.post(`/proposals/${id}/return/`, { reason })
  return res.data
}

export async function sendProposal(id: string): Promise<Proposal> {
  const res = await client.post(`/proposals/${id}/send/`)
  return res.data
}

export async function recordOutcome(id: string, accepted: boolean, reason: string): Promise<Proposal> {
  const res = await client.post(`/proposals/${id}/outcome/`, { accepted, reason })
  return res.data
}

export async function getProposalHistory(id: string): Promise<ProposalHistoryEntry[]> {
  const res = await client.get(`/proposals/${id}/history/`)
  return res.data
}

export async function downloadProposalPdf(id: string): Promise<Blob> {
  const res = await client.get(`/proposals/${id}/document/`, { responseType: 'blob' })
  return res.data
}
