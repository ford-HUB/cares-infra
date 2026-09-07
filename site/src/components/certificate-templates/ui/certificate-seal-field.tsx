import { FileUp, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  CERTIFICATE_SEAL_ORDER,
  CERTIFICATE_SEAL_PRESETS,
  SEAL_SVG_ACCEPTED_TYPES,
  SEAL_SVG_MAX_BYTES,
  sealAccentOf,
  sealStyleOf,
} from '../../../constants/certificate-seals'
import { formatFileSize } from '../../../constants/formatting'
import type {
  CertificateAccent,
  CertificateDesign,
  CertificateSealStyle,
} from '../../../types/certificate-template'
import { CertificateAccentPicker } from './certificate-accent-picker'
import { CertificateSealMark } from './certificate-seal-mark'

interface CertificateSealFieldProps {
  /** The design being edited, so each tile previews this certificate's accent. */
  design: CertificateDesign
  onSelect: (style: CertificateSealStyle) => void
  /** `undefined` puts the seal back on the sheet's own accent. */
  onAccentChange: (accent: CertificateAccent | undefined) => void
  onUpload: (dataUrl: string, fileName: string) => void
  onRemoveUpload: () => void
}

/**
 * The pre-built seals, drawn in the certificate's own accent, plus the director's own
 * SVG. An imported seal wins over whichever tile is picked until it is removed — the
 * same rule the frame upload follows, so neither one silently overrides the other.
 */
export function CertificateSealField({
  design,
  onSelect,
  onAccentChange,
  onUpload,
  onRemoveUpload,
}: CertificateSealFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploaded = Boolean(design.sealSvgUrl)
  const current = sealStyleOf(design)

  const read = (file: File) => {
    if (file.size > SEAL_SVG_MAX_BYTES) {
      toast.error(`SVG must be under ${formatFileSize(SEAL_SVG_MAX_BYTES)}`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => onUpload(String(reader.result), file.name)
    reader.onerror = () => toast.error('That SVG could not be read')
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      {/* Each tile is the seal itself at card size — the names alone would not say
          which is which. */}
      <div className="grid grid-cols-3 gap-1.5">
        {CERTIFICATE_SEAL_ORDER.map((style) => {
          const preset = CERTIFICATE_SEAL_PRESETS[style]
          const selected = !uploaded && style === current

          return (
            <Tooltip key={style}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(style)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                    selected
                      ? 'border-[var(--cares-primary)] bg-gray-50'
                      : 'border-gray-200 hover:bg-gray-50',
                    uploaded && 'opacity-60',
                  )}
                >
                  {/* The mark is sized in container units, so the tile is its own
                      container — 100cqw is then exactly this square. */}
                  <span className="@container flex h-10 w-10 items-center justify-center">
                    <CertificateSealMark
                      design={{
                        ...design,
                        sealStyle: style,
                        sealSvgUrl: undefined,
                        sealLabel: '',
                      }}
                      diameter={100}
                    />
                  </span>
                  <span className="truncate text-[11px] text-gray-600">
                    {preset.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{preset.description}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      {/* An uploaded SVG carries its own colours, so this only drives the built-ins. */}
      {!uploaded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CertificateAccentPicker
            value={sealAccentOf(design)}
            onChange={onAccentChange}
          />
          {design.sealAccent && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAccentChange(undefined)}
            >
              Match sheet
            </Button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={SEAL_SVG_ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) read(file)
          event.target.value = ''
        }}
      />

      {uploaded ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
          <p className="truncate text-[12px] text-gray-700">
            {design.sealSvgName ?? 'Uploaded seal'}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove the uploaded seal"
              onClick={onRemoveUpload}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="h-3.5 w-3.5" />
          Upload an SVG seal
        </Button>
      )}
    </div>
  )
}
