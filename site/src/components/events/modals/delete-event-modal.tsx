interface DeleteEventModalProps {
  isOpen: boolean
  eventName: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export function DeleteEventModal({
  isOpen,
  eventName,
  onClose,
  onConfirm,
  loading,
}: DeleteEventModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete <strong>{eventName}</strong>? This action cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
