import { useState } from 'react'
import type { ManagedUser } from '../../../types/manage-users'

interface BlockIpModalProps {
  user: ManagedUser | null
  loading?: boolean
  onClose: () => void
  onConfirm: (payload: { ipAddress: string; reason: string }) => void
}

export function BlockIpModal({ user, loading, onClose, onConfirm }: BlockIpModalProps) {
  // Keyed by user id upstream, so the prefill matches the row that opened it.
  const [ipAddress, setIpAddress] = useState(user?.lastLoginIp ?? '')
  const [reason, setReason] = useState('')

  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Block IP address</h3>
        <p className="mt-2 text-sm text-gray-600">
          Sign-in attempts from this address are refused for every account, not just{' '}
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          .
        </p>

        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="block-ip-address">
          IP address
        </label>
        <input
          id="block-ip-address"
          value={ipAddress}
          onChange={(event) => setIpAddress(event.target.value)}
          placeholder={user.lastLoginIp ?? 'e.g. 203.0.113.24'}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          {user.lastLoginIp
            ? `Last sign-in came from ${user.lastLoginIp}.`
            : 'No sign-in has been recorded for this account yet.'}
        </p>

        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="block-ip-reason">
          Reason <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="block-ip-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          placeholder="Why is this address being blocked?"
          className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        />

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
            onClick={() =>
              onConfirm({ ipAddress: ipAddress.trim(), reason: reason.trim() })
            }
            disabled={loading || ipAddress.trim().length === 0}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Block
          </button>
        </div>
      </div>
    </div>
  )
}
