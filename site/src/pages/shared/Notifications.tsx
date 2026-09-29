import { CheckCheck, ChevronDown, ChevronRight, Eraser } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationFeed } from '../../components/notifications/notification-feed'
import { NotificationsSkeleton } from '../../components/notifications/ui/notifications-skeleton'
import { DesktopAlertsButton } from '../../components/notifications/ui/desktop-alerts-button'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { formatNumber } from '../../constants/formatting'
import {
  ROLE_NOTIFICATION_BLURBS,
  splitNotificationFeed,
} from '../../constants/notifications'
import { usePortalRole } from '../../store/auth-store'
import { useNotificationStore } from '../../store/notification-store'

/**
 * The portal's inbox, scoped to the signed-in role. It answers one question first —
 * how much of this week still needs looking at — then lists the week by day, and keeps
 * everything older folded away as history so the record is there without crowding
 * what is current.
 */
export function NotificationsPage() {
  const role = usePortalRole()
  const feed = useNotificationStore((s) => s.feed)
  const initialized = useNotificationStore((s) => s.initialized)
  const error = useNotificationStore((s) => s.error)
  const load = useNotificationStore((s) => s.load)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const dismiss = useNotificationStore((s) => s.dismiss)
  const clearRead = useNotificationStore((s) => s.clearRead)

  const [unreadOnly, setUnreadOnly] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const items = useMemo(() => feed?.items ?? [], [feed])

  const { recent, history } = useMemo(() => {
    const matching = unreadOnly ? items.filter((item) => !item.read) : items
    return splitNotificationFeed(matching)
  }, [items, unreadOnly])

  const historyCount = history.reduce((sum, group) => sum + group.items.length, 0)
  const unreadTotal = feed?.summary.unread ?? 0
  const readTotal = feed?.summary.read ?? 0

  return (
    <ContentShell>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900">Notifications</h1>
          <p className="mt-0.5 text-[13px] text-gray-600">
            {role ? ROLE_NOTIFICATION_BLURBS[role] : 'What the portal has told you.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DesktopAlertsButton />
          <Button
            size="sm"
            variant="outline"
            disabled={unreadTotal === 0}
            onClick={() => void markAllRead()}
          >
            <CheckCheck data-icon="inline-start" />
            Mark all read
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={readTotal === 0}
            onClick={() => void clearRead()}
          >
            <Eraser data-icon="inline-start" />
            Clear read
          </Button>
        </div>
      </header>

      {error && !feed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      ) : !initialized ? (
        <NotificationsSkeleton groups={2} rowsPerGroup={3} />
      ) : (
        <div className="space-y-4">
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 pt-1">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                This week
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 tabular-nums">
                  {formatNumber(recent.reduce((sum, group) => sum + group.items.length, 0))}
                </span>
              </h2>

              <button
                type="button"
                aria-pressed={unreadOnly}
                onClick={() => setUnreadOnly((current) => !current)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[12px] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                  unreadOnly
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                Unread only
              </button>
            </div>

            <NotificationFeed
              groups={recent}
              variant="recent"
              emptyMessage={
                unreadOnly
                  ? `Nothing unread this week — you are caught up.`
                  : `Nothing in the last week.`
              }
              onMarkRead={(id) => void markRead(id)}
              onDismiss={(id) => void dismiss(id)}
            />
          </section>

          <section>
            <button
              type="button"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((current) => !current)}
              className="mb-2 flex w-full items-center gap-2 rounded-lg py-1 text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
            >
              {historyOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
              <h2 className="text-[13px] font-semibold text-gray-700">History</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 tabular-nums">
                {formatNumber(historyCount)}
              </span>
              <span className="text-[12px] text-gray-400">
                {historyOpen ? 'Older than a week, by month' : 'Older than a week'}
              </span>
            </button>

            {historyOpen && (
              <NotificationFeed
                groups={history}
                variant="history"
                emptyMessage={`Nothing older than a week.`}
                onMarkRead={(id) => void markRead(id)}
                onDismiss={(id) => void dismiss(id)}
              />
            )}
          </section>
        </div>
      )}
    </ContentShell>
  )
}
