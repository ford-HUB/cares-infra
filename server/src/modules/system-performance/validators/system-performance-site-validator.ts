import { z } from 'zod';

export const PerformanceRangeSchema = z.enum(['live', 'hour', 'day']);

export const SnapshotQuerySchema = z
  .object({ range: PerformanceRangeSchema.default('live') })
  .strict();

export const PerformanceSampleSchema = z.object({
  at: z.iso.datetime(),
  cpu_user: z.number(),
  cpu_system: z.number(),
  cpu_io_wait: z.number(),
  memory_percent: z.number(),
  requests_per_minute: z.number(),
  response_p50_ms: z.number(),
  response_p95_ms: z.number(),
});

export const CpuCoreSchema = z.object({
  id: z.number(),
  usage_percent: z.number(),
});

export const ProcessLoadSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.enum(['server', 'microservices', 'database', 'site', 'other']),
  cpu_percent: z.number(),
  memory_mb: z.number(),
  threads: z.number().nullable(),
});

export const EndpointLatencySchema = z.object({
  id: z.string(),
  method: z.string(),
  route: z.string(),
  calls_per_minute: z.number(),
  p50_ms: z.number(),
  p95_ms: z.number(),
  error_rate: z.number(),
  trend: z.array(z.number()),
});

export const PageLoadTimingSchema = z.object({
  id: z.string(),
  label: z.string(),
  ttfb_ms: z.number(),
  dom_ready_ms: z.number(),
  interactive_ms: z.number(),
  samples: z.number(),
});

export const PerformanceHostSchema = z.object({
  name: z.string(),
  region: z.string(),
  vcpu: z.number(),
  memory_gb: z.number(),
  uptime_hours: z.number(),
});

const LoadAverageSchema = z.tuple([z.number(), z.number(), z.number()]);

export const PerformanceSnapshotSchema = z.object({
  captured_at: z.iso.datetime(),
  host: PerformanceHostSchema,
  samples: z.array(PerformanceSampleSchema),
  cores: z.array(CpuCoreSchema),
  processes: z.array(ProcessLoadSchema),
  endpoints: z.array(EndpointLatencySchema),
  pages: z.array(PageLoadTimingSchema),
  load_average: LoadAverageSchema,
});

/** The live tick: the newest reading and the breakdown that explains it. */
export const PerformanceTickSchema = z.object({
  sample: PerformanceSampleSchema.nullable(),
  cores: z.array(CpuCoreSchema),
  processes: z.array(ProcessLoadSchema),
  load_average: LoadAverageSchema,
});

/** What the portal reports after a screen has loaded — cumulative marks, in ms. */
export const ReportPageTimingSchema = z
  .object({
    route: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^\/[A-Za-z0-9/_:-]*$/, 'A portal route path is required'),
    label: z.string().trim().min(1).max(80),
    ttfb_ms: z.number().min(0).max(120_000),
    dom_ready_ms: z.number().min(0).max(120_000),
    interactive_ms: z.number().min(0).max(120_000),
  })
  .strict();

export const ReportPageTimingResponseSchema = z.object({
  recorded: z.boolean(),
});
