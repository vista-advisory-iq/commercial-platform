import { Badge } from '@/components/ui/badge'
import type { DealState } from '@/types'

const STATE_LABELS: Record<DealState, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  REJECTED_TO_BD: 'Returned to BD',
  STAGE1_PASSED: 'Stage 1 Passed',
  DECLINED: 'Declined',
  STAGE2_GO: 'Stage 2 — GO',
  STAGE2_CONDITIONAL: 'Stage 2 — Conditional',
  STAGE2_NO_GO: 'Stage 2 — NO-GO',
}

const STATE_VARIANTS: Record<DealState, 'muted' | 'info' | 'warning' | 'destructive' | 'success' | 'secondary'> = {
  DRAFT: 'muted',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  REJECTED_TO_BD: 'destructive',
  STAGE1_PASSED: 'success',
  DECLINED: 'secondary',
  STAGE2_GO: 'success',
  STAGE2_CONDITIONAL: 'warning',
  STAGE2_NO_GO: 'destructive',
}

export function DealStateBadge({ state }: { state: DealState }) {
  return <Badge variant={STATE_VARIANTS[state]}>{STATE_LABELS[state]}</Badge>
}
