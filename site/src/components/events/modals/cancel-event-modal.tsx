interface CancelEventModalProps {
  isOpen: boolean
  eventName: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

/**
 * Confirmation for cancelling an event. Cancelling notifies registered participants, so it
 * gets the same confirm step as deleting rather than firing straight from the row menu.
 */
export function CancelEventModal({
  isOpen,
  eventName,
  onClose,
  onConfirm,
  loading,
}: CancelEventModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Cancel Event</h3>
        <p className="mt-2 text-sm text-gray-600">
          Cancel <strong>{eventName}</strong>? The event stays in the list as cancelled and
          registered participants will no longer be able to join.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Keep event
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Cancel event
          </button>
        </div>
      </div>
    </div>
  )
}
