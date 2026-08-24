import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export const NUMBER_LOCALE = 'en-US'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE).format(value)
}

export const CURRENCY_CODE = 'PHP'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

export function formatRelativeTime(timestamp: string): string {
  return dayjs(timestamp).fromNow()
}

export function formatTimeOfDay(timestamp: string): string {
  return dayjs(timestamp).format('h:mm A')
}

export function formatDateShort(timestamp: string): string {
  return dayjs(timestamp).format('MMM D, YYYY')
}

export function formatDistanceMeters(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/** `7:00 AM – 4:00 PM` for an event's start/end pair. */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTimeOfDay(start)} – ${formatTimeOfDay(end)}`
}
