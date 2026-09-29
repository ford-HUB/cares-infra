import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

// `end.from(now)` needs the plugin; extending is idempotent, and relying on
// constants/formatting having already done it would be an invisible import-order bug.
dayjs.extend(relativeTime)

export interface EventProgress {
  /** 0–1 share of the event window already elapsed, clamped at both ends. */
  ratio: number
  /** Human label for what is left, e.g. `in 3 hours` / `Event window ended`. */
  remainingLabel: string
}

/**
 * How far through its window a running event is, measured against the snapshot's
 * capture time rather than `Date.now()` so the bar and the roster below it always
 * describe the same moment.
 */
export function eventProgress(
  startsAt: string,
  endsAt: string,
  capturedAt: string,
): EventProgress {
  const start = dayjs(startsAt)
  const end = dayjs(endsAt)
  const now = dayjs(capturedAt)

  const span = end.diff(start)
  const ratio = span <= 0 ? 1 : Math.min(1, Math.max(0, now.diff(start) / span))

  return {
    ratio,
    remainingLabel: now.isAfter(end) ? 'Event window ended' : `ends ${end.from(now)}`,
  }
}
