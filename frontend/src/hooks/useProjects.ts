import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/projects'
import type { HandoverItem, Milestone, Risk } from '@/types'

export function useProject(dealId: string) {
  return useQuery({
    queryKey: ['project', dealId],
    queryFn: () => api.getProjectForDeal(dealId),
    enabled: !!dealId,
  })
}

export function useProjectHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['project-history', id],
    queryFn: () => api.getProjectHistory(id!),
    enabled: !!id,
  })
}

function useProjectMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>, dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', dealId] })
      qc.invalidateQueries({ queryKey: ['project-history'] })
    },
  })
}

export function useChangeProjectStatus(id: string, dealId: string) {
  return useProjectMutation(
    ({ status, reason }: { status: string; reason: string }) => api.changeProjectStatus(id, status, reason),
    dealId,
  )
}

export function useUpdateProjectDetails(id: string, dealId: string) {
  return useProjectMutation((details: api.ProjectDetails) => api.updateProjectDetails(id, details), dealId)
}

export function useMilestoneMutations(dealId: string) {
  const create = useProjectMutation((data: Partial<Milestone>) => api.createMilestone(data), dealId)
  const update = useProjectMutation(({ id, data }: { id: string; data: Partial<Milestone> }) => api.updateMilestone(id, data), dealId)
  const remove = useProjectMutation((id: string) => api.deleteMilestone(id), dealId)
  return { create, update, remove }
}

export function useHandoverMutations(dealId: string) {
  const update = useProjectMutation(
    ({ id, data }: { id: string; data: Partial<HandoverItem> }) => api.updateHandoverItem(id, data),
    dealId,
  )
  return { update }
}

export function useRiskMutations(dealId: string) {
  const create = useProjectMutation((data: Partial<Risk>) => api.createRisk(data), dealId)
  const update = useProjectMutation(({ id, data }: { id: string; data: Partial<Risk> }) => api.updateRisk(id, data), dealId)
  const remove = useProjectMutation((id: string) => api.deleteRisk(id), dealId)
  return { create, update, remove }
}
