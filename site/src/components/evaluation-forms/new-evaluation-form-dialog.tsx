import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNewEvaluationForm } from '../../hooks/use-new-evaluation-form'

interface NewEvaluationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Handed the new questionnaire's id so the page can open the builder on it. */
  onCreated: (id: string) => void
}

/** Files a new questionnaire; the builder is where it is actually written. */
export function NewEvaluationFormDialog({
  open,
  onOpenChange,
  onCreated,
}: NewEvaluationFormDialogProps) {
  const { form, submit, saving } = useNewEvaluationForm(open, onCreated)
  const error = form.formState.errors.title?.message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">New questionnaire</DialogTitle>
          <DialogDescription className="text-[12px]">
            Name it after the events it will serve — you add its questions next, then
            assign it to the events that should ask them.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="new-questionnaire-title"
              className="text-[12px] font-medium text-gray-700"
            >
              Title
            </label>
            <input
              id="new-questionnaire-title"
              autoFocus
              placeholder="e.g. Outreach Day Volunteer Evaluation"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              {...form.register('title')}
            />
            {error && <p className="text-[11px] text-red-600">{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              <PlusCircle className="h-3.5 w-3.5" />
              {saving ? 'Creating…' : 'Create questionnaire'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
