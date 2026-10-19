import { useState } from 'react'
import type { ManagedUser } from '../../../types/manage-users'

interface DeleteUserModalProps {
  user: ManagedUser | null
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteUserModal({
  user,
  loading,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  // The parent keys this component by user id, so the confirmation starts empty per target.
  const [confirmation, setConfirmation] = useState('')

  if (!user) return null

  // Typing the address back is the guard against deleting the wrong row — there is no undo.
  const expected = user.email || `${user.firstName} ${user.lastName}`.trim()
  const confirmed = confirmation.trim().toLowerCase() === expected.toLowerCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Delete account</h3>
        <p className="mt-2 text-sm text-gray-600">
          <strong>
            {user.firstName} {user.lastName}
          </strong>{' '}
          will be signed out and permanently removed, along with their profile,
          attendance, requests, and other records. This cannot be undone.
        </p>

        <label
          className="mt-4 block text-sm font-medium text-gray-700"
          htmlFor="delete-confirmation"
        >
          Type <span className="font-mono text-gray-900">{expected}</span> to confirm
        </label>
        <input
          id="delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-red-500 focus:outline-none"
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
            onClick={onConfirm}
            disabled={loading || !confirmed}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Delete user
          </button>
        </div>
      </div>
    </div>
  )
}
