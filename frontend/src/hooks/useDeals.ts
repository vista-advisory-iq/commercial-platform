import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/deals'
import type { GateInput, ScoreInput, CommentInput } from '@/api/deals'
import type { DealIntake } from '@/types'

export function useDeals(params?: Record<string, string>) {
  return useQuery({ queryKey: ['deals', params], queryFn: () => api.getDeals(params) })
}

export function useDrafts() {
  return useQuery({ queryKey: ['deals', 'drafts'], queryFn: api.getDrafts })
}

export function useDeal(id: string) {
  return useQuery({ queryKey: ['deal', id], queryFn: () => api.getDeal(id), enabled: !!id })
}

export function useDealHistory(id: string) {
  return useQuery({ queryKey: ['deal-history', id], queryFn: () => api.getDealHistory(id), enabled: !!id })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (intake: Partial<DealIntake>) => api.createDeal(intake),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  })
}

export function useUpdateDeal(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (intake: Partial<DealIntake>) => api.updateDeal(id, intake),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useSubmitDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.submitDeal(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useClassifyDeal(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classification, note, nextReviewDate }: {
      classification: 'ACTIVE' | 'NURTURE' | 'DEFERRED'
      note: string
      nextReviewDate: string | null
    }) => api.classifyDeal(id, classification, note, nextReviewDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deal-history', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useTakeDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.takeDeal(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useRejectDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectDeal(id, reason),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useGates(id: string) {
  return useQuery({ queryKey: ['deal-gates', id], queryFn: () => api.getGates(id), enabled: !!id })
}

export function useSaveGates(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (results: GateInput[]) => api.saveGates(id, results),
    onSuccess: (data) => {
      qc.setQueryData(['deal-gates', id], data)
      qc.invalidateQueries({ queryKey: ['deal-history', id] })
    },
  })
}

export function useFinalizeStage1() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.finalizeStage1(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deal-gates', id] })
      qc.invalidateQueries({ queryKey: ['deal-scoring', id] })
      qc.invalidateQueries({ queryKey: ['deal-history', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useScoring(id: string) {
  return useQuery({ queryKey: ['deal-scoring', id], queryFn: () => api.getScoring(id), enabled: !!id })
}

export function useSubmitForReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.submitForReview(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deal-history', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useDecideStage2() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, rationale }: { id: string; decision: 'GO' | 'CONDITIONAL' | 'NO_GO'; rationale: string }) =>
      api.decideStage2(id, decision, rationale),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['deal', id] })
      qc.invalidateQueries({ queryKey: ['deal-history', id] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useSaveScoring(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grades, comments }: { grades: ScoreInput[]; comments: CommentInput[] }) =>
      api.saveScoring(id, grades, comments),
    onSuccess: (data) => {
      qc.setQueryData(['deal-scoring', id], data)
      qc.invalidateQueries({ queryKey: ['deal-history', id] })
    },
  })
}

export function useRequestEdit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, justification }: { id: string; justification: string }) =>
      api.requestEdit(id, justification),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edit-requests'] }),
  })
}

export function useComments(id: string) {
  return useQuery({ queryKey: ['deal-comments', id], queryFn: () => api.getComments(id), enabled: !!id })
}

export function usePostComment(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.postComment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-comments', id] }),
  })
}
