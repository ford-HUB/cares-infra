interface ConfirmBuildingModalProps {
  isOpen: boolean
  buildingName: string
  /** Traced footprint size, already formatted (e.g. "1.12 hectares"). */
  areaLabel: string | null
  /** True when the place has no footprint and a circle is used instead. */
  approximate?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Asks the operator to confirm before a double-clicked building replaces the
 * currently drawn event area.
 */
export function ConfirmBuildingModal({
  isOpen,
  buildingName,
  areaLabel,
  approximate,
  onCancel,
  onConfirm,
}: ConfirmBuildingModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">Use this building as the event area?</h3>
        <p className="mt-2 text-sm text-gray-600">
          <strong>{buildingName}</strong> will be traced as the area that counts a volunteer as
          present. The area currently drawn on the map will be replaced.
        </p>
        {areaLabel && (
          <p className="mt-2 text-xs text-gray-500">
            Traced area: {areaLabel}
            {approximate && ' (approximate — this place has no mapped outline)'}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Yes, use it
          </button>
        </div>
      </div>
    </div>
  )
}
