import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/editRequests'

export function useEditRequests() {
  return useQuery({ queryKey: ['edit-requests'], queryFn: api.getEditRequests })
}

export function useApproveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.approveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['edit-requests'] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useDenyRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.denyRequest(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edit-requests'] }),
  })
}
