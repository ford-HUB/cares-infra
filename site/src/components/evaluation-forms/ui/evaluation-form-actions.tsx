import { CheckCircle2, MoreHorizontal, PencilLine, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { EvaluationForm } from '../../../types/evaluation'

interface EvaluationFormActionsProps {
  form: EvaluationForm
  onAction: (action: string, form: EvaluationForm) => void
}

/** Secondary actions live behind one menu so the card footer stays two buttons wide. */
export function EvaluationFormActions({ form, onAction }: EvaluationFormActionsProps) {
  // A questionnaire that has been answered keeps its responses; retiring it means
  // unassigning it, not deleting it, and the default has to be handed over first.
  const deletable = form.responseCount === 0 && !form.isDefault

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${form.title}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => onAction('edit', form)}>
          <PencilLine className="h-3.5 w-3.5" />
          Open in builder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('preview', form)}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          View questions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={form.isDefault || form.status !== 'published'}
          onSelect={() => onAction('default', form)}
        >
          <Star className="h-3.5 w-3.5" />
          {form.isDefault ? 'Already the default' : 'Make default'}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={!deletable}
          onSelect={() => onAction('delete', form)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete questionnaire
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
