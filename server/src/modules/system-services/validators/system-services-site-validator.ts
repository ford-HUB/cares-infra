import { z } from 'zod';

export const ServiceStateSchema = z.enum([
  'running',
  'scheduled',
  'paused',
  'failing',
]);

export const ServiceTriggerModeSchema = z.enum([
  'interval',
  'daily',
  'cron',
  'manual',
]);

/** Local `HH:mm`, 24-hour. */
const DailyAtSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour HH:mm time');

const CronSchema = z
  .string()
  .trim()
  .regex(
    // Five fields, or six with a leading seconds field — how "every 30 seconds" is
    // said. BullMQ validates the semantics when the scheduler is upserted.
    /^\S+(?:\s+\S+){4,5}$/,
    'Use a five- or six-field cron expression',
  );

export const ServiceTriggerSchema = z.object({
  mode: ServiceTriggerModeSchema,
  interval_minutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  daily_at: DailyAtSchema,
  cron_expression: CronSchema.or(z.literal('')),
});

export const ServiceDurationSchema = z.object({
  max_runtime_minutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  retries: z.number().int().min(0).max(10),
  overlap_policy: z.enum(['skip', 'queue']),
});

export const UpdateServiceScheduleSchema = z
  .object({
    trigger: ServiceTriggerSchema,
    duration: ServiceDurationSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.trigger.mode === 'cron' && !data.trigger.cron_expression) {
      ctx.addIssue({
        code: 'custom',
        path: ['trigger', 'cron_expression'],
        message: 'A cron expression is required in cron mode',
      });
    }
  });

export const SetServicePausedSchema = z
  .object({ paused: z.boolean() })
  .strict();

export const ServiceRunSchema = z.object({
  id: z.string(),
  started_at: z.iso.datetime(),
  duration_seconds: z.number(),
  outcome: z.enum(['success', 'failed', 'timed_out', 'running']),
});

export const SystemServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  owner: z.enum(['server', 'microservices', 'mobile-sync']),
  state: ServiceStateSchema,
  trigger: ServiceTriggerSchema,
  duration: ServiceDurationSchema,
  average_runtime_seconds: z.number(),
  last_run_at: z.iso.datetime().nullable(),
  next_run_at: z.iso.datetime().nullable(),
  current_run_started_at: z.iso.datetime().nullable(),
  on_duty_days: z.number(),
  recent_runs: z.array(ServiceRunSchema),
  last_error: z.string().nullable(),
});

export const SystemServiceListSchema = z.array(SystemServiceSchema);

export const ServiceLogEntrySchema = z.object({
  id: z.string(),
  run_id: z.string(),
  at: z.iso.datetime(),
  level: z.enum(['info', 'warn', 'error']),
  message: z.string(),
});

export const ServiceLogListSchema = z.array(ServiceLogEntrySchema);
