import type {
  MonthlyReport,
  MonthlyReportStatus,
  ReportDepartment,
  ReportDocument,
  ReportDocumentKind,
  ReportFolder,
  ReportTrailAction,
} from '../types/monthly-report'
import { apiClient } from './api-client'

/** Wire shapes. The server speaks snake_case and Prisma's uppercase enums. */
interface MonthlyReportApiResponse {
  monthly_report_id: string
  reference: string
  title: string
  period: string
  department: ReportDepartment
  status: 'UNDER_REVIEW' | 'APPROVED' | 'RETURNED'
  summary: string
  metrics: {
    events: number
    volunteers: number
    service_hours: number
    beneficiaries: number
  }
  submitted_by_user_id: string | null
  submitted_by_name: string
  submitted_by_email: string
  submitted_by_title: string
  submitted_at: string
  reviewer_name: string | null
  decided_at: string | null
  decision_note: string | null
  folder_id: string | null
  documents: {
    monthly_report_document_id: string
    file_name: string
    kind: 'DOCX' | 'PDF' | 'XLSX' | 'IMAGE'
    content_type: string
    byte_size: number
    uploaded_at: string
    url: string
  }[]
  trail: {
    monthly_report_trail_entry_id: string
    action: 'SUBMITTED' | 'APPROVED' | 'RETURNED' | 'RESUBMITTED'
    actor_name: string
    note: string | null
    created_at: string
  }[]
  updated_at: string
}

interface ReportFolderApiResponse {
  monthly_report_folder_id: string
  name: string
  created_by_name: string
  created_at: string
  report_ids: string[]
}

const STATUSES: Record<
  MonthlyReportApiResponse['status'],
  MonthlyReportStatus
> = {
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  RETURNED: 'returned',
}

const DOCUMENT_KINDS: Record<
  MonthlyReportApiResponse['documents'][number]['kind'],
  ReportDocumentKind
> = {
  DOCX: 'docx',
  PDF: 'pdf',
  XLSX: 'xlsx',
  IMAGE: 'image',
}

const TRAIL_ACTIONS: Record<
  MonthlyReportApiResponse['trail'][number]['action'],
  ReportTrailAction
> = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  RETURNED: 'returned',
  RESUBMITTED: 'resubmitted',
}

function mapDocument(
  document: MonthlyReportApiResponse['documents'][number],
): ReportDocument {
  return {
    id: document.monthly_report_document_id,
    name: document.file_name,
    kind: DOCUMENT_KINDS[document.kind],
    sizeBytes: document.byte_size,
    uploadedAt: document.uploaded_at,
    contentType: document.content_type,
    url: document.url,
  }
}

function mapReport(data: MonthlyReportApiResponse): MonthlyReport {
  return {
    id: data.monthly_report_id,
    reference: data.reference,
    title: data.title,
    period: data.period,
    department: data.department,
    status: STATUSES[data.status],
    submittedBy: {
      name: data.submitted_by_name,
      email: data.submitted_by_email,
      title: data.submitted_by_title,
    },
    submittedAt: data.submitted_at,
    updatedAt: data.updated_at,
    summary: data.summary,
    metrics: {
      events: data.metrics.events,
      volunteers: data.metrics.volunteers,
      serviceHours: data.metrics.service_hours,
      beneficiaries: data.metrics.beneficiaries,
    },
    documents: data.documents.map(mapDocument),
    reviewer: data.reviewer_name ?? undefined,
    decidedAt: data.decided_at ?? undefined,
    decisionNote: data.decision_note ?? undefined,
    trail: data.trail.map((entry) => ({
      id: entry.monthly_report_trail_entry_id,
      action: TRAIL_ACTIONS[entry.action],
      actor: entry.actor_name,
      note: entry.note ?? undefined,
      createdAt: entry.created_at,
    })),
  }
}

function mapFolder(data: ReportFolderApiResponse): ReportFolder {
  return {
    id: data.monthly_report_folder_id,
    name: data.name,
    createdBy: data.created_by_name,
    createdAt: data.created_at,
    reportIds: data.report_ids,
  }
}

export async function fetchMonthlyReports(): Promise<MonthlyReport[]> {
  const { data: body } = await apiClient.get<{
    ok: true
    data: { items: MonthlyReportApiResponse[]; total: number }
  }>('/api/v1/monthly-reports')

  return body.data.items.map(mapReport)
}

export interface MonthlyReportDecision {
  decision: 'approved' | 'returned'
  /** Required when returning — it is the only thing the coordinator gets back. */
  note?: string
}

/** Returns the decided report alone; the store merges it into the board it holds. */
export async function decideMonthlyReport(
  id: string,
  { decision, note }: MonthlyReportDecision,
): Promise<MonthlyReport> {
  const { data: body } = await apiClient.patch<{
    ok: true
    data: MonthlyReportApiResponse
  }>(`/api/v1/monthly-reports/${id}/decision`, {
    decision: decision === 'approved' ? 'APPROVED' : 'RETURNED',
    ...(note?.trim() ? { note: note.trim() } : {}),
  })

  return mapReport(body.data)
}

/* -------------------------------------------------------------------------- */
/* Folders                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Approved reports file under their college on their own — those folders are derived
 * from the report's department and are not stored. These are the director's own
 * shelves on top of that: a packet for accreditation, a set pulled for a board
 * meeting, named freely and holding reports from any college.
 */
export async function fetchReportFolders(): Promise<ReportFolder[]> {
  const { data: body } = await apiClient.get<{
    ok: true
    data: { items: ReportFolderApiResponse[] }
  }>('/api/v1/monthly-reports/folders')

  return body.data.items.map(mapFolder)
}

export async function createReportFolder(name: string): Promise<ReportFolder> {
  const { data: body } = await apiClient.post<{
    ok: true
    data: ReportFolderApiResponse
  }>('/api/v1/monthly-reports/folders', { name: name.trim() })

  return mapFolder(body.data)
}

export async function renameReportFolder(
  id: string,
  name: string,
): Promise<ReportFolder> {
  const { data: body } = await apiClient.patch<{
    ok: true
    data: ReportFolderApiResponse
  }>(`/api/v1/monthly-reports/folders/${id}`, { name: name.trim() })

  return mapFolder(body.data)
}

/** Deleting a folder only empties the shelf — the reports fall back to their college. */
export async function deleteReportFolder(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/monthly-reports/folders/${id}`)
}

/**
 * A report lives in at most one folder, so moving it into one takes it out of every
 * other. Passing `null` sends it back to its department folder.
 */
export async function moveReportToFolder(
  reportId: string,
  folderId: string | null,
): Promise<MonthlyReport> {
  const { data: body } = await apiClient.patch<{
    ok: true
    data: MonthlyReportApiResponse
  }>(`/api/v1/monthly-reports/${reportId}/folder`, { folder_id: folderId })

  return mapReport(body.data)
}
