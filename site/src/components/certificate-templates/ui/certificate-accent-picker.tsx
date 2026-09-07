import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CERTIFICATE_ACCENT_ORDER,
  CERTIFICATE_ACCENT_STYLES,
} from '../../../constants/certificate-design'
import type { CertificateAccent } from '../../../types/certificate-template'

interface CertificateAccentPickerProps {
  value: CertificateAccent
  onChange: (accent: CertificateAccent) => void
}

/** Colour here is the director's choice of look, the one place it carries no status. */
export function CertificateAccentPicker({
  value,
  onChange,
}: CertificateAccentPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CERTIFICATE_ACCENT_ORDER.map((accent) => {
        const style = CERTIFICATE_ACCENT_STYLES[accent]
        const selected = accent === value

        return (
          <button
            key={accent}
            type="button"
            aria-pressed={selected}
            aria-label={style.label}
            title={style.label}
            onClick={() => onChange(accent)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors',
              'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:ring-offset-2 focus-visible:outline-none',
              style.swatch,
              selected ? 'ring-2 ring-gray-900 ring-offset-2' : 'hover:opacity-80',
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" />}
          </button>
        )
      })}
    </div>
  )
}
