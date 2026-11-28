import { z } from 'zod';
import {
  LoginSource,
  RoleType,
} from '../../../infastructures/prisma/common/client';

export const SESSIONS_DEFAULT_LIMIT = 25;
export const SESSIONS_MAX_LIMIT = 200;

/** `all` keeps the filter a single value space. */
export const ListSessionsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    source: z.union([z.literal('all'), z.enum(LoginSource)]).default('all'),
    role: z.union([z.literal('all'), z.enum(RoleType)]).default('all'),
    /** `{signed-in timestamp}_{session id}`; composite so it survives revocation of that row. */
    cursor: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(SESSIONS_MAX_LIMIT)
      .default(SESSIONS_DEFAULT_LIMIT),
  })
  .strict();

export const SessionIdParamSchema = z.uuid();

export const SessionUserParamSchema = z.uuid();

export const RevokeUserSessionsQuerySchema = z
  .object({
    /** Parsed off the literal, not coerced: `Boolean('false')` is `true`. */
    keep_current: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .strict();

export const ActiveSessionSchema = z.object({
  session_id: z.string(),
  user_id: z.string(),
  email: z.string(),
  /** Null when the account was deleted with a live session. */
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  avatar: z.string().nullable(),
  department: z.string().nullable(),
  role_type: z.enum(RoleType),
  is_restricted: z.boolean(),
  ip_address: z.string(),
  user_agent: z.string().nullable(),
  source: z.enum(LoginSource),
  created_at: z.iso.datetime(),
  last_seen_at: z.iso.datetime(),
  expires_at: z.iso.datetime(),
  /** The requesting device. */
  is_current: z.boolean(),
});

export const SessionsPageResponseSchema = z.object({
  items: z.array(ActiveSessionSchema),
  /** Across all pages. */
  total: z.number(),
  /** Null once exhausted; stops the scroll. */
  next_cursor: z.string().nullable(),
});

export const RevokeSessionsResponseSchema = z.object({
  revoked: z.number(),
});
