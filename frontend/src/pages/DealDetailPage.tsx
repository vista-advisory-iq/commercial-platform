import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDeal, useDealHistory, useRejectDeal, useSubmitDeal, useTakeDeal, useRequestEdit, useSubmitForReview } from '@/hooks/useDeals'
import { downloadDeclineLetter, downloadReport, downloadScreeningMemo } from '@/api/deals'
import { useAuth } from '@/hooks/useAuth'
import { DealStateBadge } from '@/components/DealStateBadge'
import { DealIntakeForm } from '@/components/DealIntakeForm'
import { DealIntakeSummary } from '@/components/DealIntakeSummary'
import { AuditTimeline } from '@/components/AuditTimeline'
import { RejectModal } from '@/components/RejectModal'
import { GateAssessment } from '@/components/GateAssessment'
import { PillarMechanics } from '@/components/PillarMechanics'
import { ScoringPanel } from '@/components/ScoringPanel'
import { Stage2DecisionPanel } from '@/components/Stage2DecisionPanel'
import { ProposalPanel } from '@/components/ProposalPanel'
import { ProjectPanel } from '@/components/ProjectPanel'
import { DealChat } from '@/components/DealChat'
import { ClassificationBadge, ClassificationPanel } from '@/components/ClassificationPanel'
import { CostModelPanel } from '@/components/CostModelPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Send, FileText, FileDown } from 'lucide-react'

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: deal, isLoading, error } = useDeal(id!)
  const { data: history } = useDealHistory(id!)

  const takeDeal = useTakeDeal()
  const rejectDeal = useRejectDeal()
  const submitDeal = useSubmitDeal()
  const requestEdit = useRequestEdit()
  const submitForReview = useSubmitForReview()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [editJustification, setEditJustification] = useState('')
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [actionError, setActionError] = useState('')
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [docDownloading, setDocDownloading] = useState<'memo' | 'letter' | null>(null)

  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>
  if (error || !deal) return <p className="p-8 text-destructive">Deal not found.</p>

  const isBD = user?.role === 'BD'
  const canAssess = user?.role === 'ANALYST' || user?.role === 'MANAGER'
  // The Management Investment Committee (Manager) — plus Admin — records the vote.
  const canDecideStage2 = user?.role === 'MANAGER' || user?.role === 'ADMIN'
  const isOwnDeal = deal.created_by === user?.id

  const STAGE2_STATES = ['STAGE2_GO', 'STAGE2_CONDITIONAL', 'STAGE2_NO_GO']
  const isStage2Decided = STAGE2_STATES.includes(deal.state)
  const awaitingCommittee = deal.state === 'AWAITING_IC_REVIEW'
  // Everyone can view Stage 1 gates and Stage 2 scoring once they exist (read-only
  // for non-assessors). Gates exist once a deal is taken; scoring once Stage 1 passes.
  const showGates = ['UNDER_REVIEW', 'STAGE1_PASSED', 'AWAITING_IC_REVIEW', 'DECLINED', ...STAGE2_STATES].includes(deal.state)
  const showScoring = deal.state === 'STAGE1_PASSED' || awaitingCommittee || isStage2Decided
  // A proposal can exist once the deal is a GO (or Conditional GO).
  const showProposal = deal.state === 'STAGE2_GO' || deal.state === 'STAGE2_CONDITIONAL'
  // Assessors get a side-by-side workspace (intake left, assessment right) so
  // they don't scroll between the deal details and the verdict/scoring. Scoring
  // stays editable while awaiting the committee, so that state is included too.
  const assessmentMode = canAssess && ['UNDER_REVIEW', 'STAGE1_PASSED', 'AWAITING_IC_REVIEW'].includes(deal.state)
  // A cost model can be built once the deal is in the pipeline (not a draft).
  const showCostModel = deal.state !== 'DRAFT'
  // The committee dossier is downloadable once scoring exists.
  const showReport = showScoring
  // Screening memo needs finalized Stage 1 gate results; decline letter a terminal decline.
  const showMemo = ['STAGE1_PASSED', 'AWAITING_IC_REVIEW', 'DECLINED', ...STAGE2_STATES].includes(deal.state)
  const showDeclineLetter = deal.state === 'DECLINED' || deal.state === 'STAGE2_NO_GO'

  const handleTake = async () => {
    setActionError('')
    try { await takeDeal.mutateAsync(id!) }
    catch { setActionError('Could not take deal for review.') }
  }

  const handleSubmitBack = async () => {
    setActionError('')
    try { await submitDeal.mutateAsync(id!) }
    catch { setActionError('Could not re-submit deal.') }
  }

  const handleReject = async (reason: string) => {
    setActionError('')
    try {
      await rejectDeal.mutateAsync({ id: id!, reason })
      setRejectOpen(false)
    } catch { setActionError('Could not return deal to BD.') }
  }

  const handleSubmitForReview = async () => {
    setActionError('')
    try { await submitForReview.mutateAsync(id!) }
    catch { setActionError('Could not submit for committee review — make sure every sub-criterion is scored.') }
  }

  const handleDownloadReport = async (format: 'pdf' | 'docx') => {
    setDownloading(format)
    try { await downloadReport(id!, format, deal.deal_ref) }
    catch { setActionError('Could not generate the report.') }
    finally { setDownloading(null) }
  }

  const handleDownloadDoc = async (kind: 'memo' | 'letter') => {
    setDocDownloading(kind)
    try {
      if (kind === 'memo') await downloadScreeningMemo(id!, deal.deal_ref)
      else await downloadDeclineLetter(id!, deal.deal_ref)
    } catch {
      setActionError(kind === 'memo' ? 'Could not generate the screening memo.' : 'Could not generate the decline letter.')
    } finally {
      setDocDownloading(null)
    }
  }

  const handleRequestEdit = async () => {
    if (!editJustification.trim()) return
    setActionError('')
    try {
      await requestEdit.mutateAsync({ id: id!, justification: editJustification })
      setShowEditRequest(false)
      setEditJustification('')
    } catch { setActionError('Could not submit edit request.') }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={isBD ? '/deals' : '/queue'}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{deal.intake?.deal_name || deal.deal_ref}</h1>
              <DealStateBadge state={deal.state} />
              {deal.stage1_decision === 'CONDITIONAL' && !isStage2Decided && (
                <Badge variant="warning">Conditional</Badge>
              )}
              <ClassificationBadge deal={deal} />
            </div>
            <p className="text-sm text-muted-foreground">{deal.deal_ref}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* BD actions */}
          {isBD && isOwnDeal && (deal.state === 'DRAFT' || deal.state === 'REJECTED_TO_BD') && (
            <Button asChild variant="outline">
              <Link to={`/deals/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {isBD && isOwnDeal && deal.state === 'REJECTED_TO_BD' && (
            <Button onClick={handleSubmitBack} disabled={submitDeal.isPending}>
              <Send className="mr-2 h-4 w-4" />
              Re-submit
            </Button>
          )}
          {isBD && isOwnDeal && deal.state === 'SUBMITTED' && (
            <Button variant="outline" onClick={() => setShowEditRequest(true)}>
              Request Edit Access
            </Button>
          )}

          {/* Analyst / Manager actions */}
          {canAssess && deal.state === 'SUBMITTED' && (
            <Button onClick={handleTake} disabled={takeDeal.isPending}>
              {takeDeal.isPending ? 'Taking…' : 'Take for Review'}
            </Button>
          )}
          {canAssess && deal.state === 'UNDER_REVIEW' && (
            <Button variant="outline" onClick={() => setRejectOpen(true)}>
              Return to BD
            </Button>
          )}

          {/* Committee report — available once Stage 2 scoring exists */}
          {showReport && (
            <>
              <Button variant="outline" onClick={() => handleDownloadReport('pdf')} disabled={downloading !== null}>
                <FileText className="mr-2 h-4 w-4" />
                {downloading === 'pdf' ? 'Preparing…' : 'Report (PDF)'}
              </Button>
              <Button variant="outline" onClick={() => handleDownloadReport('docx')} disabled={downloading !== null}>
                <FileDown className="mr-2 h-4 w-4" />
                {downloading === 'docx' ? 'Preparing…' : 'Word'}
              </Button>
            </>
          )}

          {/* Stage 1 screening memo & formal decline letter */}
          {showMemo && (
            <Button variant="outline" onClick={() => handleDownloadDoc('memo')} disabled={docDownloading !== null}>
              <FileText className="mr-2 h-4 w-4" />
              {docDownloading === 'memo' ? 'Preparing…' : 'Screening Memo'}
            </Button>
          )}
          {showDeclineLetter && (
            <Button variant="outline" onClick={() => handleDownloadDoc('letter')} disabled={docDownloading !== null}>
              <FileDown className="mr-2 h-4 w-4" />
              {docDownloading === 'letter' ? 'Preparing…' : 'Decline Letter'}
            </Button>
          )}
        </div>
      </div>

      {/* Rejection reason banner */}
      {deal.state === 'REJECTED_TO_BD' && deal.current_rejection_reason && (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong>Returned to BD:</strong> {deal.current_rejection_reason}
        </div>
      )}

      {actionError && (
        <p className="mb-4 text-sm text-destructive">{actionError}</p>
      )}

      {/* Pipeline classification (park / nurture / defer) — orthogonal to the state machine */}
      {(canAssess || deal.classification !== 'ACTIVE') && deal.state !== 'DRAFT' && (
        <div className="mb-6">
          <ClassificationPanel deal={deal} canAssess={canAssess} />
        </div>
      )}

      {/* Edit request inline form */}
      {showEditRequest && (
        <div className="mb-6 rounded-md border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">Justify your edit request:</p>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
            value={editJustification}
            onChange={(e) => setEditJustification(e.target.value)}
            placeholder="Explain why you need to edit this deal…"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRequestEdit} disabled={!editJustification.trim() || requestEdit.isPending}>
              {requestEdit.isPending ? 'Sending…' : 'Submit Request'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowEditRequest(false); setEditJustification('') }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Final committee decision banner */}
      {isStage2Decided && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            deal.state === 'STAGE2_GO'
              ? 'border-green-200 bg-green-50 text-green-800'
              : deal.state === 'STAGE2_CONDITIONAL'
                ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <strong>
            Committee decision:{' '}
            {deal.stage2_decision === 'GO' ? 'GO' : deal.stage2_decision === 'CONDITIONAL' ? 'Conditional GO' : 'NO-GO'}
          </strong>
          {deal.stage2_rationale && <span> — {deal.stage2_rationale}</span>}
        </div>
      )}

      {assessmentMode ? (
        /* Assessor workspace: intake on the left, assessment on the right */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Card className="lg:sticky lg:top-4">
              <CardHeader><CardTitle className="text-base">Deal Details</CardTitle></CardHeader>
              <CardContent className="lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
                <DealIntakeSummary intake={deal.intake} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6 lg:col-span-3">
            {deal.state === 'UNDER_REVIEW' ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <GateAssessment dealId={id!} dealState={deal.state} />
                  </CardContent>
                </Card>
                {/* Framework order: the five pillars follow the gates — visible
                    as a reference while Stage 1 is still being assessed. */}
                <PillarMechanics dealId={id!} locked />
              </>
            ) : (
              /* Stage 1 stays visible & editable while Stage 2 scoring is filled */
              <Tabs defaultValue="scoring">
                <TabsList>
                  <TabsTrigger value="gates">Stage 1 Gates</TabsTrigger>
                  <TabsTrigger value="scoring">Stage 2 Scoring</TabsTrigger>
                </TabsList>
                <TabsContent value="gates">
                  <Card className="mt-4"><CardContent className="pt-6">
                    <GateAssessment dealId={id!} dealState={deal.state} editable />
                  </CardContent></Card>
                </TabsContent>
                <TabsContent value="scoring">
                  <div className="mt-4 space-y-4">
                    <PillarMechanics dealId={id!} defaultOpen={false} />
                    <Card><CardContent className="pt-6">
                      <ScoringPanel dealId={id!} editable />
                    </CardContent></Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Hand-off to the Management Investment Committee */}
            {deal.state === 'STAGE1_PASSED' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">Ready for the committee?</p>
                  <p className="text-xs text-muted-foreground">
                    Submit the completed scoring for the Management Investment Committee's decision.
                    Details stay editable afterwards.
                  </p>
                </div>
                <Button onClick={handleSubmitForReview} disabled={submitForReview.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  {submitForReview.isPending ? 'Submitting…' : 'Submit for Committee Review'}
                </Button>
              </div>
            )}

            {awaitingCommittee && !canDecideStage2 && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm text-indigo-800">
                Scoring has been submitted and is <strong>awaiting the Management Investment Committee's decision</strong>.
                You can still revise the intake and scoring until the vote.
              </div>
            )}

            {awaitingCommittee && canDecideStage2 && <Stage2DecisionPanel dealId={id!} />}

            <Tabs defaultValue="cost">
              <TabsList>
                <TabsTrigger value="cost">Cost Model</TabsTrigger>
                {showProposal && <TabsTrigger value="proposal">Proposal</TabsTrigger>}
                <TabsTrigger value="history">Audit History</TabsTrigger>
              </TabsList>
              <TabsContent value="cost">
                <Card className="mt-4"><CardContent className="pt-6">
                  <CostModelPanel dealId={id!} canEdit={canAssess} />
                </CardContent></Card>
              </TabsContent>
              {showProposal && (
                <TabsContent value="proposal">
                  <Card className="mt-4"><CardContent className="pt-6">
                    <ProposalPanel dealId={id!} canAssess={canAssess} isOwner={isOwnDeal && isBD} />
                  </CardContent></Card>
                </TabsContent>
              )}
              <TabsContent value="history">
                <Card className="mt-4"><CardContent className="pt-6">
                  {history ? (
                    <AuditTimeline stateHistory={history.state_history} fieldHistory={history.field_history} />
                  ) : <p className="text-muted-foreground text-sm">Loading history…</p>}
                </CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <Tabs defaultValue={showProposal ? 'proposal' : showScoring ? 'scoring' : 'details'}>
          <TabsList>
            <TabsTrigger value="details">Deal Details</TabsTrigger>
            {showGates && <TabsTrigger value="gates">Stage 1 Gates</TabsTrigger>}
            {showScoring && <TabsTrigger value="scoring">Stage 2 Scoring</TabsTrigger>}
            {showCostModel && <TabsTrigger value="cost">Cost Model</TabsTrigger>}
            {showProposal && <TabsTrigger value="proposal">Proposal</TabsTrigger>}
            {showProposal && <TabsTrigger value="project">Project</TabsTrigger>}
            <TabsTrigger value="history">Audit History</TabsTrigger>
          </TabsList>

          {showGates && (
            <TabsContent value="gates">
              <div className="mt-4 space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Stage 1 — Knockout Gates</CardTitle></CardHeader>
                  <CardContent>
                    <GateAssessment dealId={id!} dealState={deal.state} editable={false} />
                  </CardContent>
                </Card>
                {/* Framework order: the five pillars follow the gates. Once
                    scoring exists it lives in its own tab; while Stage 1 is
                    open, show the mechanics reference here. */}
                {!showScoring && deal.state !== 'DECLINED' && <PillarMechanics dealId={id!} locked />}
              </div>
            </TabsContent>
          )}

          {showCostModel && (
            <TabsContent value="cost">
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-base">Cost Model</CardTitle></CardHeader>
                <CardContent>
                  <CostModelPanel dealId={id!} canEdit={canAssess} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {showProposal && (
            <TabsContent value="project">
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-base">Delivery Project</CardTitle></CardHeader>
                <CardContent>
                  <ProjectPanel dealId={id!} canEdit={canAssess} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {showProposal && (
            <TabsContent value="proposal">
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-base">Commercial Proposal</CardTitle></CardHeader>
                <CardContent>
                  <ProposalPanel dealId={id!} canAssess={canAssess} isOwner={isOwnDeal && isBD} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {showScoring && (
            <TabsContent value="scoring">
              <div className="mt-4 space-y-6">
                {canDecideStage2 && awaitingCommittee && (
                  <Stage2DecisionPanel dealId={id!} />
                )}
                <PillarMechanics dealId={id!} defaultOpen={false} />
                <Card>
                  <CardHeader><CardTitle className="text-base">Stage 2 — Pillar Scoring</CardTitle></CardHeader>
                  <CardContent>
                    <ScoringPanel dealId={id!} editable={false} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="details">
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Intake Information</CardTitle></CardHeader>
              <CardContent>
                {deal.intake ? (
                  <DealIntakeForm values={deal.intake} onChange={() => {}} disabled />
                ) : (
                  <p className="text-muted-foreground text-sm">No intake data yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
              <CardContent>
                {history ? (
                  <AuditTimeline stateHistory={history.state_history} fieldHistory={history.field_history} />
                ) : (
                  <p className="text-muted-foreground text-sm">Loading history…</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Deal discussion — BD <-> assessors Q&A, visible to anyone on the deal */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Discussion</CardTitle></CardHeader>
        <CardContent>
          <DealChat dealId={id!} />
        </CardContent>
      </Card>

      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        isPending={rejectDeal.isPending}
      />
    </div>
  )
}
