import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
  title?: string
  description?: string
}

export function RejectModal({ open, onClose, onConfirm, isPending, title = 'Return to BD', description = 'Provide a reason so the BD can address the issues.' }: Props) {
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(''); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what needs to be addressed…"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setReason(''); onClose() }}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!reason.trim() || isPending}>
              {isPending ? 'Sending…' : 'Return to BD'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
