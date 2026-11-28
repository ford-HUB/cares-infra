/** Only approved reports are filed under their department. */
export type MonthlyReportStatus =
  /** Coordinator can no longer edit. */
  | 'under_review'
  | 'approved'
  | 'returned'

export type ReportDepartment = 'CCS' | 'CBA' | 'CEA' | 'CNAHS' | 'CAS' | 'CCJE'

/** Anything but pdf/image is download-only. */
export type ReportDocumentKind = 'docx' | 'pdf' | 'xlsx' | 'image'

export interface ReportDocument {
  id: string
  name: string
  kind: ReportDocumentKind
  sizeBytes: number
  uploadedAt: string
  contentType: string
  /** Private bucket route: fetched with the bearer into an object URL, never a `src`. */
  url: string
}

export interface ReportSubmitter {
  name: string
  email: string
  /** e.g. `CCS Volunteer Coordinator`. */
  title: string
}

export type ReportTrailAction =
  | 'submitted'
  | 'approved'
  | 'returned'
  | 'resubmitted'

export interface ReportTrailEntry {
  id: string
  action: ReportTrailAction
  actor: string
  note?: string
  createdAt: string
}

export interface ReportMetrics {
  events: number
  volunteers: number
  serviceHours: number
  beneficiaries: number
}

export interface MonthlyReport {
  id: string
  /** e.g. `MR-2026-014`. */
  reference: string
  title: string
  /** `YYYY-MM`. */
  period: string
  department: ReportDepartment
  status: MonthlyReportStatus
  submittedBy: ReportSubmitter
  submittedAt: string
  updatedAt: string
  summary: string
  metrics: ReportMetrics
  documents: ReportDocument[]
  reviewer?: string
  decidedAt?: string
  decisionNote?: string
  trail: ReportTrailEntry[]
}

export interface MonthlyReportCounts {
  /** Queue size; approved reports have left it. */
  total: number
  underReview: number
  returned: number
  /** Context only: already left the queue for the period. */
  approved: number
}

export interface DepartmentReportGroup {
  department: ReportDepartment
  reports: MonthlyReport[]
  metrics: ReportMetrics
}

/** Director-made; department folders are derived from each report's college, not stored. */
export interface ReportFolder {
  id: string
  name: string
  createdBy: string
  createdAt: string
  /** Newest first. */
  reportIds: string[]
}

export interface LibraryFolder {
  id: string
  name: string
  kind: 'department' | 'custom'
  /** Department folders only. */
  department?: ReportDepartment
  reports: MonthlyReport[]
  metrics: ReportMetrics
}
