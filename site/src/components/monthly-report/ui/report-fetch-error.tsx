interface ReportFetchErrorProps {
  message: string
  onRetry: () => void
}

/**
 * A failed fetch leaves the screen empty, which would otherwise read as "no
 * coordinator has submitted yet" — a very different thing from an outage.
 */
export function ReportFetchError({ message, onRetry }: ReportFetchErrorProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-medium underline underline-offset-2 hover:text-red-900"
      >
        Retry
      </button>
    </div>
  )
}
