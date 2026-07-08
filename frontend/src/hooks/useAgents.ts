import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/agents'
import type { SalesAgent } from '@/types'

export function useSalesAgents() {
  return useQuery({ queryKey: ['sales-agents'], queryFn: api.getSalesAgents })
}

export function useCreateSalesAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SalesAgent>) => api.createSalesAgent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-agents'] }),
  })
}

export function useUpdateSalesAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SalesAgent> }) => api.updateSalesAgent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-agents'] }),
  })
}
