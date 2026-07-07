import type { FileValidationResult } from '../types/request-access'
import {
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_IMAGE_ACCEPT,
  PROFILE_SIGNATURE_MAX_BYTES,
} from '../constants/profile-upload'

const ALLOWED_MIMES = PROFILE_IMAGE_ACCEPT.split(',')

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

function isAllowedImage(file: File): boolean {
  if (file.type.startsWith('image/') && file.type !== 'image/gif') {
    return ALLOWED_MIMES.includes(file.type) || file.type === 'image/jpg'
  }
  const ext = getExtension(file.name)
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
}

export function validateProfileImage(
  file: File,
  kind: 'avatar' | 'signature',
): FileValidationResult {
  if (!isAllowedImage(file)) {
    return { valid: false, message: 'Only JPG, PNG, or WebP images are allowed.' }
  }

  const maxBytes = kind === 'signature' ? PROFILE_SIGNATURE_MAX_BYTES : PROFILE_AVATAR_MAX_BYTES
  const label = kind === 'signature' ? 'Signature' : 'Profile photo'

  if (file.size > maxBytes) {
    const limitMb = maxBytes / (1024 * 1024)
    return { valid: false, message: `${label} must be ${limitMb} MB or smaller.` }
  }

  return { valid: true }
}
