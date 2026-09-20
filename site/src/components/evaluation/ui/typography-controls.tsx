import {
  EVALUATION_FONT_META,
  EVALUATION_FONT_ORDER,
  EVALUATION_FONT_SIZE_META,
  EVALUATION_FONT_SIZE_ORDER,
} from '../../../constants/evaluation'
import type {
  EvaluationFontFamily,
  EvaluationFontSize,
  EvaluationTypography,
} from '../../../types/evaluation'

interface TypographyControlsProps {
  value: EvaluationTypography
  onChange: (patch: Partial<EvaluationTypography>) => void
  /** Prefix for the two selects' accessible names, e.g. "Question 3". */
  label: string
}

const selectClass =
  'h-8 rounded-md border border-gray-200 bg-white px-2 text-[12px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

/** Font family + size pair — the same two controls on the header card and each question. */
export function TypographyControls({ value, onChange, label }: TypographyControlsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label={`${label} font family`}
        value={value.fontFamily}
        onChange={(event) => onChange({ fontFamily: event.target.value as EvaluationFontFamily })}
        style={{ fontFamily: EVALUATION_FONT_META[value.fontFamily].stack }}
        className={`${selectClass} w-36`}
      >
        {EVALUATION_FONT_ORDER.map((family) => (
          <option
            key={family}
            value={family}
            style={{ fontFamily: EVALUATION_FONT_META[family].stack }}
          >
            {EVALUATION_FONT_META[family].label}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} font size`}
        value={value.fontSize}
        onChange={(event) => onChange({ fontSize: event.target.value as EvaluationFontSize })}
        className={`${selectClass} w-28`}
      >
        {EVALUATION_FONT_SIZE_ORDER.map((size) => (
          <option key={size} value={size}>
            {EVALUATION_FONT_SIZE_META[size].label}
          </option>
        ))}
      </select>
    </div>
  )
}
