import { Loader2, Pencil, Play, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  SURFACE_LABELS,
  describeSurfaces,
  formatCountdown,
  formatNoticeLead,
  formatWindowLength,
  formatWindowRange,
} from '../../constants/maintenance'
import type { MaintenanceWindow } from '../../types/maintenance'
import { WindowStateBadge } from './ui/window-state-badge'

interface MaintenanceWindowRowProps {
  window: MaintenanceWindow
  /** Shared clock tick — the countdown reads from it, not `Date.now`. */
  now: number
  busy: boolean
  onEdit: (window: MaintenanceWindow) => void
  onCancel: (window: MaintenanceWindow) => void
  onToggleRunning: (window: MaintenanceWindow, running: boolean) => void
}

export function MaintenanceWindowRow({
  window,
  now,
  busy,
  onEdit,
  onCancel,
  onToggleRunning,
}: MaintenanceWindowRowProps) {
  const scheduled = window.state === 'scheduled'
  const active = window.state === 'active'
  const settled = window.state === 'completed' || window.state === 'cancelled'

  return (
    <li className="px-4 py-3.5 transition-colors hover:bg-gray-50/70">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:w-[30%]">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'truncate text-[13px] font-semibold',
                settled ? 'text-gray-500' : 'text-gray-900',
              )}
            >
              {window.title}
            </p>
            <WindowStateBadge state={window.state} />
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">{window.reason}</p>
          <p className="mt-1 text-[11px] text-gray-400">
            Booked by {window.createdBy} ·{' '}
            {window.allowAdmins ? 'admins keep access' : 'everyone locked out'}
          </p>
        </div>

        <div className="min-w-0 lg:w-[24%]">
          <p className="text-[11px] tracking-wider text-gray-500 uppercase lg:hidden">
            When
          </p>
          <p className="truncate text-[13px] font-medium text-gray-800 tabular-nums">
            {formatWindowRange(window.startAt, window.endAt)}
          </p>
          <p className="text-[11px] text-gray-400 tabular-nums">
            {formatWindowLength(window.startAt, window.endAt)}
            {scheduled && ` · starts in ${formatCountdown(window.startAt, now)}`}
            {active && ` · ends in ${formatCountdown(window.endAt, now)}`}
          </p>
        </div>

        <div className="min-w-0 lg:w-[22%]">
          <p className="mb-1 text-[11px] tracking-wider text-gray-500 uppercase lg:hidden">
            Surfaces
          </p>
          <div className="flex flex-wrap gap-1">
            {window.surfaces.map((surface) => (
              <span
                key={surface}
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[11px]',
                  active ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600',
                )}
              >
                {SURFACE_LABELS[surface]}
              </span>
            ))}
          </div>
          <p className="mt-1 truncate text-[11px] text-gray-400">
            {describeSurfaces(window.surfaces)} · {formatNoticeLead(window.noticeLeadMinutes)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:w-[24%]">
          {active ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onToggleRunning(window, false)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Square data-icon="inline-start" />}
              End now
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || settled}
              onClick={() => onToggleRunning(window, true)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Play data-icon="inline-start" />}
              Start now
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit window"
            disabled={busy || settled}
            onClick={() => onEdit(window)}
          >
            <Pencil />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel window"
            disabled={busy || !scheduled}
            onClick={() => onCancel(window)}
          >
            <X />
          </Button>
        </div>
      </div>
    </li>
  )
}
