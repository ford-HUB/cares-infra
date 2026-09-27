import type { EvaluationForm } from '../types/evaluation'

/** A questionnaire's own state, as the Forms screen splits it. */
export type FormStatus = EvaluationForm['status']

export const FORM_STATUS_FILTER_ALL = 'all' as const
export type FormStatusFilter = typeof FORM_STATUS_FILTER_ALL | FormStatus

export type FormViewMode = 'grid' | 'table'

/** Reading order: the ones volunteers can reach, then the ones still being written. */
export const FORM_STATUS_ORDER: FormStatus[] = ['published', 'draft']

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  published: 'Published',
  draft: 'Draft',
}

/** One record per visual channel, so badge, dot and bar segment stay in agreement. */
export const FORM_STATUS_BADGE_STYLES: Record<FormStatus, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
}

export const FORM_STATUS_DOT_STYLES: Record<FormStatus, string> = {
  published: 'bg-emerald-500',
  draft: 'bg-gray-400',
}

export const FORM_STATUS_BAR_STYLES: Record<FormStatus, string> = {
  published: 'bg-emerald-500',
  draft: 'bg-gray-300',
}

export const FORM_STATUS_HINTS: Record<FormStatus, string> = {
  published: 'Volunteers answer this on every event it is assigned to.',
  draft: 'Still being written — assigned events fall back to the default.',
}

export const FORM_SORT_OPTIONS = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'reach', label: 'Most events' },
  { value: 'responses', label: 'Most answered' },
  { value: 'title', label: 'Title A–Z' },
] as const

export type FormSort = (typeof FORM_SORT_OPTIONS)[number]['value']

/** Cards/rows drawn while the first fetch settles — matches a filled first screen. */
export const FORM_SKELETON_CARDS = 6
export const FORM_SKELETON_ROWS = 8

/** Questions listed on a card before the rest are rolled into a "+N more". */
export const FORM_CARD_QUESTION_PREVIEW = 3
