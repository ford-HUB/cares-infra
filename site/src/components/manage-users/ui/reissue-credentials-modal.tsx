import { useState } from 'react'
import {
  CREDENTIAL_DEFAULT_HOURS,
  CREDENTIAL_LIFETIME_OPTIONS,
} from '../../../constants/manage-users'
import type { IssuedCredentials, ManagedUser } from '../../../types/manage-users'
import { IssuedCredentialsPanel } from './issued-credentials-panel'

interface ReissueCredentialsModalProps {
  user: ManagedUser | null
  /** Set once the server has issued them — the dialog then only shows the result. */
  credentials: IssuedCredentials | null
  loading?: boolean
  onClose: () => void
  onConfirm: (expiresInHours: number) => void
}

/**
 * Replaces the password on an account whose temporary one lapsed or was never
 * collected. The sign-in email is left alone: the requester already has it.
 */
export function ReissueCredentialsModal({
  user,
  credentials,
  loading,
  onClose,
  onConfirm,
}: ReissueCredentialsModalProps) {
  // The parent keys this component by user id, so the choice starts fresh per target.
  const [expiresInHours, setExpiresInHours] = useState<number>(CREDENTIAL_DEFAULT_HOURS)

  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">
          {credentials ? 'New credentials issued' : 'Re-issue credentials'}
        </h3>

        {credentials ? (
          <div className="mt-4">
            <IssuedCredentialsPanel credentials={credentials} />
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              A new password will be issued for{' '}
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              . The current one stops working immediately; the sign-in email stays{' '}
              <span className="font-mono text-[13px]">{user.email}</span>.
            </p>

            <label
              className="mt-4 block text-sm font-medium text-gray-700"
              htmlFor="reissue-expiry"
            >
              Expires in
            </label>
            <select
              id="reissue-expiry"
              value={expiresInHours}
              onChange={(event) => setExpiresInHours(Number(event.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            >
              {CREDENTIAL_LIFETIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={
              credentials
                ? 'rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm text-white hover:opacity-90'
                : 'rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
            }
          >
            {credentials ? 'Done' : 'Cancel'}
          </button>

          {!credentials && (
            <button
              type="button"
              onClick={() => onConfirm(expiresInHours)}
              disabled={loading}
              className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Issuing…' : 'Issue new password'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
