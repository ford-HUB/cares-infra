import { Check } from 'lucide-react'
import { RANK_FRAME_DESIGNS } from '../../../constants/rank-frames'
import type { RankFrameDesignId } from '../../../types/ranking'
import { RankFrame } from './rank-frame'

interface RankFramePickerProps {
  value: RankFrameDesignId
  /** Previews wear the tier's own colours, so the choice is design only. */
  colorFrom: string
  colorTo: string
  onChange: (design: RankFrameDesignId) => void
}

/** The design gallery — one preset per card, drawn live in the tier's colours. */
export function RankFramePicker({
  value,
  colorFrom,
  colorTo,
  onChange,
}: RankFramePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Badge design"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
    >
      {RANK_FRAME_DESIGNS.map((design) => {
        const selected = design.id === value

        return (
          <button
            key={design.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(design.id)}
            title={design.description}
            className={`relative flex min-w-0 flex-col items-center gap-2 rounded-lg border px-2 py-3 transition-colors ${
              selected
                ? 'border-[var(--cares-primary)] bg-[var(--cares-primary)]/[0.04]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            {selected && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--cares-primary)] text-white">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}

            {/* Padded so the ornaments that sit outside the ring aren't clipped. */}
            <span className="flex h-16 w-16 items-center justify-center">
              <RankFrame
                appearance={{ frame: design.id, colorFrom, colorTo }}
                size="md"
              />
            </span>

            <span className="max-w-full truncate text-[12px] font-medium text-gray-800">
              {design.label}
            </span>
            <span className="max-w-full text-center text-[11px] leading-tight text-balance text-gray-500">
              {design.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
