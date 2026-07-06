import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export const NUMBER_LOCALE = 'en-US'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE).format(value)
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
