import { AlertTriangle } from 'lucide-react'
import { SESSION_SOURCE_LABELS } from '../../../constants/active-sessions'
import type { ActiveSession } from '../../../types/active-session'
import { formatUserAgent } from '../../../utils/user-agent-label'

export type RevokeTarget =
  /** One device. */
  | { kind: 'session'; session: ActiveSession }
  /** Every device of the account behind the row. */
  | { kind: 'user'; session: ActiveSession; sessionCount: number }

interface RevokeSessionModalProps {
  target: RevokeTarget | null
  loading?: boolean
  onClose: () => void
  onConfirm: (target: RevokeTarget) => void
}

/**
 * Revoking is immediate and cannot be undone — the device has to sign in again — so it
 * goes through a confirmation that names exactly what is about to be ended.
 */
export function RevokeSessionModal({
  target,
  loading,
  onClose,
  onConfirm,
}: RevokeSessionModalProps) {
  if (!target) return null

  const { session } = target
  const name =
    [session.firstName, session.lastName].filter(Boolean).join(' ') || session.email
  const device = `${SESSION_SOURCE_LABELS[session.source]} · ${formatUserAgent(session.userAgent)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">
          {target.kind === 'session' ? 'End this session' : 'End all sessions'}
        </h3>

        {target.kind === 'session' ? (
          <p className="mt-2 text-sm text-gray-600">
            <strong>{name}</strong> will be signed out on this device
            {' — '}
            {device} at {session.ipAddress}. They can sign in again straight away.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            <strong>{name}</strong> will be signed out of{' '}
            <strong>{target.sessionCount}</strong>{' '}
            {target.sessionCount === 1 ? 'device' : 'devices'}, on the portal and the
            mobile app. They can sign in again straight away.
          </p>
        )}

        {session.isCurrent && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This is the browser you are using now. Confirming signs you out of the
            portal.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target)}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {target.kind === 'session' ? 'End session' : 'End all sessions'}
          </button>
        </div>
      </div>
    </div>
  )
}
