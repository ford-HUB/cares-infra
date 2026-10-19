export type RequestTab = 'access' | 'registration' | 'assistance'

const TABS: { value: RequestTab; label: string }[] = [
  { value: 'access', label: 'Access & event requests' },
  { value: 'registration', label: 'Beneficiary registrations' },
  { value: 'assistance', label: 'Assistance requests' },
]

interface RequestTypeTabsProps {
  tab: RequestTab
  onTabChange: (tab: RequestTab) => void
  /** Requests awaiting review in each queue — shown so neither hides new work. */
  counts: Record<RequestTab, number>
}

/** Underline tabs splitting the Request page into its queues. */
export function RequestTypeTabs({ tab, onTabChange, counts }: RequestTypeTabsProps) {
  return (
    <div role="tablist" aria-label="Request type" className="mb-5 flex gap-6 border-b border-gray-200">
      {TABS.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === tab}
          onClick={() => onTabChange(item.value)}
          className={`-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-2.5 text-[13px] font-medium transition-colors ${
            item.value === tab
              ? 'border-[var(--cares-primary)] text-[var(--cares-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {item.label}
          {counts[item.value] > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {counts[item.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
