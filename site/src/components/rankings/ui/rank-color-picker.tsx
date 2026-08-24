import { HEX_COLOR_PATTERN, RANK_COLOR_COMBOS } from '../../../constants/rank-frames'

interface RankColorPickerProps {
  colorFrom: string
  colorTo: string
  onChange: (colors: { colorFrom: string; colorTo: string }) => void
  /** Swatch is a combo shortcut; the two inputs stay the source of truth. */
  inputClass: string
}

/**
 * A half-typed hex ("#f9") is not a colour a swatch input can show, so it keeps the
 * last complete value while the text field carries the in-progress one.
 */
function swatchValue(color: string, fallback: string): string {
  return HEX_COLOR_PATTERN.test(color.trim()) ? color : fallback
}

const swatchStyle = (from: string, to: string) => ({
  backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
})

export function RankColorPicker({
  colorFrom,
  colorTo,
  onChange,
  inputClass,
}: RankColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-[12px] font-medium text-gray-700">Gradient start</span>
          <span className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              aria-label="Gradient start colour"
              value={swatchValue(colorFrom, '#ffffff')}
              onChange={(event) =>
                onChange({ colorFrom: event.target.value, colorTo })
              }
              className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
            />
            <input
              type="text"
              aria-label="Gradient start hex"
              value={colorFrom}
              onChange={(event) =>
                onChange({ colorFrom: event.target.value, colorTo })
              }
              className={`${inputClass} w-24 font-mono uppercase`}
            />
          </span>
        </label>

        <label className="block">
          <span className="text-[12px] font-medium text-gray-700">Gradient end</span>
          <span className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              aria-label="Gradient end colour"
              value={swatchValue(colorTo, '#000000')}
              onChange={(event) =>
                onChange({ colorFrom, colorTo: event.target.value })
              }
              className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
            />
            <input
              type="text"
              aria-label="Gradient end hex"
              value={colorTo}
              onChange={(event) =>
                onChange({ colorFrom, colorTo: event.target.value })
              }
              className={`${inputClass} w-24 font-mono uppercase`}
            />
          </span>
        </label>
      </div>

      <div>
        <span className="text-[12px] font-medium text-gray-700">Quick combos</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {RANK_COLOR_COMBOS.map((combo) => {
            const active =
              combo.colorFrom.toLowerCase() === colorFrom.toLowerCase() &&
              combo.colorTo.toLowerCase() === colorTo.toLowerCase()

            return (
              <button
                key={combo.id}
                type="button"
                title={combo.label}
                aria-label={`Use the ${combo.label} colours`}
                aria-pressed={active}
                onClick={() =>
                  onChange({ colorFrom: combo.colorFrom, colorTo: combo.colorTo })
                }
                style={swatchStyle(combo.colorFrom, combo.colorTo)}
                className={`h-8 w-8 rounded-full ring-offset-2 transition-transform hover:scale-105 ${
                  active ? 'ring-2 ring-[var(--cares-primary)]' : 'ring-1 ring-gray-200'
                }`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
