import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEPS,
  clampFontSize,
} from '../../../constants/certificate-typography'

interface CertificateFontSizeFieldProps {
  /** Points the selected block prints at. */
  value: number
  onChange: (size: number) => void
  /** No block selected — there is nothing to size. */
  disabled?: boolean
}

/** The next size up or down the ladder, so the steppers move in usable jumps. */
function step(value: number, direction: 1 | -1): number {
  const next =
    direction === 1
      ? FONT_SIZE_STEPS.find((one) => one > value)
      : [...FONT_SIZE_STEPS].reverse().find((one) => one < value)
  return clampFontSize(next ?? value + direction)
}

/**
 * Text size in points, the Google Docs way: a ladder of common sizes to pick from,
 * steppers either side, and any number in between typed straight in.
 */
export function CertificateFontSizeField({
  value,
  onChange,
  disabled = false,
}: CertificateFontSizeFieldProps) {
  // The box is uncontrolled and keyed on the size, so picking another block or
  // stepping the value reloads it without a draft state to keep in sync.
  const commit = (input: HTMLInputElement) => {
    const parsed = Number(input.value)
    if (!Number.isFinite(parsed) || input.value.trim() === '') {
      input.value = String(value)
      return
    }

    const size = clampFontSize(parsed)
    input.value = String(size)
    onChange(size)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Smaller text"
        disabled={disabled || value <= FONT_SIZE_MIN}
        onClick={() => onChange(step(value, -1))}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      {/* The ladder is a menu, but the box itself takes any size in points. */}
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          aria-label="Text size in points"
          disabled={disabled}
          key={value}
          defaultValue={value}
          onBlur={(event) => commit(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            commit(event.currentTarget)
          }}
          className="h-7 w-[4.5rem] rounded-[min(var(--radius-md),10px)] border border-input bg-transparent pr-6 pl-2 text-[13px] tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Select
          value={String(value)}
          onValueChange={(next) => onChange(clampFontSize(Number(next)))}
          disabled={disabled}
        >
          <SelectTrigger
            size="sm"
            aria-label="Pick a text size"
            className="absolute inset-y-0 right-0 h-7 w-6 justify-center border-0 bg-transparent px-0 focus-visible:ring-0"
          >
            <SelectValue>
              <span className="sr-only">{value}pt</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" align="end" className="max-h-[18rem]">
            {FONT_SIZE_STEPS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                <span className="tabular-nums">{size}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Larger text"
        disabled={disabled || value >= FONT_SIZE_MAX}
        onClick={() => onChange(step(value, 1))}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
