import { useState } from 'react'
import type { ManagedUser } from '../../../types/manage-users'

interface RestrictUserModalProps {
  user: ManagedUser | null
  loading?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function RestrictUserModal({
  user,
  loading,
  onClose,
  onConfirm,
}: RestrictUserModalProps) {
  // The parent keys this component by user id, so `reason` starts fresh per target.
  const [reason, setReason] = useState('')

  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Restrict account</h3>
        <p className="mt-2 text-sm text-gray-600">
          <strong>
            {user.firstName} {user.lastName}
          </strong>{' '}
          will be signed out of every device immediately and blocked from signing in
          until an administrator lifts the restriction.
        </p>

        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="restrict-reason">
          Reason
        </label>
        <textarea
          id="restrict-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Why is this account being restricted?"
          maxLength={500}
          className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          This reason is emailed to <span className="font-medium text-gray-700">{user.email}</span>{' '}
          and recorded in the audit log — write it for the user to read.
        </p>

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
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || reason.trim().length === 0}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Restrict
          </button>
        </div>
      </div>
    </div>
  )
}
