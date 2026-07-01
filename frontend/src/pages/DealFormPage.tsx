import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCreateDeal, useDeal, useSubmitDeal, useUpdateDeal } from '@/hooks/useDeals'
import { DealIntakeForm } from '@/components/DealIntakeForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DealIntake } from '@/types'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { Link } from 'react-router-dom'

const EMPTY: Partial<DealIntake> = {
  deal_name: '', deal_type: '', sub_sector: '', client_name: '',
  counterparty_class: '', location: '', sponsor: '', sponsor_years: null,
  deal_source: '', total_project_cost_usd_m: null, installed_capacity: '',
  proposed_tariff_ngn_kwh: null, tenor_years: null, revenue_2_3yr_pct: null,
  capital_structure: '', ebitda_usd_m: null, leverage_usd_m: null,
  cash_position_usd_m: null,
}

export function DealFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: deal, isLoading } = useDeal(id ?? '')
  const createDeal = useCreateDeal()
  const updateDeal = useUpdateDeal(id ?? '')
  const submitDeal = useSubmitDeal()

  const [values, setValues] = useState<Partial<DealIntake>>(EMPTY)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (deal?.intake) setValues(deal.intake)
  }, [deal])

  if (isEdit && isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>

  const handleSave = async () => {
    setSaveError('')
    try {
      if (isEdit) {
        await updateDeal.mutateAsync(values)
      } else {
        const created = await createDeal.mutateAsync(values)
        navigate(`/deals/${created.id}`, { replace: true })
      }
    } catch {
      setSaveError('Failed to save. Check required fields.')
    }
  }

  const handleSubmit = async () => {
    setSaveError('')
    try {
      // Save first, then submit
      if (isEdit) {
        await updateDeal.mutateAsync(values)
        await submitDeal.mutateAsync(id!)
        navigate(`/deals/${id}`)
      } else {
        const created = await createDeal.mutateAsync(values)
        await submitDeal.mutateAsync(created.id)
        navigate(`/deals/${created.id}`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveError(msg ?? 'Failed to submit. Check required fields.')
    }
  }

  const isSaving = createDeal.isPending || updateDeal.isPending
  const isSubmitting = submitDeal.isPending

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isEdit ? `/deals/${id}` : '/deals'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">
          {isEdit ? `Edit ${deal?.deal_ref ?? ''}` : 'New Deal'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal Intake Form</CardTitle>
        </CardHeader>
        <CardContent>
          <DealIntakeForm values={values} onChange={setValues} />

          {saveError && <p className="mt-4 text-sm text-destructive">{saveError}</p>}

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" onClick={handleSave} disabled={isSaving || isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Submitting…' : 'Submit for Review'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
