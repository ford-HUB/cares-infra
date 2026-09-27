import { useMemo, useState } from 'react'
import { Check, CalendarPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { AssignableEvent, EvaluationForm } from '../../types/evaluation'

interface AssignFormDialogProps {
  /** Null keeps the dialog closed; a questionnaire opens it on that questionnaire. */
  form: EvaluationForm | null
  events: AssignableEvent[]
  loading: boolean
  saving: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (eventId: number) => void
}

const SKELETON_ROWS = 5

/**
 * Picks the event a questionnaire is assigned to. An event asks one questionnaire, so
 * choosing an event that already carries one replaces it — the copy says so rather
 * than hiding the row, since replacing is a normal thing to want here.
 */
export function AssignFormDialog({
  form,
  events,
  loading,
  saving,
  onOpenChange,
  onAssign,
}: AssignFormDialogProps) {
  const [search, setSearch] = useState('')
  const [eventId, setEventId] = useState<number | null>(null)

  const options = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return events
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term),
    )
  }, [events, search])

  // Each open starts clean: the dialog is one decision, not a running draft.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearch('')
      setEventId(null)
    }
    onOpenChange(open)
  }

  const picked = options.find((event) => event.id === eventId) ?? null
  const replacing = Boolean(
    picked?.assignedFormId && picked.assignedFormId !== form?.id,
  )

  return (
    <Dialog open={Boolean(form)} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-4 py-3">
          <DialogTitle className="text-[15px]">Assign {form?.title}</DialogTitle>
          <DialogDescription className="text-[12px]">
            Volunteers of this event answer these questions after it ends. An event
            without an assignment falls back to the default questionnaire.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(input) => setSearch(input.target.value)}
              placeholder="Search event name or venue"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {loading && (
            <ul aria-hidden className="space-y-1 px-2">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <li key={`assign-event-skeleton-${index}`} className="space-y-1 px-2 py-2">
                  <Skeleton className="h-3.5 w-52" />
                  <Skeleton className="h-3 w-36" />
                </li>
              ))}
            </ul>
          )}

          {!loading && options.length === 0 && (
            <p className="px-4 py-10 text-center text-[13px] text-gray-500">
              {search.trim()
                ? `No event matches “${search}”.`
                : 'There are no events to assign to yet.'}
            </p>
          )}

          {!loading && options.length > 0 && (
            <ul className="space-y-0.5">
              {options.map((event) => {
                const already = event.assignedFormId === form?.id
                const taken = Boolean(event.assignedFormId) && !already
                const selected = eventId === event.id

                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => setEventId(event.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                        selected ? 'bg-gray-100' : 'hover:bg-gray-50',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-gray-900">
                          {event.title}
                        </span>
                        <span className="block truncate text-[12px] text-gray-500">
                          {formatDateShort(event.started)} · {event.location}
                        </span>
                        <span className="block text-[11px] text-gray-400 tabular-nums">
                          {formatNumber(event.participants)} participants · {event.status}
                          {already && ' · already asks this'}
                          {taken && ' · asks another questionnaire'}
                        </span>
                      </span>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-[var(--cares-primary)]" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 items-center gap-2 border-t border-gray-100 px-4 py-3 sm:justify-between">
          <p className="text-[11px] text-gray-500">
            {replacing
              ? 'This event already asks another questionnaire — assigning replaces it.'
              : 'Answers already submitted stay with the questionnaire that collected them.'}
          </p>
          <Button
            size="sm"
            disabled={eventId === null || saving}
            onClick={() => eventId !== null && onAssign(eventId)}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {saving ? 'Assigning…' : 'Assign to event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
