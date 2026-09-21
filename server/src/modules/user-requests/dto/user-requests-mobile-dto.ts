import { z } from 'zod';
import {
  CreateEventJoinRequestSchema,
  CreateRoleAccessRequestSchema,
  MobileUserRequestListResponseSchema,
  MobileUserRequestSchema,
} from '../validators/user-requests-mobile-validator';

export type CreateRoleAccessRequestDto = z.infer<
  typeof CreateRoleAccessRequestSchema
>;
export type CreateEventJoinRequestDto = z.infer<
  typeof CreateEventJoinRequestSchema
>;
export type MobileUserRequestDto = z.infer<typeof MobileUserRequestSchema>;
export type MobileUserRequestListDto = z.infer<
  typeof MobileUserRequestListResponseSchema
>;
