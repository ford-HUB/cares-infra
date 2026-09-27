import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { EvaluationForm } from '../../../types/evaluation'

interface DeleteFormDialogProps {
  /** Null keeps the dialog closed; a questionnaire opens it on that questionnaire. */
  form: EvaluationForm | null
  saving: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (form: EvaluationForm) => void
}

/** Deleting is only offered on an unanswered questionnaire, but it is still final. */
export function DeleteFormDialog({
  form,
  saving,
  onOpenChange,
  onConfirm,
}: DeleteFormDialogProps) {
  return (
    <Dialog open={Boolean(form)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Delete {form?.title}?</DialogTitle>
          <DialogDescription className="text-[12px]">
            {form && form.assignedEvents > 0
              ? `${form.assignedEvents} event${form.assignedEvents === 1 ? '' : 's'} currently ask this. They go back to the default questionnaire.`
              : 'No event asks this questionnaire. Deleting it cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={saving}
            onClick={() => form && onConfirm(form)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {saving ? 'Deleting…' : 'Delete questionnaire'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
