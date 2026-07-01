export type Role = 'BD' | 'ANALYST' | 'MANAGER' | 'IC_MEMBER' | 'ADMIN'

export interface User {
  id: string
  email: string
  full_name: string
  role: Role
  role_display: string
}

export type DealState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REJECTED_TO_BD'
  | 'STAGE1_PASSED'
  | 'DECLINED'
  | 'STAGE2_GO'
  | 'STAGE2_CONDITIONAL'
  | 'STAGE2_NO_GO'

export type Stage2Decision = '' | 'GO' | 'CONDITIONAL' | 'NO_GO'

export interface DealIntake {
  deal_name: string
  deal_type: '' | 'GREENFIELD' | 'BROWNFIELD' | 'JV'
  sub_sector: string
  client_name: string
  counterparty_class: string
  location: string
  sponsor: string
  sponsor_years: number | null
  deal_source: string
  total_project_cost_usd_m: string | null
  installed_capacity: string
  proposed_tariff_ngn_kwh: string | null
  tenor_years: number | null
  revenue_2_3yr_pct: string | null
  capital_structure: string
  ebitda_usd_m: string | null
  leverage_usd_m: string | null
  cash_position_usd_m: string | null
}

export interface DealListItem {
  id: string
  deal_ref: string
  deal_name: string
  state: DealState
  stage1_decision: string
  created_by_name: string
  assigned_analyst: string | null
  created_at: string
  submitted_at: string | null
}

export interface Deal {
  id: string
  deal_ref: string
  state: DealState
  stage1_decision: string
  stage2_decision: Stage2Decision
  stage2_rationale: string
  created_by: string
  assigned_analyst: string | null
  current_rejection_reason: string
  created_at: string
  submitted_at: string | null
  updated_at: string
  intake: DealIntake
}

export interface StateHistoryEntry {
  id: number
  from_state: string
  to_state: string
  actor_name: string | null
  reason: string
  occurred_at: string
}

export interface FieldHistoryEntry {
  id: number
  entity: string
  field_name: string
  old_value: string | null
  new_value: string | null
  actor_name: string | null
  occurred_at: string
}

export interface DealHistory {
  state_history: StateHistoryEntry[]
  field_history: FieldHistoryEntry[]
}

export type GateVerdict = '' | 'PASS' | 'CONDITIONAL' | 'FAIL'

export interface GateResult {
  gate: number
  name: string
  pass_condition: string
  required_evidence: string
  verdict: GateVerdict
  evidence_notes: string
}

export type Grade = 1 | 3 | 5 | null

export interface SubCriterionScore {
  id: number
  name: string
  weight_in_pillar: string
  grade: Grade
  notes: string
  band_1_def: string
  band_3_def: string
  band_5_def: string
}

export interface PillarScore {
  code: string
  name: string
  description: string
  weight_pct: string
  pass_threshold: number | null
  raw: number
  max: number
  pct: number
  complete: boolean
  passes: boolean | null
  comment: string
  sub_criteria: SubCriterionScore[]
}

export type ScoreVerdict = 'GO' | 'CONDITIONAL' | 'NO_GO' | null

export interface ScoringResult {
  pillars: PillarScore[]
  weighted_total: number
  weight_sum: string
  complete: boolean
  verdict: ScoreVerdict
  bands: Record<string, number> | null
}

export type EditRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export interface EditAccessRequest {
  id: string
  deal: string
  requested_by: string
  justification: string
  status: EditRequestStatus
  decided_by: string | null
  decision_reason: string
  created_at: string
  decided_at: string | null
}

export type CostLineKind = 'CAPEX' | 'OPEX'

export interface CostLine {
  id: string
  cost_model: string
  kind: CostLineKind
  category: string
  description: string
  amount: string
  order: number
}

export interface CostOutputs {
  currency: string
  total_capex: number
  total_opex_annual: number
  annual_revenue: number
  net_annual_cashflow: number
  debt_amount: number | null
  equity_amount: number | null
  equity_pct: number | null
  simple_payback_years: number | null
  npv: number | null
  irr_pct: number | null
}

export interface CostModel {
  id: string
  deal: string
  deal_ref: string
  currency: string
  annual_revenue: string | null
  project_life_years: number | null
  debt_pct: string | null
  interest_rate_pct: string | null
  debt_tenor_years: number | null
  discount_rate_pct: string | null
  notes: string
  lines: CostLine[]
  outputs: CostOutputs
}

export interface DealComment {
  id: string
  author: string
  author_name: string
  author_role: Role
  body: string
  created_at: string
}

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
export type Health = 'GREEN' | 'AMBER' | 'RED'
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
export type RiskKind = 'RISK' | 'ISSUE'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
export type RiskState = 'OPEN' | 'MITIGATING' | 'CLOSED'

export interface Milestone {
  id: string
  project: string
  name: string
  owner: string
  due_date: string | null
  status: MilestoneStatus
  notes: string
  order: number
}

export interface Risk {
  id: string
  project: string
  kind: RiskKind
  description: string
  severity: Severity
  status: RiskState
  mitigation: string
  owner: string
}

export interface Project {
  id: string
  deal: string
  deal_ref: string
  proposal: string | null
  name: string
  status: ProjectStatus
  health: Health
  status_note: string
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  percent_complete: number
  milestones: Milestone[]
  risks: Risk[]
}

export interface ProjectHistoryEntry {
  id: number
  from_status: string
  to_status: string
  actor_name: string
  reason: string
  occurred_at: string
}

export type ProposalStatus = 'DRAFT' | 'IN_REVIEW' | 'SENT' | 'ACCEPTED' | 'REJECTED'

export interface Proposal {
  id: string
  deal: string
  deal_ref: string
  status: ProposalStatus
  created_by: string
  created_by_name: string
  version: number
  decision_reason: string
  created_at: string
  updated_at: string
  sent_at: string | null
  decided_at: string | null
  title: string
  executive_summary: string
  scope_of_work: string
  proposed_tariff_ngn_kwh: string | null
  contract_tenor_years: number | null
  total_contract_value_usd_m: string | null
  payment_terms: string
  commercial_terms: string
  assumptions: string
  validity_until: string | null
}

export type ProposalOffer = Pick<
  Proposal,
  | 'title' | 'executive_summary' | 'scope_of_work' | 'proposed_tariff_ngn_kwh'
  | 'contract_tenor_years' | 'total_contract_value_usd_m' | 'payment_terms'
  | 'commercial_terms' | 'assumptions' | 'validity_until'
>

export interface ProposalHistoryEntry {
  id: number
  from_status: string
  to_status: string
  actor_name: string
  reason: string
  occurred_at: string
}

export interface AppNotification {
  id: string
  deal: string | null
  deal_ref: string
  kind: string
  message: string
  is_read: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
