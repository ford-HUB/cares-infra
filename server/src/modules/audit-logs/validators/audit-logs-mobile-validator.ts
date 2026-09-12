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
    /** Id of the last row already shown; the next page starts after it. */
    cursor: z.uuid().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ACTIVITY_LOGS_MAX_LIMIT)
      .default(ACTIVITY_LOGS_DEFAULT_LIMIT),
  })
  .strict();

/**
 * The account holder's view of an audit row. The reviewer-only columns (severity,
 * reason, changes, request id) are dropped. The actor is kept in reduced form:
 * `by_self` tells the app whether to show "by <staff name>" on entries that
 * were done to the account rather than by it.
 */
export const ActivityLogEntrySchema = z.object({
  activity_log_id: z.string(),
  /** Machine key the app groups on, e.g. `auth.mobile.sign-in`, `profile.updated`. */
  action: z.string(),
  description: z.string(),
  category: z.enum(AuditCategory),
  outcome: z.enum(AuditOutcome),
  target_label: z.string(),
  source: z.enum(AuditSource),
  ip_address: z.string(),
  user_agent: z.string().nullable(),
  /** False when staff (or the system) acted on this account. */
  by_self: z.boolean(),
  actor_name: z.string(),
  actor_role: z.enum(RoleType).nullable(),
  metadata: z.record(z.string(), z.string()),
  created_at: z.iso.datetime(),
});

export const ActivityLogPageResponseSchema = z.object({
  items: z.array(ActivityLogEntrySchema),
  /** Null once the trail is exhausted. */
  next_cursor: z.string().nullable(),
});

/**
 * Device-side actions the app is allowed to write into its own trail. Kept to a
 * fixed list so the endpoint cannot be used to forge arbitrary entries.
 */
export const CLIENT_ACTIVITY_ACTIONS = [
  'account.role.switched',
  'account.role.unlocked',
] as const;

export type ClientActivityAction = (typeof CLIENT_ACTIVITY_ACTIONS)[number];

export const RecordClientActivitySchema = z
  .object({
    action: z.enum(CLIENT_ACTIVITY_ACTIONS),
    /** Short context — `from`/`to` for a switch, `role`/`method` for an unlock. */
    metadata: z
      .record(z.string().max(40), z.string().max(120))
      .refine((m) => Object.keys(m).length <= 8, 'Too many metadata keys')
      .default({}),
  })
  .strict();
