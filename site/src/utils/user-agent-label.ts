/**
 * Condenses a raw user-agent string into a short "Browser on OS" label for the grid.
 * Deliberately coarse — the full string stays on the row's tooltip and in the CSV, so
 * this only has to be readable at a glance, not exhaustive.
 */
const BROWSERS: { match: RegExp; label: string }[] = [
  { match: /Edg\//i, label: 'Edge' },
  { match: /OPR\/|Opera/i, label: 'Opera' },
  { match: /Chrome\//i, label: 'Chrome' },
  { match: /Firefox\//i, label: 'Firefox' },
  { match: /Safari\//i, label: 'Safari' },
  { match: /Dart\/|Flutter/i, label: 'CARES app' },
]

const PLATFORMS: { match: RegExp; label: string }[] = [
  { match: /Windows/i, label: 'Windows' },
  { match: /Android/i, label: 'Android' },
  { match: /iPhone|iPad|iOS/i, label: 'iOS' },
  { match: /Mac OS X|Macintosh/i, label: 'macOS' },
  { match: /Linux/i, label: 'Linux' },
]

export function formatUserAgent(userAgent?: string): string {
  if (!userAgent) return 'Unknown'

  const browser = BROWSERS.find((entry) => entry.match.test(userAgent))?.label
  const platform = PLATFORMS.find((entry) => entry.match.test(userAgent))?.label

  if (browser && platform) return `${browser} on ${platform}`
  return browser ?? platform ?? 'Unknown'
}
