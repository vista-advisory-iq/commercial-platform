import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/proposals'
import type { ProposalOffer } from '@/types'

export function useProposal(dealId: string) {
  return useQuery({
    queryKey: ['proposal', dealId],
    queryFn: () => api.getProposalForDeal(dealId),
    enabled: !!dealId,
  })
}

export function useProposalHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['proposal-history', id],
    queryFn: () => api.getProposalHistory(id!),
    enabled: !!id,
  })
}

function useProposalMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>, dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposal', dealId] })
      qc.invalidateQueries({ queryKey: ['proposal-history'] })
    },
  })
}

export function useCreateProposal(dealId: string) {
  return useProposalMutation(() => api.createProposal(dealId), dealId)
}

export function useUpdateOffer(id: string, dealId: string) {
  return useProposalMutation((offer: Partial<ProposalOffer>) => api.updateOffer(id, offer), dealId)
}

export function useSubmitProposal(id: string, dealId: string) {
  return useProposalMutation(() => api.submitProposal(id), dealId)
}

export function useReturnProposal(id: string, dealId: string) {
  return useProposalMutation((reason: string) => api.returnProposal(id, reason), dealId)
}

export function useSendProposal(id: string, dealId: string) {
  return useProposalMutation(() => api.sendProposal(id), dealId)
}

export function useRecordOutcome(id: string, dealId: string) {
  return useProposalMutation(
    ({ accepted, reason }: { accepted: boolean; reason: string }) => api.recordOutcome(id, accepted, reason),
    dealId,
  )
}
