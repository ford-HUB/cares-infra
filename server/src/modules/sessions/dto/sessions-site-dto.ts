import { z } from 'zod';
import {
  ActiveSessionSchema,
  ListSessionsQuerySchema,
  RevokeSessionsResponseSchema,
  RevokeUserSessionsQuerySchema,
  SessionsPageResponseSchema,
} from '../validators/sessions-site-validator';

export type ListSessionsQueryDto = z.infer<typeof ListSessionsQuerySchema>;
export type RevokeUserSessionsQueryDto = z.infer<
  typeof RevokeUserSessionsQuerySchema
>;
export type ActiveSessionDto = z.infer<typeof ActiveSessionSchema>;
export type SessionsPageDto = z.infer<typeof SessionsPageResponseSchema>;
export type RevokeSessionsDto = z.infer<typeof RevokeSessionsResponseSchema>;
