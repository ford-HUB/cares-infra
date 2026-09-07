import { Check, Rocket, Search } from 'lucide-react'
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
import { useDeployTemplate } from '../../hooks/use-deploy-template'
import type { CertificateTemplate } from '../../types/certificate-template'
import type { DeployedCertificate } from '../../types/deployed-certificate'

interface DeployTemplateDialogProps {
  /** Null keeps the dialog closed; a template opens it on that template. */
  template: CertificateTemplate | null
  onOpenChange: (open: boolean) => void
  onDeployed: (deployment: DeployedCertificate) => void
}

const SKELETON_ROWS = 5

/**
 * Picks the event a template is deployed to. The sheet is frozen as it reads today at
 * this point, so the copy says so — a director editing the template afterwards is not
 * editing what these participants will receive.
 */
export function DeployTemplateDialog({
  template,
  onOpenChange,
  onDeployed,
}: DeployTemplateDialogProps) {
  const {
    options,
    loading,
    eventId,
    setEventId,
    search,
    setSearch,
    deployedEventIds,
    saving,
    submit,
  } = useDeployTemplate(template, onDeployed)

  return (
    <Dialog open={Boolean(template)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-4 py-3">
          <DialogTitle className="text-[15px]">Deploy {template?.name}</DialogTitle>
          <DialogDescription className="text-[12px]">
            The sheet is frozen as it reads now — later edits to the template will not
            change the certificates this event hands out.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search event name or venue"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {loading && (
            <ul aria-hidden className="space-y-1 px-2">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <li key={`event-skeleton-${index}`} className="space-y-1 px-2 py-2">
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
                : 'There are no events to deploy to yet.'}
            </p>
          )}

          {!loading && options.length > 0 && (
            <ul className="space-y-0.5">
              {options.map((event) => {
                const already = deployedEventIds.has(String(event.event_id))
                const picked = eventId === event.event_id

                return (
                  <li key={event.event_id}>
                    <button
                      type="button"
                      onClick={() => setEventId(event.event_id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                        picked ? 'bg-gray-100' : 'hover:bg-gray-50',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-gray-900">
                          {event.title}
                        </span>
                        <span className="block truncate text-[12px] text-gray-500">
                          {formatDateShort(event.event_started)} · {event.location}
                        </span>
                        <span className="block text-[11px] text-gray-400 tabular-nums">
                          {formatNumber(event.participants)} participants ·{' '}
                          {event.status}
                        </span>
                      </span>
                      {/* Already live on this event: re-picking it re-cuts that same
                          deployment with the current design, which the server refuses
                          once sheets have gone out. */}
                      {already && (
                        <span className="shrink-0 text-[11px] text-amber-600">
                          Already deployed
                        </span>
                      )}
                      {picked && (
                        <Check className="h-4 w-4 shrink-0 text-[var(--cares-primary)]" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 items-center gap-2 rounded-b-xl border-t border-gray-100 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={eventId === null || saving}
            onClick={() => void submit()}
          >
            <Rocket className="h-3.5 w-3.5" />
            {saving ? 'Deploying…' : 'Deploy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
