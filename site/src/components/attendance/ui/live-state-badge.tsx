import {
  LIVE_STATE_DOT_STYLES,
  LIVE_STATE_LABELS,
  LIVE_STATE_STYLES,
} from '../../../constants/attendance'
import type { LiveAttendanceState } from '../../../types/attendance'
import { LivePulse } from './live-pulse'

interface LiveStateBadgeProps {
  state: LiveAttendanceState
}

/** Mirrors `AttendanceStatusBadge` on the attendees page, plus a pulse when in-area. */
export function LiveStateBadge({ state }: LiveStateBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LIVE_STATE_STYLES[state]}`}
    >
      <LivePulse colorClass={LIVE_STATE_DOT_STYLES[state]} animate={state === 'in_area'} />
      {LIVE_STATE_LABELS[state]}
    </span>
  )
}
