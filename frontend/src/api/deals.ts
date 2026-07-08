import client from './client'
import type { Deal, DealComment, DealHistory, DealIntake, DealListItem, GateResult, GateVerdict, PaginatedResponse, ScoringResult } from '@/types'

export async function getDeals(params?: Record<string, string>): Promise<PaginatedResponse<DealListItem>> {
  const res = await client.get('/deals/', { params })
  return res.data
}

export async function getDrafts(): Promise<PaginatedResponse<DealListItem>> {
  const res = await client.get('/deals/drafts/')
  return res.data
}

export async function getDeal(id: string): Promise<Deal> {
  const res = await client.get(`/deals/${id}/`)
  return res.data
}

export async function createDeal(intake: Partial<DealIntake>): Promise<Deal> {
  const res = await client.post('/deals/', { intake })
  return res.data
}

export async function updateDeal(id: string, intake: Partial<DealIntake>): Promise<Deal> {
  const res = await client.patch(`/deals/${id}/`, { intake })
  return res.data
}

export async function submitDeal(id: string): Promise<Deal> {
  const res = await client.post(`/deals/${id}/submit/`)
  return res.data
}

export async function takeDeal(id: string): Promise<Deal> {
  const res = await client.post(`/deals/${id}/take/`)
  return res.data
}

export async function rejectDeal(id: string, reason: string): Promise<Deal> {
  const res = await client.post(`/deals/${id}/reject/`, { reason })
  return res.data
}

export async function getGates(id: string): Promise<GateResult[]> {
  const res = await client.get(`/deals/${id}/gates/`)
  return res.data
}

export interface GateInput {
  gate: number
  verdict: GateVerdict
  evidence_notes: string
}

export async function saveGates(id: string, results: GateInput[]): Promise<GateResult[]> {
  const res = await client.post(`/deals/${id}/gates/`, { results })
  return res.data
}

export async function finalizeStage1(id: string): Promise<Deal> {
  const res = await client.post(`/deals/${id}/finalize_stage1/`)
  return res.data
}

export async function getScoring(id: string): Promise<ScoringResult> {
  const res = await client.get(`/deals/${id}/scoring/`)
  return res.data
}

export interface ScoreInput {
  sub_criterion: number
  grade?: number | null
  measured_value?: string | null
  notes: string
}

export interface CommentInput {
  pillar: string
  comment: string
}

export async function saveScoring(
  id: string,
  grades: ScoreInput[],
  comments: CommentInput[],
): Promise<ScoringResult> {
  const res = await client.post(`/deals/${id}/scoring/`, { grades, comments })
  return res.data
}

export async function submitForReview(id: string): Promise<Deal> {
  const res = await client.post(`/deals/${id}/submit-for-review/`)
  return res.data
}

export async function decideStage2(
  id: string,
  decision: 'GO' | 'CONDITIONAL' | 'NO_GO',
  rationale: string,
): Promise<Deal> {
  const res = await client.post(`/deals/${id}/decide_stage2/`, { decision, rationale })
  return res.data
}

export async function classifyDeal(
  id: string,
  classification: 'ACTIVE' | 'NURTURE' | 'DEFERRED',
  note: string,
  nextReviewDate: string | null,
): Promise<Deal> {
  const res = await client.post(`/deals/${id}/classify/`, {
    classification,
    note,
    next_review_date: nextReviewDate,
  })
  return res.data
}

async function downloadBlob(url: string, filename: string): Promise<void> {
  const res = await client.get(url, { responseType: 'blob' })
  const objectUrl = window.URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(objectUrl)
}

export async function downloadScreeningMemo(id: string, dealRef: string): Promise<void> {
  await downloadBlob(`/deals/${id}/screening-memo/`, `${dealRef}-screening-memo.pdf`)
}

export async function downloadDeclineLetter(id: string, dealRef: string): Promise<void> {
  await downloadBlob(`/deals/${id}/decline-letter/`, `${dealRef}-decline-letter.pdf`)
}

export async function downloadReport(id: string, format: 'pdf' | 'docx', dealRef: string): Promise<void> {
  const res = await client.get(`/deals/${id}/report/`, {
    params: { fmt: format }, // 'format' is reserved by DRF content negotiation
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${dealRef}-committee-report.${format}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function getDealHistory(id: string): Promise<DealHistory> {
  const res = await client.get(`/deals/${id}/history/`)
  return res.data
}

export async function requestEdit(id: string, justification: string) {
  const res = await client.post(`/deals/${id}/request-edit/`, { justification })
  return res.data
}

export async function getComments(id: string): Promise<DealComment[]> {
  const res = await client.get(`/deals/${id}/comments/`)
  return res.data
}

export async function postComment(id: string, body: string): Promise<DealComment> {
  const res = await client.post(`/deals/${id}/comments/`, { body })
  return res.data
}
