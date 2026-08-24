import { X } from 'lucide-react'
import { RANK_FRAME_DESIGNS } from '../../../constants/rank-frames'
import type { RankFrameAppearance, RankFrameDesignId } from '../../../types/ranking'
import { RankColorPicker } from './rank-color-picker'
import { RankFrame } from './rank-frame'
import { RankFramePicker } from './rank-frame-picker'

interface RankBadgeModalProps {
  /** Tier name in the header, so it is clear which badge is being styled. */
  tierLabel: string
  appearance: RankFrameAppearance
  inputClass: string
  onChange: (patch: Partial<RankFrameAppearance>) => void
  onClose: () => void
}

/**
 * The badge editor, in a modal rather than inline: the gallery is twelve cards
 * wide and a colour picker below it, which pushed the rest of the tier ladder off
 * the page when it opened in place.
 */
export function RankBadgeModal({
  tierLabel,
  appearance,
  inputClass,
  onChange,
  onClose,
}: RankBadgeModalProps) {
  const design = RANK_FRAME_DESIGNS.find((option) => option.id === appearance.frame)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${tierLabel} badge`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <RankFrame appearance={appearance} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-gray-900">
                {tierLabel} badge
              </h3>
              <p className="truncate text-[13px] text-gray-500">
                {design?.label ?? 'Badge'} — {design?.description ?? 'custom frame'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <h4 className="text-[13px] font-medium text-gray-700">Design</h4>
            <p className="mb-2.5 text-[12px] text-gray-500">
              The preset is the ornament only — colours stay whatever this tier is
              set to.
            </p>
            <RankFramePicker
              value={appearance.frame}
              colorFrom={appearance.colorFrom}
              colorTo={appearance.colorTo}
              onChange={(frame: RankFrameDesignId) => onChange({ frame })}
            />
          </section>

          <section className="border-t border-gray-200 pt-5">
            <h4 className="mb-2.5 text-[13px] font-medium text-gray-700">Colours</h4>
            <RankColorPicker
              colorFrom={appearance.colorFrom}
              colorTo={appearance.colorTo}
              onChange={(colors) => onChange(colors)}
              inputClass={inputClass}
            />
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-4">
          <p className="text-[12px] text-gray-500">
            Changes apply to the ladder — save the form to keep them.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg bg-[var(--cares-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--cares-primary-hover)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
