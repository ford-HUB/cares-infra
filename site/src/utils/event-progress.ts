import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

// Extend here too: relying on constants/formatting would be an import-order bug.
dayjs.extend(relativeTime)

export interface EventProgress {
  /** 0–1, clamped. */
  ratio: number
  /** e.g. `in 3 hours` / `Event window ended`. */
  remainingLabel: string
}

/** Measured against the snapshot's capture time so the bar matches the roster. */
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
