/**
 * A coordinator's monthly report walks one line: it is submitted from the
 * coordinator portal, the director opens it for review, and only an approved
 * report is filed under its department on the director's board.
 */
export type MonthlyReportStatus =
  /** With the director from the moment it arrives; the coordinator can no longer edit. */
  | 'under_review'
  | 'approved'
  /** Sent back with a note — the coordinator resubmits a corrected copy. */
  | 'returned'

/** College the submitting coordinator reports for; the board groups on this. */
export type ReportDepartment = 'CCS' | 'CBA' | 'CEA' | 'CNAHS' | 'CAS' | 'CCJE'

/** What the preview can render. Anything else is download-only. */
export type ReportDocumentKind = 'docx' | 'pdf' | 'xlsx' | 'image'

export interface ReportDocument {
  id: string
  /** File name as the coordinator uploaded it, extension included. */
  name: string
  kind: ReportDocumentKind
  sizeBytes: number
  uploadedAt: string
  /** MIME type as stored, so the viewer hands the browser the right thing. */
  contentType: string
  /**
   * API route the bytes stream from. The bucket is private, so this is fetched with
   * the portal's bearer token and turned into an object URL — it is never a `src`.
   */
  url: string
}

export interface ReportSubmitter {
  name: string
  email: string
  /** Coordinator's post, e.g. `CCS Volunteer Coordinator`. */
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
  /** Tracking number shown to both sides, e.g. `MR-2026-014`. */
  reference: string
  title: string
  /** Reporting month as `YYYY-MM` — the period filter and grouping key. */
  period: string
  department: ReportDepartment
  status: MonthlyReportStatus
  submittedBy: ReportSubmitter
  submittedAt: string
  updatedAt: string
  summary: string
  metrics: ReportMetrics
  documents: ReportDocument[]
  /** Director the submission is with. */
  reviewer?: string
  decidedAt?: string
  /** Latest decision note, surfaced on the row without opening the trail. */
  decisionNote?: string
  trail: ReportTrailEntry[]
}

export interface MonthlyReportCounts {
  /** Size of the queue itself — approved reports have left it for the library. */
  total: number
  underReview: number
  returned: number
  /** Context only: what has already left the queue for the period in view. */
  approved: number
}

/** One department's slice of the approved board. */
export interface DepartmentReportGroup {
  department: ReportDepartment
  reports: MonthlyReport[]
  metrics: ReportMetrics
}

/**
 * A folder the director made themselves — a named tray for approved reports, e.g.
 * an accreditation packet pulled from several colleges. Department folders are not
 * stored: they are derived from each report's college, so every approved report has
 * a home even before anyone files it anywhere.
 */
export interface ReportFolder {
  id: string
  name: string
  createdBy: string
  createdAt: string
  /** Approved reports moved into this folder, newest first. */
  reportIds: string[]
}

/** A folder as the library renders it, whether it is derived or director-made. */
export interface LibraryFolder {
  id: string
  name: string
  kind: 'department' | 'custom'
  /** Set on department folders only — drives the college chip and its colour. */
  department?: ReportDepartment
  reports: MonthlyReport[]
  metrics: ReportMetrics
}
