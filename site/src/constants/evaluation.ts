import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDownCircle,
  CircleDot,
  MoveHorizontal,
  Star,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type {
  EvaluationFontFamily,
  EvaluationFontSize,
  EvaluationQuestionType,
  EvaluationResponse,
  EvaluationTypography,
} from '../types/evaluation'

/** Order of the "add question" rail and the type picker — the familiar Forms order. */
export const QUESTION_TYPE_ORDER: EvaluationQuestionType[] = [
  'short_answer',
  'paragraph',
  'multiple_choice',
  'checkboxes',
  'dropdown',
  'linear_scale',
  'star_rating',
  'date',
]

export const QUESTION_TYPE_META: Record<
  EvaluationQuestionType,
  { label: string; icon: LucideIcon; hasOptions: boolean; hasScale: boolean }
> = {
  short_answer: { label: 'Short answer', icon: Type, hasOptions: false, hasScale: false },
  paragraph: { label: 'Paragraph', icon: AlignLeft, hasOptions: false, hasScale: false },
  multiple_choice: { label: 'Multiple choice', icon: CircleDot, hasOptions: true, hasScale: false },
  checkboxes: { label: 'Checkboxes', icon: CheckSquare, hasOptions: true, hasScale: false },
  dropdown: { label: 'Dropdown', icon: ChevronDownCircle, hasOptions: true, hasScale: false },
  linear_scale: { label: 'Linear scale', icon: MoveHorizontal, hasOptions: false, hasScale: true },
  star_rating: { label: 'Star rating', icon: Star, hasOptions: false, hasScale: true },
  date: { label: 'Date', icon: Calendar, hasOptions: false, hasScale: false },
}

/** Faces already loaded by the `@import` lines at the top of `index.css`. */
export const EVALUATION_FONT_ORDER: EvaluationFontFamily[] = [
  'inter',
  'lato',
  'montserrat',
  'lora',
  'merriweather',
  'playfair',
  'garamond',
]

export const EVALUATION_FONT_META: Record<
  EvaluationFontFamily,
  { label: string; stack: string }
> = {
  inter: { label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  lato: { label: 'Lato', stack: "'Lato', system-ui, sans-serif" },
  montserrat: { label: 'Montserrat', stack: "'Montserrat', system-ui, sans-serif" },
  lora: { label: 'Lora', stack: "'Lora', Georgia, serif" },
  merriweather: { label: 'Merriweather', stack: "'Merriweather', Georgia, serif" },
  playfair: { label: 'Playfair Display', stack: "'Playfair Display', Georgia, serif" },
  garamond: { label: 'EB Garamond', stack: "'EB Garamond', Georgia, serif" },
}

export const EVALUATION_FONT_SIZE_ORDER: EvaluationFontSize[] = ['sm', 'md', 'lg', 'xl']

/** Pixel size per step — the title uses it directly, helper text one step smaller. */
export const EVALUATION_FONT_SIZE_META: Record<
  EvaluationFontSize,
  { label: string; titlePx: number; bodyPx: number }
> = {
  sm: { label: 'Small', titlePx: 13, bodyPx: 12 },
  md: { label: 'Normal', titlePx: 15, bodyPx: 13 },
  lg: { label: 'Large', titlePx: 18, bodyPx: 14 },
  xl: { label: 'Extra large', titlePx: 22, bodyPx: 15 },
}

export const DEFAULT_QUESTION_TYPOGRAPHY: EvaluationTypography = {
  fontFamily: 'inter',
  fontSize: 'md',
}

export const DEFAULT_HEADER_TYPOGRAPHY: EvaluationTypography = {
  fontFamily: 'inter',
  fontSize: 'xl',
}

/** Mirrors Forms' scale bounds — 2..10 steps for a linear scale, 3..10 stars. */
export const LINEAR_SCALE_MIN = 2
export const LINEAR_SCALE_MAX = 10
export const STAR_RATING_MIN = 3
export const STAR_RATING_MAX = 10
export const DEFAULT_SCALE_MAX = 5

export const QUESTION_MAX_OPTIONS = 10
export const QUESTION_TITLE_PLACEHOLDER = 'Untitled question'
export const QUESTION_DESCRIPTION_PLACEHOLDER = 'Description (optional)'

/* ---------- Answers table ---------- */

export const ANSWER_ROW_HEIGHT_PX = 44
export const ANSWER_HEADER_HEIGHT_PX = 36

export const ANSWER_EVENT_FILTER_ALL = 'all'
export const ANSWER_DEPARTMENT_FILTER_ALL = 'all'
export const ANSWER_RATING_FILTER_ALL = 'all'

export type AnswerStatusFilter = EvaluationResponse['status'] | 'all'
export const ANSWER_STATUS_FILTER_ALL: AnswerStatusFilter = 'all'

export const ANSWER_STATUS_FILTERS: { value: AnswerStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'complete', label: 'Complete' },
  { value: 'partial', label: 'Partial' },
]

export const ANSWER_STATUS_STYLES: Record<
  EvaluationResponse['status'],
  { badge: string; dot: string; label: string }
> = {
  complete: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500', label: 'Complete' },
  partial: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Partial' },
}

export const ANSWER_COLUMNS = [
  { key: 'participant', label: 'Participant', width: 'w-[22%]' },
  { key: 'email', label: 'Email', width: 'w-[20%]' },
  { key: 'department', label: 'Department', width: 'w-[12%]' },
  { key: 'event', label: 'Event', width: 'w-[16%]' },
  { key: 'rating', label: 'Rating', width: 'w-[14%]' },
  { key: 'submittedAt', label: 'Submitted', width: 'w-[12%]' },
  { key: 'status', label: 'Status', width: 'w-[10%]' },
  { key: 'actions', label: '', width: 'w-14' },
] as const

/** Shared with the skeleton so the swap causes no jump — same rule as manage-users. */
export const ANSWER_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const ANSWER_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const ANSWER_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'

export const ANSWER_SUBMITTED_AT_FORMAT = 'MMM D, YYYY · h:mm A'
