/** Mirrors the server's Zod bounds — the inputs cannot offer a value it would reject. */
export const PASSWORD_MIN_LENGTH_FLOOR = 8
export const PASSWORD_MIN_LENGTH_CEILING = 64

export const LOCKOUT_ATTEMPTS_MIN = 3
export const LOCKOUT_ATTEMPTS_MAX = 20

export const MINUTES_IN_DAY = 1440

/** Long enough for a month-long session; past that the token's own expiry rules. */
export const SESSION_MAX_DURATION_HOURS_CEILING = 720

export const MAX_CONCURRENT_SESSIONS_CEILING = 20

export const IP_ALLOWLIST_MAX = 100

/** Every field is 0-means-off, so the forms share one hint. */
export const ZERO_MEANS_UNLIMITED = 'Set to 0 to leave this unlimited.'

/** `<input type="time">` speaks "HH:mm"; the policy stores minutes since midnight. */
export function minuteOfDayToTime(minuteOfDay: number): string {
  const normalized = ((minuteOfDay % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0')
  const minutes = String(normalized % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function timeToMinuteOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return hours * 60 + minutes
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/
/** Deliberately loose — the server's Zod check is the authority; this only catches typos. */
const IPV6 = /^[0-9a-fA-F:]+$/

export function isIpAddress(value: string): boolean {
  return IPV4.test(value) || (value.includes(':') && IPV6.test(value))
}
