/** Recipient for administrator access requests. */
export const ADMIN_REQUEST_EMAIL =
  import.meta.env.VITE_ADMIN_REQUEST_EMAIL ?? 'cares.admin@uclm.edu.ph'

export const REQUEST_ACCESS_SUBJECT = 'CARES Administrator Access Request'

export const REQUEST_ACCESS_EMAIL_BODY = `CARES Administrator Access Request

Please complete the details below using this exact prefix format. Attach a clear photo or scan of your valid school or office ID for administrator verification.

FIRST NAME:
MIDDLE NAME:
LAST NAME:
REQUESTED ROLE: (Staff / Coordinator / Assistant Coordinator)
DEPARTMENT:
ID FOR VERIFICATION: (ID number — attach ID document below)

Additional notes:

---
Submitted via CARES Administrator Portal — Request Access.`

export const REGISTRATION_GUIDELINES = [
  'Administrator accounts require approval before you can sign in.',
  'Fill in the message using: first name, middle name, last name, role, and department.',
  'Attach a valid ID (PDF, image, or DOCX). GIF, video, and oversized files are rejected.',
  'An administrator will review your request and email you when access is approved.',
  'Once approved, return to the login page and sign in with your credentials.',
] as const

/** Default visible rows before expanding the message body field. */
export const REQUEST_ACCESS_MESSAGE_COLLAPSED_ROWS = 7

/** Per-file limit (5 MB). */
export const REQUEST_ACCESS_MAX_FILE_BYTES = 5 * 1024 * 1024

/** Combined attachment limit (15 MB). */
export const REQUEST_ACCESS_MAX_TOTAL_BYTES = 15 * 1024 * 1024

export const REQUEST_ACCESS_MAX_FILES = 5

export const REQUEST_ACCESS_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const

export const REQUEST_ACCESS_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.docx',
  '.doc',
] as const

export const REQUEST_ACCESS_BLOCKED_EXTENSIONS = [
  '.gif',
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.wmv',
  '.m4v',
  '.mpeg',
  '.mpg',
  '.zip',
  '.rar',
  '.7z',
  '.exe',
] as const

export const REQUEST_ACCESS_ACCEPT_ATTR = [
  ...REQUEST_ACCESS_ALLOWED_EXTENSIONS,
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  '.docx',
  '.doc',
].join(',')
