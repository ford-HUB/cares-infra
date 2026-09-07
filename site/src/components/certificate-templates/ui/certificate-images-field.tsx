import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  IMAGE_ACCEPTED_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_SHAPE_CLASSES,
  IMAGE_SHAPE_LABELS,
  createImage,
} from '../../../constants/certificate-images'
import { formatFileSize } from '../../../constants/formatting'
import type { CertificateImage } from '../../../types/certificate-template'

interface CertificateImagesFieldProps {
  images: CertificateImage[]
  onChange: (images: CertificateImage[]) => void
}

/**
 * Imports the images and lists what is on the sheet. Placement, size and shape are
 * settled on the certificate itself, so this panel stays a manifest — add, identify,
 * remove — rather than a second set of controls that could disagree with the editor.
 */
export function CertificateImagesField({
  images,
  onChange,
}: CertificateImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const read = (files: File[]) => {
    const accepted = files.filter((file) => {
      if (file.size > IMAGE_MAX_BYTES) {
        toast.error(`${file.name} is over ${formatFileSize(IMAGE_MAX_BYTES)}`)
        return false
      }
      return true
    })

    accepted.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = () =>
        onChange([...images, createImage(String(reader.result), file.name, index)])
      reader.onerror = () => toast.error(`${file.name} could not be read`)
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <ul className="space-y-1.5">
          {images.map((image) => (
            <li
              key={image.id}
              className="flex items-center gap-2.5 rounded-lg border border-gray-200 p-2"
            >
              <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50">
                <img
                  src={image.url}
                  alt=""
                  className={cn(
                    'h-full w-full object-cover',
                    IMAGE_SHAPE_CLASSES[image.shape],
                  )}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-gray-900">
                  {image.name}
                </span>
                <span className="block text-[11px] text-gray-400 tabular-nums">
                  {IMAGE_SHAPE_LABELS[image.shape]} · {image.width.toFixed(0)}×
                  {image.height.toFixed(0)}% ·{' '}
                  {image.z < 0 ? 'behind text' : 'in front'}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${image.name}`}
                onClick={() => onChange(images.filter((one) => one.id !== image.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 p-2">
        <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-gray-50">
          <ImagePlus className="h-4 w-4 text-gray-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-gray-900">
            {images.length === 0 ? 'No images yet' : 'Add another image'}
          </p>
          <p className="text-[11px] text-gray-500">
            PNG, JPG, SVG or WebP up to {formatFileSize(IMAGE_MAX_BYTES)} each. Drag,
            resize and shape them on the certificate.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Import
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) read(files)
          // Cleared so re-picking the same file still fires a change.
          event.target.value = ''
        }}
      />
    </div>
  )
}
