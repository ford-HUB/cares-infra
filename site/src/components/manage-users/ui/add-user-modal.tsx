import { X } from 'lucide-react'
import { useState } from 'react'
import type { useProvisionUserForm } from '../../../hooks/use-provision-user-form'
import { IssuedCredentialsPanel } from './issued-credentials-panel'
import { ProvisionUserFields } from './provision-user-fields'

type AddUserModalProps = ReturnType<typeof useProvisionUserForm> & {
  open: boolean
  onClose: () => void
}

/**
 * Provisions the account behind an approved access request, then shows the credential
 * once. The two steps share a dialog because the second is the only place the password
 * is ever readable — closing the form on success would throw it away.
 */
export function AddUserModal({ open, onClose, ...provision }: AddUserModalProps) {
  const [scopeOpen, setScopeOpen] = useState(false)
  const { onSubmit, submitting, credentials, reset } = provision

  if (!open) return null

  const close = () => {
    reset()
    setScopeOpen(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-lg">
        <header className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {credentials ? 'Account created' : 'Add user'}
            </h3>
            <p className="mt-0.5 text-[13px] text-gray-500">
              {credentials
                ? 'Hand these credentials to the requester.'
                : 'Issue a portal account for an approved access request.'}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {credentials ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <IssuedCredentialsPanel credentials={credentials} />
            </div>

            <footer className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Done
              </button>
            </footer>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <ProvisionUserFields
                {...provision}
                scopeOpen={scopeOpen}
                onScopeOpenChange={setScopeOpen}
              />
            </div>

            <footer className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create account'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}
