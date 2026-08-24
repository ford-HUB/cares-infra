import { z } from 'zod';
import {
  LoginSource,
  RoleType,
} from '../../../infastructures/prisma/common/client';

export const SESSIONS_DEFAULT_LIMIT = 25;
export const SESSIONS_MAX_LIMIT = 200;

/** `all` keeps the portal's filter selects a single value space. */
export const ListSessionsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    source: z.union([z.literal('all'), z.enum(LoginSource)]).default('all'),
    role: z.union([z.literal('all'), z.enum(RoleType)]).default('all'),
    /**
     * Keyset cursor — `{signed-in timestamp}_{session id}` of the last row already
     * shown. Composite so a page still lands correctly when the row it points at was
     * revoked between requests.
     */
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
    /**
     * Lets an admin end their own other devices without signing the current browser
     * out in the same click. Parsed off the literal, not coerced — `Boolean('false')`
     * is `true`, which would silently spare a device the caller asked to end.
     */
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
  /** Null when the account was deleted while its session was still live. */
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
  /** True for the device that made this request, which must not be revoked blindly. */
  is_current: z.boolean(),
});

export const SessionsPageResponseSchema = z.object({
  items: z.array(ActiveSessionSchema),
  /** Every session matching the filters, not just the rows on this page. */
  total: z.number(),
  /** Null once the list is exhausted — that is how the scroll knows to stop. */
  next_cursor: z.string().nullable(),
});

export const RevokeSessionsResponseSchema = z.object({
  revoked: z.number(),
});
