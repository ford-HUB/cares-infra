import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { useEffect } from 'react'
import { formatTimestamp } from '../../constants/formatting'
import type { NotificationCategory } from '../../types/notification'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { useNotificationStore } from '../../store/notification-store'

function getNotificationIcon(category: NotificationCategory) {
  switch (category) {
    case 'volunteer':
    case 'event':
      return <CheckCircle2 className="text-green-500" size={20} />
    case 'reminder':
      return <AlertCircle className="text-yellow-500" size={20} />
    default:
      return <Bell className="text-blue-500" size={20} />
  }
}

export function NotificationsPage() {
  const { feed, loading, load, markRead } = useNotificationStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <ContentShell variant="full">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <div className="flex items-center gap-4">
          <button type="button" className="text-sm text-blue-600 hover:text-blue-800">
            Mark all as read
          </button>
          <button type="button" className="text-sm text-gray-600 hover:text-gray-800">
            Clear all
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading notifications...</p>}

      <div className="space-y-4">
        {feed?.items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border bg-white p-4 shadow-sm ${
              !item.read ? 'border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">{getNotificationIcon(item.category)}</div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                <p className="mt-1 text-gray-600">{item.description}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{formatTimestamp(item.createdAt)}</span>
                  </div>
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && feed?.items.length === 0 && (
        <div className="py-12 text-center">
          <Bell size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No notifications to display</p>
        </div>
      )}
    </ContentShell>
  )
}
