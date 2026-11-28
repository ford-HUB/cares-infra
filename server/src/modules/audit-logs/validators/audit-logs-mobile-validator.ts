import { z } from 'zod';
import {
  AuditCategory,
  AuditOutcome,
  AuditSource,
  RoleType,
} from '../../../infastructures/prisma/common/client';

export const ACTIVITY_LOGS_DEFAULT_LIMIT = 30;
export const ACTIVITY_LOGS_MAX_LIMIT = 100;

export const ListMyActivityQuerySchema = z
  .object({
    /** Last shown id; the next page starts after it. */
    cursor: z.uuid().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ACTIVITY_LOGS_MAX_LIMIT)
      .default(ACTIVITY_LOGS_DEFAULT_LIMIT),
  })
  .strict();

/** Reviewer-only columns dropped; `by_self` decides "by <staff name>". */
export const ActivityLogEntrySchema = z.object({
  activity_log_id: z.string(),
  /** e.g. `auth.mobile.sign-in`, `profile.updated`. */
  action: z.string(),
  description: z.string(),
  category: z.enum(AuditCategory),
  outcome: z.enum(AuditOutcome),
  target_label: z.string(),
  source: z.enum(AuditSource),
  ip_address: z.string(),
  user_agent: z.string().nullable(),
  /** False when staff or the system acted. */
  by_self: z.boolean(),
  actor_name: z.string(),
  actor_role: z.enum(RoleType).nullable(),
  metadata: z.record(z.string(), z.string()),
  created_at: z.iso.datetime(),
});

export const ActivityLogPageResponseSchema = z.object({
  items: z.array(ActivityLogEntrySchema),
  /** Null once exhausted. */
  next_cursor: z.string().nullable(),
});

/** Fixed list so the endpoint can't forge arbitrary entries. */
export const CLIENT_ACTIVITY_ACTIONS = [
  'account.role.switched',
  'account.role.unlocked',
] as const;

export type ClientActivityAction = (typeof CLIENT_ACTIVITY_ACTIONS)[number];

export const RecordClientActivitySchema = z
  .object({
    action: z.enum(CLIENT_ACTIVITY_ACTIONS),
    /** `from`/`to` for a switch, `role`/`method` for an unlock. */
    metadata: z
      .record(z.string().max(40), z.string().max(120))
      .refine((m) => Object.keys(m).length <= 8, 'Too many metadata keys')
      .default({}),
  })
  .strict();
