import { z } from 'zod';

export const DiagnosticStatusSchema = z.enum(['ok', 'warn', 'fail']);

export const DiagnosticOverallSchema = z.enum(['healthy', 'degraded', 'down']);

export const DiagnosticCheckSchema = z.object({
  id: z.string(),
  group: z.enum([
    'database',
    'cache',
    'microservice',
    'queue',
    'scheduler',
    'process',
  ]),
  name: z.string(),
  status: DiagnosticStatusSchema,
  latency_ms: z.number().nullable(),
  detail: z.string(),
});

export const DiagnosticReportSchema = z.object({
  checked_at: z.iso.datetime(),
  duration_ms: z.number(),
  overall: DiagnosticOverallSchema,
  source: z.enum(['scheduled', 'manual']),
  checks: z.array(DiagnosticCheckSchema),
});

export const DiagnosticHistoryEntrySchema = z.object({
  checked_at: z.iso.datetime(),
  overall: DiagnosticOverallSchema,
  failing: z.number(),
});

/** Null until the first sweep after a deploy. */
export const SystemDiagnosticsSchema = z.object({
  report: DiagnosticReportSchema.nullable(),
  history: z.array(DiagnosticHistoryEntrySchema),
});
