import { PanelRightOpen, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  ManagedUser,
  ManagedUserDetail,
} from '../../../types/manage-users'
import { StatusPill } from '../../portal/ui/page-chrome'
import { UserAvatar } from '../../portal/ui/user-avatar'
import { UserDetailsPanel } from './user-details-panel'

interface UserDetailsModalProps {
  user: ManagedUser | null
  detail: ManagedUserDetail | null
  detailLoading: boolean
  detailError?: string
  panelOpen: boolean
  onOpenPanel: () => void
  onClosePanel: () => void
  onClose: () => void
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-b-0">
      <span className="text-[13px] text-gray-500">{label}</span>
      <span className="text-[13px] font-medium text-gray-900">{children}</span>
    </div>
  )
}

export function UserDetailsModal({
  user,
  detail,
  detailLoading,
  detailError,
  panelOpen,
  onOpenPanel,
  onClosePanel,
  onClose,
}: UserDetailsModalProps) {
  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Centred wrapper stays put — the panel is absolutely positioned off its right edge. */}
      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                firstName={user.firstName}
                lastName={user.lastName}
                size="lg"
              />
              <div>
                <p className="font-semibold text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-2">
            <DetailRow label="Status">
              <StatusPill status={user.status} />
            </DetailRow>
            <DetailRow label="Role">
              <span className="capitalize">{user.role}</span>
            </DetailRow>
            <DetailRow label="Department">{user.department ?? 'N/A'}</DetailRow>
            <DetailRow label="Last sign-in IP">
              <span className="font-mono text-xs text-gray-600">
                {user.lastLoginIp ?? 'Never signed in'}
              </span>
            </DetailRow>
            <DetailRow label="Blocked IPs">
              <span className="font-mono text-xs text-gray-600">
                {user.blockedIps.length > 0
                  ? user.blockedIps.join(', ')
                  : 'None'}
              </span>
            </DetailRow>
            {user.restrictionReason && (
              <DetailRow label="Restriction reason">
                <span className="text-right text-[13px] text-red-700">
                  {user.restrictionReason}
                </span>
              </DetailRow>
            )}
            <DetailRow label="User ID">
              <span className="font-mono text-xs text-gray-600">{user.id}</span>
            </DetailRow>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3">
            <button
              type="button"
              onClick={panelOpen ? onClosePanel : onOpenPanel}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--cares-primary)] hover:underline"
            >
              <PanelRightOpen className="h-4 w-4" />
              {panelOpen ? 'Hide full information' : 'View full information'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {panelOpen && (
          <div className="absolute top-1/2 left-full ml-4 -translate-y-1/2">
            <UserDetailsPanel
              detail={detail}
              loading={detailLoading}
              error={detailError}
              onClose={onClosePanel}
            />
          </div>
        )}
      </div>
    </div>
  )
}
