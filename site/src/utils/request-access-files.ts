import type { FileValidationResult } from '../types/request-access'
import {
  REQUEST_ACCESS_BLOCKED_EXTENSIONS,
  REQUEST_ACCESS_ALLOWED_EXTENSIONS,
  REQUEST_ACCESS_ALLOWED_MIME_TYPES,
  REQUEST_ACCESS_MAX_FILE_BYTES,
  REQUEST_ACCESS_MAX_FILES,
  REQUEST_ACCESS_MAX_TOTAL_BYTES,
} from '../constants/request-access'

function isBlockedExtension(ext: string): boolean {
  return (REQUEST_ACCESS_BLOCKED_EXTENSIONS as readonly string[]).includes(ext)
}

function isAllowedExtension(ext: string): boolean {
  return (REQUEST_ACCESS_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

function isAllowedMime(mime: string): boolean {
  return (REQUEST_ACCESS_ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

export function validateRequestAccessFile(file: File): FileValidationResult {
  const ext = getExtension(file.name)

  if (isBlockedExtension(ext)) {
    return {
      valid: false,
      message: `"${file.name}" is not allowed. GIF, video, archives, and executables are blocked.`,
    }
  }

  const allowedExt = isAllowedExtension(ext)
  const allowedMime = isAllowedMime(file.type)

  if (!allowedExt && !allowedMime) {
    return {
      valid: false,
      message: `"${file.name}" must be PDF, image (JPG/PNG/WebP), or Word document (DOC/DOCX).`,
    }
  }

  if (file.type.startsWith('video/') || file.type === 'image/gif') {
    return { valid: false, message: `"${file.name}" — video and GIF files are not accepted.` }
  }

  if (file.size > REQUEST_ACCESS_MAX_FILE_BYTES) {
    return {
      valid: false,
      message: `"${file.name}" exceeds the 5 MB per-file limit.`,
    }
  }

  return { valid: true }
}

export function validateRequestAccessFiles(files: File[]): FileValidationResult {
  if (files.length > REQUEST_ACCESS_MAX_FILES) {
    return { valid: false, message: `You can attach up to ${REQUEST_ACCESS_MAX_FILES} files.` }
  }

  let total = 0
  for (const file of files) {
    const result = validateRequestAccessFile(file)
    if (!result.valid) return result
    total += file.size
  }

  if (total > REQUEST_ACCESS_MAX_TOTAL_BYTES) {
    return { valid: false, message: 'Total attachment size must not exceed 15 MB.' }
  }

  return { valid: true }
}
