import { Check, PenOff, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { listSignatoryCoordinators } from '../../../services/shared/certificate-service'
import type { SignatoryCoordinator } from '../../../types/certificate-template'
import { SignatoryAvatar } from './signatory-avatar'

interface SignatoryPickerDialogProps {
  open: boolean
  /** Coordinators already on the certificate — listed, but not selectable twice. */
  takenIds: string[]
  onOpenChange: (open: boolean) => void
  onSelect: (coordinator: SignatoryCoordinator) => void
}

const SKELETON_ROWS = 5

/**
 * Signatories are real staff accounts, so they are picked from the directory rather
 * than typed — a misspelled name reaches every certificate printed from the template.
 */
export function SignatoryPickerDialog({
  open,
  takenIds,
  onOpenChange,
  onSelect,
}: SignatoryPickerDialogProps) {
  // `null` until the directory arrives — the absence of data is the loading state, so
  // nothing has to be flipped on synchronously when the dialog opens.
  const [coordinators, setCoordinators] = useState<SignatoryCoordinator[] | null>(null)
  const [search, setSearch] = useState('')

  // Fetched once and kept: the directory does not change while a template is open.
  useEffect(() => {
    if (!open || coordinators) return

    let active = true
    void listSignatoryCoordinators()
      .then((list) => {
        if (active) setCoordinators(list)
      })
      .catch((error: unknown) => {
        if (!active) return
        // An empty list rather than a stuck skeleton: the dialog still closes, and the
        // director is told why nobody is listed.
        setCoordinators([])
        toast.error(
          error instanceof Error
            ? error.message
            : 'The staff directory could not be loaded',
        )
      })

    return () => {
      active = false
    }
  }, [open, coordinators])

  const loading = !coordinators

  // Cleared on close so the next open starts on the full directory.
  const handleOpenChange = (next: boolean) => {
    if (!next) setSearch('')
    onOpenChange(next)
  }

  const visible = useMemo(() => {
    const list = coordinators ?? []
    const term = search.trim().toLowerCase()
    if (!term) return list

    return list.filter(
      (one) =>
        one.name.toLowerCase().includes(term) ||
        one.department.toLowerCase().includes(term) ||
        one.title.toLowerCase().includes(term),
    )
  }, [coordinators, search])

  const choose = (coordinator: SignatoryCoordinator) => {
    onSelect(coordinator)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-4 py-3">
          <DialogTitle className="text-[15px]">Add signatory</DialogTitle>
          <DialogDescription className="text-[12px]">
            Pick the coordinator whose name and department print on the certificate.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, title or department"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {loading && (
            <ul aria-hidden className="space-y-1 px-2">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <li
                  key={`coordinator-skeleton-${index}`}
                  className="flex items-center gap-3 px-2 py-2"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && visible.length === 0 && (
            <p className="px-4 py-10 text-center text-[13px] text-gray-500">
              No coordinator matches “{search}”.
            </p>
          )}

          {!loading && visible.length > 0 && (
            <ul className="space-y-0.5">
              {visible.map((coordinator) => {
                const taken = takenIds.includes(coordinator.id)

                return (
                  <li key={coordinator.id}>
                    <button
                      type="button"
                      disabled={taken}
                      onClick={() => choose(coordinator)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                        taken ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50',
                      )}
                    >
                      <SignatoryAvatar
                        name={coordinator.name}
                        avatarUrl={coordinator.avatarUrl}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-gray-900">
                          {coordinator.name}
                        </span>
                        <span className="block truncate text-[12px] text-gray-500">
                          {coordinator.title} · {coordinator.department}
                        </span>
                      </span>
                      {/* The signature image itself is never shown here — the line
                          prints the account's stored signature at issue time — but an
                          account that has not uploaded one is worth flagging before it
                          goes onto a certificate. */}
                      {!taken && !coordinator.hasSignature && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600">
                          <PenOff className="h-3.5 w-3.5" />
                          No signature
                        </span>
                      )}
                      {taken && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Check className="h-3.5 w-3.5" />
                          Added
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
