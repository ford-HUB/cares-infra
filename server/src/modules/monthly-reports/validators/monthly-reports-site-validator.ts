import { z } from 'zod';
import {
  MonthlyReportDocumentKind,
  MonthlyReportStatus,
  MonthlyReportTrailAction,
  ReportDepartment,
} from '../../../infastructures/prisma/common/client';

/** Filtered client-side, so capped rather than paged. */
export const MONTHLY_REPORTS_DEFAULT_LIMIT = 200;
export const MONTHLY_REPORTS_MAX_LIMIT = 500;

/** e.g. `2026-08`; the portal groups on this exact shape. */
export const ReportPeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'A reporting period reads as YYYY-MM');

export const MonthlyReportIdParamSchema = z.uuid(
  'A valid monthly report id is required',
);
export const MonthlyReportDocumentIdParamSchema = z.uuid(
  'A valid document id is required',
);
export const MonthlyReportFolderIdParamSchema = z.uuid(
  'A valid folder id is required',
);

export const ListMonthlyReportsQuerySchema = z
  .object({
    status: z
      .union([z.literal('all'), z.enum(MonthlyReportStatus)])
      .default('all'),
    department: z
      .union([z.literal('all'), z.enum(ReportDepartment)])
      .default('all'),
    period: z.union([z.literal('all'), ReportPeriodSchema]).default('all'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MONTHLY_REPORTS_MAX_LIMIT)
      .default(MONTHLY_REPORTS_DEFAULT_LIMIT),
  })
  .strict();

export const ReportMetricsSchema = z.object({
  events: z.number().int().min(0),
  volunteers: z.number().int().min(0),
  service_hours: z.number().int().min(0),
  beneficiaries: z.number().int().min(0),
});

/** Bytes as a `data:` URL, so a submission is one all-or-nothing JSON body. */
export const SubmitReportDocumentSchema = z
  .object({
    file_name: z.string().trim().min(1).max(200),
    content: z
      .string()
      .regex(/^data:[^;,]+;base64,/, 'Attach the file as a base64 data URL'),
  })
  .strict();

export const SubmitMonthlyReportSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    period: ReportPeriodSchema,
    department: z.enum(ReportDepartment),
    summary: z.string().trim().min(1).max(4000),
    metrics: ReportMetricsSchema,
    documents: z.array(SubmitReportDocumentSchema).min(1).max(10),
  })
  .strict();

/** Returns require a note; approval notes are optional. */
export const DecideMonthlyReportSchema = z
  .object({
    decision: z.enum([
      MonthlyReportStatus.APPROVED,
      MonthlyReportStatus.RETURNED,
    ]),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.decision !== MonthlyReportStatus.RETURNED ||
      value.note !== undefined,
    { path: ['note'], message: 'A returned report needs a note' },
  );

export const CreateReportFolderSchema = z
  .object({ name: z.string().trim().min(1).max(80) })
  .strict();

export const RenameReportFolderSchema = CreateReportFolderSchema;

/** `null` files it back under its college. */
export const MoveMonthlyReportSchema = z
  .object({ folder_id: z.uuid().nullable() })
  .strict();

export const MonthlyReportDocumentSchema = z.object({
  monthly_report_document_id: z.string(),
  file_name: z.string(),
  kind: z.enum(MonthlyReportDocumentKind),
  content_type: z.string(),
  byte_size: z.number(),
  uploaded_at: z.iso.datetime(),
  /** API path (private bucket), never a stored S3 URL. */
  url: z.string(),
});

export const MonthlyReportTrailEntrySchema = z.object({
  monthly_report_trail_entry_id: z.string(),
  action: z.enum(MonthlyReportTrailAction),
  actor_name: z.string(),
  note: z.string().nullable(),
  created_at: z.iso.datetime(),
});

export const MonthlyReportSchema = z.object({
  monthly_report_id: z.string(),
  reference: z.string(),
  title: z.string(),
  period: z.string(),
  department: z.enum(ReportDepartment),
  status: z.enum(MonthlyReportStatus),
  summary: z.string(),
  metrics: ReportMetricsSchema,
  submitted_by_user_id: z.string().nullable(),
  submitted_by_name: z.string(),
  submitted_by_email: z.string(),
  submitted_by_title: z.string(),
  submitted_at: z.iso.datetime(),
  reviewer_name: z.string().nullable(),
  decided_at: z.iso.datetime().nullable(),
  decision_note: z.string().nullable(),
  /** Null under its college folder. */
  folder_id: z.string().nullable(),
  documents: z.array(MonthlyReportDocumentSchema),
  trail: z.array(MonthlyReportTrailEntrySchema),
  updated_at: z.iso.datetime(),
});

export const MonthlyReportListResponseSchema = z.object({
  items: z.array(MonthlyReportSchema),
  /** May exceed the returned rows. */
  total: z.number(),
});

export const MonthlyReportResponseSchema = MonthlyReportSchema;

export const ReportFolderSchema = z.object({
  monthly_report_folder_id: z.string(),
  name: z.string(),
  created_by_name: z.string(),
  created_at: z.iso.datetime(),
  /** Newest first. */
  report_ids: z.array(z.string()),
});

export const ReportFolderListResponseSchema = z.object({
  items: z.array(ReportFolderSchema),
});

export const DeleteReportFolderResponseSchema = z.object({
  monthly_report_folder_id: z.string(),
});
