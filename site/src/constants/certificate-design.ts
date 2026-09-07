import type {
  CertificateAccent,
  CertificateSignatory,
  CertificateTemplateCategory,
  SignatoryCoordinator,
} from '../types/certificate-template'

export const CERTIFICATE_ACCENT_ORDER: CertificateAccent[] = [
  'emerald',
  'sky',
  'violet',
  'rose',
  'amber',
  'slate',
]

/** One record, six channels — a new accent cannot land half-styled. */
export const CERTIFICATE_ACCENT_STYLES: Record<
  CertificateAccent,
  {
    label: string
    /** Swatch in the customizer. */
    swatch: string
    frame: string
    rule: string
    seal: string
    headline: string
    /** Solid fill for a frame's panels, ribbons and bands. */
    solid: string
    /** Soft wash behind an ornament. */
    tint: string
  }
> = {
  emerald: {
    label: 'Emerald',
    swatch: 'bg-emerald-500',
    frame: 'border-emerald-300',
    rule: 'bg-emerald-400',
    seal: 'bg-emerald-100 text-emerald-600',
    headline: 'text-emerald-700',
    solid: 'bg-emerald-700',
    tint: 'bg-emerald-50',
  },
  sky: {
    label: 'Sky',
    swatch: 'bg-sky-500',
    frame: 'border-sky-300',
    rule: 'bg-sky-400',
    seal: 'bg-sky-100 text-sky-600',
    headline: 'text-sky-700',
    solid: 'bg-sky-700',
    tint: 'bg-sky-50',
  },
  violet: {
    label: 'Violet',
    swatch: 'bg-violet-500',
    frame: 'border-violet-300',
    rule: 'bg-violet-400',
    seal: 'bg-violet-100 text-violet-600',
    headline: 'text-violet-700',
    solid: 'bg-violet-700',
    tint: 'bg-violet-50',
  },
  rose: {
    label: 'Rose',
    swatch: 'bg-rose-500',
    frame: 'border-rose-300',
    rule: 'bg-rose-400',
    seal: 'bg-rose-100 text-rose-600',
    headline: 'text-rose-700',
    solid: 'bg-rose-700',
    tint: 'bg-rose-50',
  },
  amber: {
    label: 'Amber',
    swatch: 'bg-amber-500',
    frame: 'border-amber-300',
    rule: 'bg-amber-400',
    seal: 'bg-amber-100 text-amber-600',
    headline: 'text-amber-700',
    solid: 'bg-amber-600',
    tint: 'bg-amber-50',
  },
  slate: {
    label: 'Slate',
    swatch: 'bg-slate-500',
    frame: 'border-slate-300',
    rule: 'bg-slate-400',
    seal: 'bg-slate-100 text-slate-600',
    headline: 'text-slate-700',
    solid: 'bg-slate-700',
    tint: 'bg-slate-50',
  },
}

/**
 * Placeholders the print job fills in per recipient. `required` ones name the award
 * itself — a certificate without them prints the same wording for everybody.
 */
export const CERTIFICATE_TOKENS: {
  token: string
  label: string
  sample: string
  required: boolean
}[] = [
  { token: '{{recipient}}', label: 'Recipient', sample: 'Juan Dela Cruz', required: true },
  {
    token: '{{event}}',
    label: 'Event',
    sample: 'Barangay Luz Feeding Drive',
    required: true,
  },
  { token: '{{date}}', label: 'Date', sample: 'September 4, 2026', required: true },
  { token: '{{hours}}', label: 'Hours', sample: '24', required: false },
  {
    token: '{{organization}}',
    label: 'Organization',
    sample: 'UCLM CARES',
    required: false,
  },
]

/** The placeholders award text cannot print without. */
export const REQUIRED_CERTIFICATE_TOKENS = CERTIFICATE_TOKENS.filter(
  (entry) => entry.required,
)

/** Anything brace-wrapped, so a half-typed `{{date}` is caught rather than printed. */
const TOKEN_LIKE_PATTERN = /\{+[^{}]*\}+/g

/**
 * The one place award-text wording is judged: every brace group must be a real
 * placeholder written exactly, and the required ones must all be present. Optional
 * tokens — hours, organization — are free to be left out.
 *
 * Returns the message to show, or `null` when the wording is fine.
 */
export function awardTextIssue(text: string): string | null {
  const names = new Set(CERTIFICATE_TOKENS.map((entry) => entry.token.slice(2, -2)))

  for (const match of text.match(TOKEN_LIKE_PATTERN) ?? []) {
    const name = match.replace(/[{}]/g, '').trim()
    if (!names.has(name)) {
      return `“${match}” is not a placeholder — insert one with the chips below.`
    }
    if (match !== `{{${name}}}`) {
      return `“${match}” is written wrong — it must read {{${name}}}.`
    }
  }

  const missing = CERTIFICATE_TOKENS.filter(
    (entry) => entry.required && !text.includes(entry.token),
  )
  if (missing.length > 0) {
    return `Award text is missing ${missing.map((entry) => entry.token).join(', ')}.`
  }

  return null
}

/** A certificate is signed by a few people, not a committee. */
export const MAX_SIGNATORIES = 3

export const HEADLINE_MAX_LENGTH = 60
export const BODY_MAX_LENGTH = 240

/** Fills every `{{token}}` with its sample so the preview reads like a real award. */
export function renderCertificateTokens(text: string): string {
  return CERTIFICATE_TOKENS.reduce(
    (filled, entry) => filled.split(entry.token).join(entry.sample),
    text,
  )
}

/** The accent a brand-new template starts on, taken from its category. */
export const CATEGORY_DEFAULT_ACCENT: Record<
  CertificateTemplateCategory,
  CertificateAccent
> = {
  participation: 'sky',
  appreciation: 'rose',
  volunteer_hours: 'violet',
  completion: 'emerald',
  sponsorship: 'amber',
}

/**
 * The placeholder every signature line carries. The printed certificate swaps it for
 * the coordinator's own signature image, which is why a line is picked from an account
 * rather than typed; the customizer never renders the token, because the director is
 * choosing a person, not a picture.
 */
export const SIGNATURE_IMAGE_TOKEN = '{{signature-image}}'

/** A signatory line is only ever built from a real coordinator account. */
export function createSignatory(
  coordinator: SignatoryCoordinator,
): CertificateSignatory {
  return {
    id: `sig-${coordinator.id}`,
    coordinatorId: coordinator.id,
    name: coordinator.name,
    title: coordinator.title,
    department: coordinator.department,
    signatureToken: SIGNATURE_IMAGE_TOKEN,
    hasSignature: coordinator.hasSignature,
    avatarUrl: coordinator.avatarUrl,
  }
}

/** Deterministic tint for an initials avatar, so a coordinator keeps one colour. */
export const AVATAR_TONES = [
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
]

export function avatarTone(seed: string): string {
  const sum = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0)
  return AVATAR_TONES[sum % AVATAR_TONES.length]
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}
