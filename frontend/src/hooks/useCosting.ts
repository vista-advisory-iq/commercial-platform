import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/costing'
import type { CostLine } from '@/types'

export function useCostModel(dealId: string) {
  return useQuery({
    queryKey: ['cost-model', dealId],
    queryFn: () => api.getCostModelForDeal(dealId),
    enabled: !!dealId,
  })
}

function useCostMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>, dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-model', dealId] }),
  })
}

export function useCreateCostModel(dealId: string) {
  return useCostMutation(() => api.createCostModel(dealId), dealId)
}

export function useUpdateAssumptions(id: string, dealId: string) {
  return useCostMutation((data: api.Assumptions) => api.updateAssumptions(id, data), dealId)
}

export function useLineMutations(dealId: string) {
  const create = useCostMutation((data: Partial<CostLine>) => api.createLine(data), dealId)
  const update = useCostMutation(({ id, data }: { id: string; data: Partial<CostLine> }) => api.updateLine(id, data), dealId)
  const remove = useCostMutation((id: string) => api.deleteLine(id), dealId)
  return { create, update, remove }
}
