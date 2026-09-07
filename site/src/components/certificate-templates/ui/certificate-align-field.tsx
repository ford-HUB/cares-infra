import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  TEXT_ALIGN_LABELS,
  TEXT_ALIGN_ORDER,
} from '../../../constants/certificate-typography'
import type { CertificateTextAlign } from '../../../types/certificate-template'

const ALIGN_ICONS: Record<CertificateTextAlign, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
}

interface CertificateAlignFieldProps {
  value: CertificateTextAlign
  onChange: (align: CertificateTextAlign) => void
  /** No block selected — alignment is always a property of one block. */
  disabled?: boolean
}

/**
 * Pushes the selected block's text to the left edge of its own box, the centre, or
 * the right edge — the box itself stays where it was dragged.
 */
export function CertificateAlignField({
  value,
  onChange,
  disabled = false,
}: CertificateAlignFieldProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      disabled={disabled}
      onValueChange={(next) => next && onChange(next as CertificateTextAlign)}
    >
      {TEXT_ALIGN_ORDER.map((align) => {
        const Icon = ALIGN_ICONS[align]

        return (
          <ToggleGroupItem
            key={align}
            value={align}
            aria-label={TEXT_ALIGN_LABELS[align]}
          >
            <Icon className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
