import { z } from 'zod';
import {
  CreateReportFolderSchema,
  DecideMonthlyReportSchema,
  DeleteReportFolderResponseSchema,
  ListMonthlyReportsQuerySchema,
  MonthlyReportDocumentSchema,
  MonthlyReportListResponseSchema,
  MonthlyReportResponseSchema,
  MonthlyReportTrailEntrySchema,
  MoveMonthlyReportSchema,
  RenameReportFolderSchema,
  ReportFolderListResponseSchema,
  ReportFolderSchema,
  SubmitMonthlyReportSchema,
} from '../validators/monthly-reports-site-validator';

export type ListMonthlyReportsQueryDto = z.infer<
  typeof ListMonthlyReportsQuerySchema
>;
export type SubmitMonthlyReportDto = z.infer<typeof SubmitMonthlyReportSchema>;
export type DecideMonthlyReportDto = z.infer<typeof DecideMonthlyReportSchema>;
export type CreateReportFolderDto = z.infer<typeof CreateReportFolderSchema>;
export type RenameReportFolderDto = z.infer<typeof RenameReportFolderSchema>;
export type MoveMonthlyReportDto = z.infer<typeof MoveMonthlyReportSchema>;

export type MonthlyReportDocumentDto = z.infer<
  typeof MonthlyReportDocumentSchema
>;
export type MonthlyReportTrailEntryDto = z.infer<
  typeof MonthlyReportTrailEntrySchema
>;
export type MonthlyReportDto = z.infer<typeof MonthlyReportResponseSchema>;
export type MonthlyReportListDto = z.infer<
  typeof MonthlyReportListResponseSchema
>;
export type ReportFolderDto = z.infer<typeof ReportFolderSchema>;
export type ReportFolderListDto = z.infer<
  typeof ReportFolderListResponseSchema
>;
export type DeleteReportFolderDto = z.infer<
  typeof DeleteReportFolderResponseSchema
>;
