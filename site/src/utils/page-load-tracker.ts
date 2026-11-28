import type { InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../services/api-client'
import { reportPageTiming } from '../services/system-performance-service'
import type { PortalNavConfig } from '../types/nav'

/** Route changes are client-side, so navigation timing only covers the first load; marks are taken by hand. */

/** Later requests belong to polling. */
const REQUEST_WINDOW_MS = 5_000

const SETTLE_QUIET_MS = 300

const MAX_WAIT_MS = 15_000

/** Telemetry must not count toward the screen it describes. */
const EXCLUDED_URL = '/system-performance/page-timings'

/** Collapsed so one screen is one row. */
const ID_SEGMENT =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+|[A-Za-z0-9_-]{24,})$/i

interface Tracking {
  route: string
  label: string
  /** Zero for the tab's first load. */
  start: number
  firstResponseAt: number | null
  lastResponseAt: number | null
  paintedAt: number | null
  pending: number
  quietTimer: number | null
  deadlineTimer: number | null
}

type TrackedConfig = InternalAxiosRequestConfig & { __pageLoadTracked?: boolean }

let current: Tracking | null = null
let interceptorsInstalled = false
let firstNavigationDone = false

/** Any screen still being timed is dropped. */
export function trackPageLoad(pathname: string, nav: PortalNavConfig): void {
  installInterceptors()
  if (current) cancel(current)

  const isFirst = !firstNavigationDone
  firstNavigationDone = true

  const tracking: Tracking = {
    route: normaliseRoute(pathname),
    label: labelFor(pathname, nav),
    start: isFirst ? 0 : performance.now(),
    firstResponseAt: null,
    lastResponseAt: null,
    paintedAt: null,
    pending: 0,
    quietTimer: null,
    deadlineTimer: null,
  }
  current = tracking

  if (isFirst) seedFromNavigationTiming(tracking)

  // Two frames: the second is the one the new screen is visible in.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (current !== tracking) return
      tracking.paintedAt ??= performance.now()
      maybeSettle(tracking)
    }),
  )

  tracking.deadlineTimer = window.setTimeout(() => {
    if (current === tracking) finish(tracking)
  }, MAX_WAIT_MS)
}

function seedFromNavigationTiming(tracking: Tracking): void {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (!entry) return
  tracking.firstResponseAt = entry.responseStart
  tracking.paintedAt = entry.domContentLoadedEventEnd || null
}

function installInterceptors(): void {
  if (interceptorsInstalled) return
  interceptorsInstalled = true

  apiClient.interceptors.request.use((config: TrackedConfig) => {
    const tracking = current
    if (
      tracking &&
      !(config.url ?? '').includes(EXCLUDED_URL) &&
      performance.now() - tracking.start <= REQUEST_WINDOW_MS
    ) {
      config.__pageLoadTracked = true
      tracking.pending += 1
      if (tracking.quietTimer) {
        window.clearTimeout(tracking.quietTimer)
        tracking.quietTimer = null
      }
    }
    return config
  })

  const onDone = (config: TrackedConfig | undefined) => {
    const tracking = current
    if (!tracking || !config?.__pageLoadTracked) return
    const now = performance.now()
    tracking.pending = Math.max(0, tracking.pending - 1)
    tracking.firstResponseAt ??= now
    tracking.lastResponseAt = now
    maybeSettle(tracking)
  }

  apiClient.interceptors.response.use(
    (response) => {
      onDone(response.config)
      return response
    },
    (error: unknown) => {
      onDone((error as { config?: TrackedConfig })?.config)
      return Promise.reject(error)
    },
  )
}

function maybeSettle(tracking: Tracking): void {
  if (tracking.pending > 0 || tracking.paintedAt === null) return
  if (tracking.quietTimer) window.clearTimeout(tracking.quietTimer)
  tracking.quietTimer = window.setTimeout(() => {
    if (current === tracking) finish(tracking)
  }, SETTLE_QUIET_MS)
}

function finish(tracking: Tracking): void {
  cancel(tracking)
  current = null

  const painted = tracking.paintedAt ?? performance.now()
  const ttfb = tracking.firstResponseAt ?? tracking.start
  const interactive = Math.max(painted, tracking.lastResponseAt ?? painted)

  void reportPageTiming({
    route: tracking.route,
    label: tracking.label,
    ttfbMs: Math.max(0, ttfb - tracking.start),
    domReadyMs: Math.max(0, painted - tracking.start),
    interactiveMs: Math.max(0, interactive - tracking.start),
  })
}

function cancel(tracking: Tracking): void {
  if (tracking.quietTimer) window.clearTimeout(tracking.quietTimer)
  if (tracking.deadlineTimer) window.clearTimeout(tracking.deadlineTimer)
  tracking.quietTimer = null
  tracking.deadlineTimer = null
}

export function normaliseRoute(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment))
    .join('/')
}

/** Longest nav path the route sits under. */
export function labelFor(pathname: string, nav: PortalNavConfig): string {
  let bestLabel = ''
  let bestLength = -1
  const consider = (label: string, to: string) => {
    if (pathname !== to && !pathname.startsWith(`${to}/`)) return
    if (to.length > bestLength) {
      bestLabel = label
      bestLength = to.length
    }
  }

  for (const item of nav.items) {
    if (item.type === 'link') consider(item.label, item.to)
    if (item.type === 'group') {
      for (const child of item.children) consider(`${item.label} · ${child.label}`, child.to)
    }
  }
  if (bestLabel) return bestLabel

  const last = normaliseRoute(pathname).split('/').filter(Boolean).pop() ?? 'portal'
  return last.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
