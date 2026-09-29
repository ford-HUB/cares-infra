import { z } from 'zod';
import {
  DiagnosticCheckSchema,
  DiagnosticHistoryEntrySchema,
  DiagnosticReportSchema,
  SystemDiagnosticsSchema,
} from '../validators/system-diagnostics-site-validator';

export type DiagnosticCheckDto = z.infer<typeof DiagnosticCheckSchema>;
export type DiagnosticReportDto = z.infer<typeof DiagnosticReportSchema>;
export type DiagnosticHistoryEntryDto = z.infer<
  typeof DiagnosticHistoryEntrySchema
>;
export type SystemDiagnosticsDto = z.infer<typeof SystemDiagnosticsSchema>;
