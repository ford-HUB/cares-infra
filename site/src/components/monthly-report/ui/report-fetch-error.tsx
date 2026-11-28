interface ReportFetchErrorProps {
  message: string
  onRetry: () => void
}

/** Without it, a failed fetch would read as "no submissions yet". */
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
