import client from './client'
import type {
  Project, ProjectHistoryEntry, Milestone, Risk, Health, HandoverItem, PaginatedResponse,
} from '@/types'

export async function getProjectForDeal(dealId: string): Promise<Project | null> {
  const res = await client.get<PaginatedResponse<Project>>('/projects/', { params: { deal: dealId } })
  return res.data.results[0] ?? null
}

export async function changeProjectStatus(id: string, status: string, reason: string): Promise<Project> {
  const res = await client.post(`/projects/${id}/change_status/`, { status, reason })
  return res.data
}

export interface ProjectDetails {
  health?: Health
  status_note?: string
  planned_start?: string | null
  planned_end?: string | null
  actual_start?: string | null
  actual_end?: string | null
}

export async function updateProjectDetails(id: string, details: ProjectDetails): Promise<Project> {
  const res = await client.patch(`/projects/${id}/`, details)
  return res.data
}

export async function getProjectHistory(id: string): Promise<ProjectHistoryEntry[]> {
  const res = await client.get(`/projects/${id}/history/`)
  return res.data
}

export async function createMilestone(data: Partial<Milestone>): Promise<Milestone> {
  const res = await client.post('/milestones/', data)
  return res.data
}
export async function updateMilestone(id: string, data: Partial<Milestone>): Promise<Milestone> {
  const res = await client.patch(`/milestones/${id}/`, data)
  return res.data
}
export async function deleteMilestone(id: string): Promise<void> {
  await client.delete(`/milestones/${id}/`)
}

export async function createRisk(data: Partial<Risk>): Promise<Risk> {
  const res = await client.post('/risks/', data)
  return res.data
}
export async function updateRisk(id: string, data: Partial<Risk>): Promise<Risk> {
  const res = await client.patch(`/risks/${id}/`, data)
  return res.data
}
export async function deleteRisk(id: string): Promise<void> {
  await client.delete(`/risks/${id}/`)
}

export async function updateHandoverItem(id: string, data: Partial<HandoverItem>): Promise<HandoverItem> {
  const res = await client.patch(`/handover-items/${id}/`, data)
  return res.data
}
