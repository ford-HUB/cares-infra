interface AccessScopeCellProps {
  effective: number
  total: number
}

/**
 * How much of the portal an account can reach, as a proportion of every gated action.
 * The bar makes "narrow scope" legible at a glance when scanning the column.
 */
export function AccessScopeCell({ effective, total }: AccessScopeCellProps) {
  const ratio = total === 0 ? 0 : effective / total
  const percent = Math.round(ratio * 100)

  const tone =
    ratio >= 0.75
      ? 'bg-[var(--cares-primary)]'
      : ratio >= 0.35
        ? 'bg-amber-500'
        : 'bg-gray-400'

  return (
    <div className="flex items-center gap-2">
      <div
        role="img"
        aria-label={`${effective} of ${total} actions granted`}
        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-gray-200"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[12px] tabular-nums text-gray-600">
        {effective}/{total}
      </span>
    </div>
  )
}
