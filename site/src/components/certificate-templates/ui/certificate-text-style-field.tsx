import { Bold, Underline } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import {
  FONT_WEIGHT_LABELS,
  FONT_WEIGHT_ORDER,
  FONT_WEIGHT_VALUES,
} from '../../../constants/certificate-typography'
import type { CertificateFontWeight } from '../../../types/certificate-template'

/** Radix refuses an empty item value, so "leave it to the frame" needs a name. */
const FRAME_WEIGHT = 'frame'

interface CertificateTextStyleFieldProps {
  /** `undefined` while the block keeps the frame's own weight. */
  weight: CertificateFontWeight | undefined
  underline: boolean
  onWeightChange: (weight: CertificateFontWeight | undefined) => void
  onUnderlineChange: (underline: boolean) => void
  /** No block selected — weight and underline are always a property of one block. */
  disabled?: boolean
}

/**
 * Sets how heavy the selected block's text is and whether it is underlined. Each
 * weight previews at its own weight, because "Semibold" and "Bold" are hard to tell
 * apart by name alone.
 */
export function CertificateTextStyleField({
  weight,
  underline,
  onWeightChange,
  onUnderlineChange,
  disabled = false,
}: CertificateTextStyleFieldProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={weight ?? FRAME_WEIGHT}
        disabled={disabled}
        onValueChange={(next) =>
          onWeightChange(
            next === FRAME_WEIGHT ? undefined : (next as CertificateFontWeight),
          )
        }
      >
        <SelectTrigger size="sm" className="w-[9.5rem]" aria-label="Text weight">
          <Bold className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <SelectValue>
            <span
              className="truncate text-[13px] text-gray-900"
              style={weight ? { fontWeight: FONT_WEIGHT_VALUES[weight] } : undefined}
            >
              {weight ? FONT_WEIGHT_LABELS[weight] : 'Frame weight'}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="w-[11rem]">
          <SelectItem value={FRAME_WEIGHT} textValue="Frame weight">
            <span className="text-[13px] text-gray-900">Frame weight</span>
          </SelectItem>
          {FONT_WEIGHT_ORDER.map((option) => (
            <SelectItem
              key={option}
              value={option}
              textValue={FONT_WEIGHT_LABELS[option]}
            >
              <span
                className="text-[13px] text-gray-900"
                style={{ fontWeight: FONT_WEIGHT_VALUES[option] }}
              >
                {FONT_WEIGHT_LABELS[option]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Toggle
        variant="outline"
        size="sm"
        pressed={underline}
        disabled={disabled}
        onPressedChange={onUnderlineChange}
        aria-label="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </Toggle>
    </div>
  )
}
