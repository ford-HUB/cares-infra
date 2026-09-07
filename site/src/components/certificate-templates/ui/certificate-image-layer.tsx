import { cn } from '@/lib/utils'
import { IMAGE_SHAPE_CLASSES } from '../../../constants/certificate-images'
import type { CertificateImage } from '../../../types/certificate-template'

interface CertificateImageLayerProps {
  images: CertificateImage[]
}

/**
 * The placed images, drawn exactly as the editor positions them. Stacking is the
 * image's own `z`: below zero it prints behind the wording, above zero in front.
 */
export function CertificateImageLayer({ images }: CertificateImageLayerProps) {
  return (
    <>
      {images.map((image) => (
        <img
          key={image.id}
          src={image.url}
          alt=""
          className={cn(
            'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 object-cover',
            IMAGE_SHAPE_CLASSES[image.shape],
          )}
          style={{
            left: `${image.x}%`,
            top: `${image.y}%`,
            width: `${image.width}%`,
            height: `${image.height}%`,
            zIndex: image.z,
          }}
        />
      ))}
    </>
  )
}
