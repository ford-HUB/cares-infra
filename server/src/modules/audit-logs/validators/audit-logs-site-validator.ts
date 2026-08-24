import { z } from 'zod';
import {
  AuditCategory,
  AuditOutcome,
  AuditSeverity,
  AuditSource,
  RoleType,
} from '../../../infastructures/prisma/common/client';

/** Rows pulled per scroll page — enough to overflow the grid so a scroll exists. */
export const AUDIT_LOGS_DEFAULT_LIMIT = 25;
export const AUDIT_LOGS_MAX_LIMIT = 100;

/** `all` keeps the portal's filter selects a single value space. */
export const AuditLogRangeSchema = z.enum(['24h', '7d', '30d', 'all']);

export const ListAuditLogsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    category: z.union([z.literal('all'), z.enum(AuditCategory)]).default('all'),
    severity: z.union([z.literal('all'), z.enum(AuditSeverity)]).default('all'),
    outcome: z.union([z.literal('all'), z.enum(AuditOutcome)]).default('all'),
    range: AuditLogRangeSchema.default('7d'),
    /** Id of the last row already shown; the next page starts after it. */
    cursor: z.uuid().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(AUDIT_LOGS_MAX_LIMIT)
      .default(AUDIT_LOGS_DEFAULT_LIMIT),
  })
  .strict();

/** One field-level before/after pair, so a change is reviewable without a diff tool. */
export const AuditLogChangeSchema = z.object({
  field: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
});

export const AuditLogSchema = z.object({
  audit_log_id: z.string(),
  action: z.string(),
  description: z.string(),
  category: z.enum(AuditCategory),
  severity: z.enum(AuditSeverity),
  outcome: z.enum(AuditOutcome),
  /** Null for background jobs, and for actors whose account was later deleted. */
  actor_user_id: z.string().nullable(),
  actor_name: z.string(),
  actor_email: z.string(),
  actor_role: z.enum(RoleType).nullable(),
  target_type: z.string(),
  target_label: z.string(),
  target_id: z.string().nullable(),
  ip_address: z.string(),
  user_agent: z.string().nullable(),
  source: z.enum(AuditSource),
  request_id: z.string().nullable(),
  reason: z.string().nullable(),
  changes: z.array(AuditLogChangeSchema),
  /** Free-form context, flattened to strings so the portal can render it as-is. */
  metadata: z.record(z.string(), z.string()),
  created_at: z.iso.datetime(),
});

export const AuditLogPageResponseSchema = z.object({
  items: z.array(AuditLogSchema),
  /** Total matching rows, across every page. */
  total: z.number(),
  /** Null once the trail is exhausted — that is how the scroll knows to stop. */
  next_cursor: z.string().nullable(),
});
