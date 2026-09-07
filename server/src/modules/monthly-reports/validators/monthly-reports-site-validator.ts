import { z } from 'zod';
import {
  MonthlyReportDocumentKind,
  MonthlyReportStatus,
  MonthlyReportTrailAction,
  ReportDepartment,
} from '../../../infastructures/prisma/common/client';

/**
 * The portal loads the board whole and filters it client-side — period, college and
 * search are all applied in the browser — so the list is capped rather than paged.
 */
export const MONTHLY_REPORTS_DEFAULT_LIMIT = 200;
export const MONTHLY_REPORTS_MAX_LIMIT = 500;

/** Reporting month, `2026-08`. The portal groups and labels on this exact shape. */
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

/**
 * One attached file on the way in. The bytes travel as a `data:` URL the same way
 * imported certificate artwork does — the portal never posts multipart, so a
 * submission stays one JSON body that either lands whole or not at all.
 */
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

/**
 * A return has to say why — it is the only thing the coordinator gets back — while an
 * approval's note is optional commendation.
 */
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

/** `null` files the report back under its college; a folder id moves it onto a shelf. */
export const MoveMonthlyReportSchema = z
  .object({ folder_id: z.uuid().nullable() })
  .strict();

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

export const MonthlyReportDocumentSchema = z.object({
  monthly_report_document_id: z.string(),
  file_name: z.string(),
  kind: z.enum(MonthlyReportDocumentKind),
  content_type: z.string(),
  byte_size: z.number(),
  uploaded_at: z.iso.datetime(),
  /**
   * The route the bytes are read from. The bucket is private, so this is an API path
   * the portal fetches with its bearer token — never a stored S3 URL.
   */
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
  /** Null while the report sits under its college folder. */
  folder_id: z.string().nullable(),
  documents: z.array(MonthlyReportDocumentSchema),
  trail: z.array(MonthlyReportTrailEntrySchema),
  updated_at: z.iso.datetime(),
});

export const MonthlyReportListResponseSchema = z.object({
  items: z.array(MonthlyReportSchema),
  /** Total matching rows on the server, which may exceed what was returned. */
  total: z.number(),
});

export const MonthlyReportResponseSchema = MonthlyReportSchema;

export const ReportFolderSchema = z.object({
  monthly_report_folder_id: z.string(),
  name: z.string(),
  created_by_name: z.string(),
  created_at: z.iso.datetime(),
  /** Approved reports filed on this shelf, newest first. */
  report_ids: z.array(z.string()),
});

export const ReportFolderListResponseSchema = z.object({
  items: z.array(ReportFolderSchema),
});

export const DeleteReportFolderResponseSchema = z.object({
  monthly_report_folder_id: z.string(),
});
