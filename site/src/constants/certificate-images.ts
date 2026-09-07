import type {
  CertificateImage,
  CertificateImageShape,
} from '../types/certificate-template'

export const IMAGE_SHAPE_ORDER: CertificateImageShape[] = [
  'square',
  'rounded',
  'circle',
  'triangle',
]

export const IMAGE_SHAPE_LABELS: Record<CertificateImageShape, string> = {
  square: 'Square',
  rounded: 'Rounded',
  circle: 'Circle',
  triangle: 'Triangle',
}

/** How each shape is cut; the same class drives the editor and the printed sheet. */
export const IMAGE_SHAPE_CLASSES: Record<CertificateImageShape, string> = {
  square: 'rounded-none',
  rounded: 'rounded-xl',
  circle: 'rounded-full',
  triangle: '[clip-path:polygon(50%_0,100%_100%,0_100%)]',
}

/** A new image lands centred-ish and small enough to place before resizing. */
export const DEFAULT_IMAGE_WIDTH = 18
export const DEFAULT_IMAGE_HEIGHT = 18
export const IMAGE_MIN_SIZE = 3
export const IMAGE_MAX_SIZE = 100

/** Imported images are inlined as data URLs in the mock, so keep them small. */
export const IMAGE_MAX_BYTES = 512 * 1024
export const IMAGE_ACCEPTED_TYPES = 'image/png,image/jpeg,image/svg+xml,image/webp'

export function clampImageSize(value: number): number {
  return Math.min(IMAGE_MAX_SIZE, Math.max(IMAGE_MIN_SIZE, value))
}

/** Front and back are relative to the text layer, which sits at z 0. */
export function bringToFront(images: CertificateImage[], id: string): CertificateImage[] {
  const top = Math.max(0, ...images.map((one) => one.z))
  return images.map((one) => (one.id === id ? { ...one, z: top + 1 } : one))
}

export function sendToBack(images: CertificateImage[], id: string): CertificateImage[] {
  const bottom = Math.min(0, ...images.map((one) => one.z))
  return images.map((one) => (one.id === id ? { ...one, z: bottom - 1 } : one))
}

export function createImage(url: string, name: string, index: number): CertificateImage {
  return {
    id: `img-${Date.now()}-${index}`,
    url,
    name,
    // Stacked slightly apart so several files dropped at once do not land on top of
    // each other and read as one image.
    x: 50 + index * 4,
    y: 14 + index * 4,
    width: DEFAULT_IMAGE_WIDTH,
    height: DEFAULT_IMAGE_HEIGHT,
    shape: 'square',
    z: 1,
  }
}
