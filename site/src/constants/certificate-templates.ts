import type {
  CertificateOrientation,
  CertificateTemplateCategory,
  CertificateTemplateStatus,
} from '../types/certificate-template'

export const TEMPLATE_STATUS_FILTER_ALL = 'all' as const
export type TemplateStatusFilter =
  | typeof TEMPLATE_STATUS_FILTER_ALL
  | CertificateTemplateStatus

export const TEMPLATE_CATEGORY_FILTER_ALL = 'all' as const
export type TemplateCategoryFilter =
  | typeof TEMPLATE_CATEGORY_FILTER_ALL
  | CertificateTemplateCategory

export type TemplateViewMode = 'grid' | 'table'

/** Draft sits between published and archived: it is the queue, not the tail. */
export const TEMPLATE_STATUS_ORDER: CertificateTemplateStatus[] = [
  'published',
  'draft',
  'archived',
]

export const TEMPLATE_STATUS_LABELS: Record<CertificateTemplateStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
}

/** One record per visual channel, so badge, dot and bar can never drift apart. */
export const TEMPLATE_STATUS_BADGE_STYLES: Record<CertificateTemplateStatus, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-amber-50 text-amber-700',
  archived: 'bg-gray-100 text-gray-600',
}

export const TEMPLATE_STATUS_DOT_STYLES: Record<CertificateTemplateStatus, string> = {
  published: 'bg-emerald-500',
  draft: 'bg-amber-500',
  archived: 'bg-gray-400',
}

export const TEMPLATE_STATUS_BAR_STYLES: Record<CertificateTemplateStatus, string> = {
  published: 'bg-emerald-500',
  draft: 'bg-amber-400',
  archived: 'bg-gray-300',
}

export const TEMPLATE_STATUS_HINTS: Record<CertificateTemplateStatus, string> = {
  published: 'Ready to attach to an event.',
  draft: 'Still being edited — cannot be deployed.',
  archived: 'Kept for records, hidden from event setup.',
}

export const TEMPLATE_CATEGORY_ORDER: CertificateTemplateCategory[] = [
  'participation',
  'appreciation',
  'volunteer_hours',
  'completion',
  'sponsorship',
]

export const TEMPLATE_CATEGORY_LABELS: Record<CertificateTemplateCategory, string> = {
  participation: 'Participation',
  appreciation: 'Appreciation',
  volunteer_hours: 'Volunteer Hours',
  completion: 'Completion',
  sponsorship: 'Sponsorship',
}

/** Category is an identity, not a state — it tints the preview, never the status. */
export const TEMPLATE_CATEGORY_ACCENTS: Record<
  CertificateTemplateCategory,
  { chip: string; frame: string; seal: string; rule: string }
> = {
  participation: {
    chip: 'bg-sky-50 text-sky-700',
    frame: 'border-sky-200',
    seal: 'bg-sky-100 text-sky-600',
    rule: 'bg-sky-200',
  },
  appreciation: {
    chip: 'bg-rose-50 text-rose-700',
    frame: 'border-rose-200',
    seal: 'bg-rose-100 text-rose-600',
    rule: 'bg-rose-200',
  },
  volunteer_hours: {
    chip: 'bg-violet-50 text-violet-700',
    frame: 'border-violet-200',
    seal: 'bg-violet-100 text-violet-600',
    rule: 'bg-violet-200',
  },
  completion: {
    chip: 'bg-teal-50 text-teal-700',
    frame: 'border-teal-200',
    seal: 'bg-teal-100 text-teal-600',
    rule: 'bg-teal-200',
  },
  sponsorship: {
    chip: 'bg-amber-50 text-amber-700',
    frame: 'border-amber-200',
    seal: 'bg-amber-100 text-amber-600',
    rule: 'bg-amber-200',
  },
}

export const TEMPLATE_STATUS_FILTERS: {
  value: TemplateStatusFilter
  label: string
}[] = [
  { value: TEMPLATE_STATUS_FILTER_ALL, label: 'All statuses' },
  ...TEMPLATE_STATUS_ORDER.map((status) => ({
    value: status as TemplateStatusFilter,
    label: TEMPLATE_STATUS_LABELS[status],
  })),
]

export const TEMPLATE_CATEGORY_FILTERS: {
  value: TemplateCategoryFilter
  label: string
}[] = [
  { value: TEMPLATE_CATEGORY_FILTER_ALL, label: 'All categories' },
  ...TEMPLATE_CATEGORY_ORDER.map((category) => ({
    value: category as TemplateCategoryFilter,
    label: TEMPLATE_CATEGORY_LABELS[category],
  })),
]

export const TEMPLATE_ORIENTATION_LABELS: Record<CertificateOrientation, string> = {
  landscape: 'Landscape',
  portrait: 'Portrait',
}

/** Rows/cards drawn while the first fetch settles — matches a filled first screen. */
export const TEMPLATE_SKELETON_CARDS = 6
export const TEMPLATE_SKELETON_ROWS = 8
