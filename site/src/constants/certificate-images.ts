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

export const IMAGE_SHAPE_CLASSES: Record<CertificateImageShape, string> = {
  square: 'rounded-none',
  rounded: 'rounded-xl',
  circle: 'rounded-full',
  triangle: '[clip-path:polygon(50%_0,100%_100%,0_100%)]',
}

export const DEFAULT_IMAGE_WIDTH = 18
export const DEFAULT_IMAGE_HEIGHT = 18
export const IMAGE_MIN_SIZE = 3
export const IMAGE_MAX_SIZE = 100

/** Inlined as data URLs in the mock. */
export const IMAGE_MAX_BYTES = 512 * 1024
export const IMAGE_ACCEPTED_TYPES = 'image/png,image/jpeg,image/svg+xml,image/webp'

export function clampImageSize(value: number): number {
  return Math.min(IMAGE_MAX_SIZE, Math.max(IMAGE_MIN_SIZE, value))
}

/** Relative to the text layer at z 0. */
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
    // Offset so multi-file drops don't stack into one image.
    x: 50 + index * 4,
    y: 14 + index * 4,
    width: DEFAULT_IMAGE_WIDTH,
    height: DEFAULT_IMAGE_HEIGHT,
    shape: 'square',
    z: 1,
  }
}
