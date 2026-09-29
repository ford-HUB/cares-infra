import { Check, FileUp, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatFileSize } from '../../../constants/formatting'
import {
  FRAME_SVG_ACCEPTED_TYPES,
  FRAME_SVG_MAX_BYTES,
} from '../../../constants/certificate-layout'
import {
  CERTIFICATE_FRAME_ORDER,
  CERTIFICATE_FRAME_PRESETS,
} from '../../../constants/certificate-frames'
import type {
  CertificateDesign,
  CertificateFrame,
  CertificateOrientation,
} from '../../../types/certificate-template'
import { CertificateCanvas } from './certificate-canvas'

interface FramePickerDialogProps {
  open: boolean
  value: CertificateFrame
  /** The wording and accent being edited, so each tile previews this certificate. */
  design: CertificateDesign
  orientation: CertificateOrientation
  title: string
  onOpenChange: (open: boolean) => void
  onSelect: (frame: CertificateFrame) => void
  /** An imported sheet replaces the built-in frame until it is removed. */
  onUpload: (dataUrl: string, fileName: string) => void
  onRemoveUpload: () => void
}

/**
 * The pre-built frames, each previewed with the template's own wording and accent.
 * Picking one also picks its text formatting — the two ship together in
 * `CERTIFICATE_FRAME_PRESETS`, so a frame always reads the way it was designed to.
 */
export function FramePickerDialog({
  open,
  value,
  design,
  orientation,
  title,
  onOpenChange,
  onSelect,
  onUpload,
  onRemoveUpload,
}: FramePickerDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploaded = Boolean(design.frameSvgUrl)

  const choose = (frame: CertificateFrame) => {
    onSelect(frame)
    onOpenChange(false)
  }

  const read = (file: File) => {
    if (file.size > FRAME_SVG_MAX_BYTES) {
      toast.error(`SVG must be under ${formatFileSize(FRAME_SVG_MAX_BYTES)}`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      onUpload(String(reader.result), file.name)
      onOpenChange(false)
    }
    reader.onerror = () => toast.error('That SVG could not be read')
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-3">
          <DialogTitle className="text-[15px]">Choose a frame</DialogTitle>
          <DialogDescription className="text-[12px]">
            Each frame brings its own wording style. Your text and accent carry over.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* An imported sheet is the director's own artwork, so it leads. */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
            <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50">
              {uploaded ? (
                <img
                  src={design.frameSvgUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <FileUp className="h-4 w-4 text-gray-400" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900">
                {uploaded ? design.frameSvgName : 'Upload an SVG sheet'}
              </p>
              <p className="text-[11px] leading-snug text-gray-500">
                {uploaded
                  ? 'Your artwork is the background; blocks are positioned over it in the editor.'
                  : `Your own certificate artwork, up to ${formatFileSize(FRAME_SVG_MAX_BYTES)}. It replaces the built-in frame.`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                {uploaded ? 'Replace' : 'Import SVG'}
              </Button>
              {uploaded && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove uploaded sheet"
                  onClick={onRemoveUpload}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={FRAME_SVG_ACCEPTED_TYPES}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) read(file)
                // Cleared so re-picking the same file still fires a change.
                event.target.value = ''
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              Built-in frames
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CERTIFICATE_FRAME_ORDER.map((frame) => {
                const preset = CERTIFICATE_FRAME_PRESETS[frame]
                const selected = !uploaded && frame === value

                return (
                  <li key={frame}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => choose(frame)}
                      className={cn(
                        'w-full overflow-hidden rounded-xl border bg-white text-left transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
                        selected
                          ? 'border-[var(--cares-primary)] ring-2 ring-[var(--cares-primary)]'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <CertificateCanvas
                        design={{ ...design, frame, frameSvgUrl: undefined }}
                        orientation={orientation}
                        title={title}
                      />
                      <div className="flex items-start justify-between gap-2 border-t border-gray-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                            {preset.label}
                            {selected && (
                              <Check className="h-3.5 w-3.5 text-[var(--cares-primary)]" />
                            )}
                          </p>
                          <p className="text-[11px] leading-snug text-gray-500">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
