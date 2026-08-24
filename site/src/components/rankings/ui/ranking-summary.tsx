import { Skeleton } from '@/components/ui/skeleton'

interface RankingSummaryProps {
  /** One tile per headline figure for the active board. */
  tiles: { label: string; value: string; hint: string }[]
  loading: boolean
}

export function RankingSummary({ tiles, loading }: RankingSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            {tile.label}
          </p>
          {loading ? (
            <Skeleton aria-hidden className="mt-2 h-6 w-28" />
          ) : (
            <p className="mt-1 text-xl font-semibold text-gray-900">{tile.value}</p>
          )}
          <p className="mt-1 text-[12px] text-gray-500">{tile.hint}</p>
        </div>
      ))}
    </div>
  )
}
