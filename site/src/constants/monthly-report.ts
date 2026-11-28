import dayjs from 'dayjs'
import type {
  MonthlyReportStatus,
  ReportDepartment,
  ReportDocumentKind,
  ReportTrailAction,
} from '../types/monthly-report'

export const REPORT_STATUS_ORDER: MonthlyReportStatus[] = [
  'under_review',
  'returned',
  'approved',
]

/** Approved reports leave the queue for the library. */
export const REPORT_QUEUE_STATUSES: MonthlyReportStatus[] = ['under_review', 'returned']

export const REPORT_STATUS_LABELS: Record<MonthlyReportStatus, string> = {
  under_review: 'Reviewing',
  approved: 'Approved',
  returned: 'Returned',
}

export const REPORT_STATUS_HINTS: Record<MonthlyReportStatus, string> = {
  under_review: 'With you for a decision — the coordinator can no longer edit it.',
  approved: 'Filed under its department for the period.',
  returned: 'Sent back with a note; the coordinator resubmits a corrected copy.',
}

export const REPORT_STATUS_RANK: Record<MonthlyReportStatus, number> = {
  under_review: 0,
  returned: 1,
  approved: 2,
}

export const REPORT_STATUS_BADGE_STYLES: Record<MonthlyReportStatus, string> = {
  under_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  returned: 'bg-red-50 text-red-700',
}

export const REPORT_STATUS_BAR_STYLES: Record<MonthlyReportStatus, string> = {
  under_review: 'bg-amber-500',
  approved: 'bg-emerald-500',
  returned: 'bg-red-500',
}

export const REPORT_STATUS_FILTER_ALL = 'all' as const
export type ReportStatusFilter =
  | MonthlyReportStatus
  | typeof REPORT_STATUS_FILTER_ALL

export const DEPARTMENT_ORDER: ReportDepartment[] = [
  'CCS',
  'CBA',
  'CEA',
  'CNAHS',
  'CAS',
  'CCJE',
]

export const DEPARTMENT_LABELS: Record<ReportDepartment, string> = {
  CCS: 'College of Computer Studies',
  CBA: 'College of Business Administration',
  CEA: 'College of Engineering & Architecture',
  CNAHS: 'College of Nursing & Allied Health Sciences',
  CAS: 'College of Arts & Sciences',
  CCJE: 'College of Criminal Justice Education',
}

export const DEPARTMENT_CHIP_STYLES: Record<ReportDepartment, string> = {
  CCS: 'bg-indigo-50 text-indigo-700',
  CBA: 'bg-sky-50 text-sky-700',
  CEA: 'bg-orange-50 text-orange-700',
  CNAHS: 'bg-teal-50 text-teal-700',
  CAS: 'bg-violet-50 text-violet-700',
  CCJE: 'bg-slate-100 text-slate-700',
}

export const DEPARTMENT_BAR_STYLES: Record<ReportDepartment, string> = {
  CCS: 'bg-indigo-500',
  CBA: 'bg-sky-500',
  CEA: 'bg-orange-500',
  CNAHS: 'bg-teal-500',
  CAS: 'bg-violet-500',
  CCJE: 'bg-slate-500',
}

export const REPORT_TRAIL_LABELS: Record<ReportTrailAction, string> = {
  submitted: 'Submitted for review',
  approved: 'Approved',
  returned: 'Returned for revision',
  resubmitted: 'Resubmitted',
}

export const REPORT_TRAIL_DOT_STYLES: Record<ReportTrailAction, string> = {
  submitted: 'bg-blue-500',
  approved: 'bg-emerald-500',
  returned: 'bg-red-500',
  resubmitted: 'bg-blue-500',
}

export const DOCUMENT_KIND_LABELS: Record<ReportDocumentKind, string> = {
  docx: 'Word document',
  pdf: 'PDF',
  xlsx: 'Spreadsheet',
  image: 'Image',
}

export const DOCUMENT_KIND_STYLES: Record<ReportDocumentKind, string> = {
  docx: 'bg-blue-50 text-blue-600',
  pdf: 'bg-red-50 text-red-600',
  xlsx: 'bg-emerald-50 text-emerald-600',
  image: 'bg-violet-50 text-violet-600',
}

/** Office files download instead. */
export const PREVIEWABLE_DOCUMENT_KINDS: ReportDocumentKind[] = ['pdf', 'image']

/** `2026-08` -> `August 2026`. */
export function formatReportPeriod(period: string): string {
  return dayjs(`${period}-01`).format('MMMM YYYY')
}

export function formatReportPeriodShort(period: string): string {
  return dayjs(`${period}-01`).format('MMM YYYY')
}

export const PERIOD_FILTER_ALL = 'all' as const
export type PeriodFilter = string | typeof PERIOD_FILTER_ALL

/** Mirrors the server's per-file cap on `POST /api/v1/monthly-reports`. */
export const REPORT_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024
export const REPORT_DOCUMENT_MAX_COUNT = 10
/** No spreadsheets: figures go in the form. */
export const REPORT_DOCUMENT_ALLOWED_TYPES: {
  extensions: string[]
  mimes: string[]
  kind: ReportDocumentKind
}[] = [
  { extensions: ['pdf'], mimes: ['application/pdf'], kind: 'pdf' },
  {
    extensions: ['docx'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    kind: 'docx',
  },
  {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimes: ['image/png', 'image/jpeg', 'image/webp'],
    kind: 'image',
  },
]

export const REPORT_DOCUMENT_ACCEPT = REPORT_DOCUMENT_ALLOWED_TYPES.flatMap((type) => [
  ...type.extensions.map((extension) => `.${extension}`),
  ...type.mimes,
]).join(',')

export const REPORT_DOCUMENT_FORMAT_HINT = 'Files must be in PDF, Word, PNG or JPG format.'

export function reportDocumentKindFor(file: File): ReportDocumentKind | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const match = REPORT_DOCUMENT_ALLOWED_TYPES.find(
    (type) => type.mimes.includes(file.type) || type.extensions.includes(extension),
  )
  return match?.kind ?? null
}

export const UPLOAD_REPORT_STEPS = [
  { key: 'details', label: 'Report details' },
  { key: 'files', label: 'Upload files' },
] as const
export type UploadReportStep = (typeof UPLOAD_REPORT_STEPS)[number]['key']

export const REPORT_TITLE_MAX_LENGTH = 200
export const REPORT_SUMMARY_MAX_LENGTH = 4000

export const REPORT_STATUS_SUBMITTER_HINTS: Record<MonthlyReportStatus, string> = {
  under_review: 'With the director — it can no longer be edited.',
  approved: 'Approved and filed under your department.',
  returned: 'Sent back with a note; upload a corrected copy.',
}

/** Profiles store college as free text (code or name); reports use the code. */
export function reportDepartmentFor(
  profileDepartment: string | null | undefined,
): ReportDepartment | null {
  const needle = profileDepartment?.trim().toLowerCase()
  if (!needle) return null
  return (
    DEPARTMENT_ORDER.find(
      (code) =>
        code.toLowerCase() === needle || DEPARTMENT_LABELS[code].toLowerCase() === needle,
    ) ?? null
  )
}
