import { z } from 'zod';
import {
  LoginOutcome,
  LoginSource,
  RoleType,
} from '../../../infastructures/prisma/common/client';

/** Rows pulled per scroll page — enough to overflow the grid so a scroll exists. */
export const LOGIN_ACTIVITY_DEFAULT_LIMIT = 25;
export const LOGIN_ACTIVITY_MAX_LIMIT = 100;

/** `all` keeps the portal's filter selects a single value space. */
export const LoginActivityRangeSchema = z.enum(['24h', '7d', '30d', 'all']);

export const ListLoginActivityQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    outcome: z.union([z.literal('all'), z.enum(LoginOutcome)]).default('all'),
    source: z.union([z.literal('all'), z.enum(LoginSource)]).default('all'),
    range: LoginActivityRangeSchema.default('7d'),
    /** Id of the last row already shown; the next page starts after it. */
    cursor: z.uuid().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(LOGIN_ACTIVITY_MAX_LIMIT)
      .default(LOGIN_ACTIVITY_DEFAULT_LIMIT),
  })
  .strict();

export const LoginActivitySchema = z.object({
  login_activity_id: z.string(),
  /** Null when the submitted email matched no account. */
  user_id: z.string().nullable(),
  email: z.string(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  role_type: z.enum(RoleType).nullable(),
  ip_address: z.string(),
  user_agent: z.string().nullable(),
  source: z.enum(LoginSource),
  outcome: z.enum(LoginOutcome),
  failure_reason: z.string().nullable(),
  created_at: z.iso.datetime(),
});

export const LoginActivityPageResponseSchema = z.object({
  items: z.array(LoginActivitySchema),
  /** Total matching rows, across every page. */
  total: z.number(),
  /** Null once the trail is exhausted — that is how the scroll knows to stop. */
  next_cursor: z.string().nullable(),
});
