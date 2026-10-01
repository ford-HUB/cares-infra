import { z } from 'zod';
import {
  ListUserRequestsQuerySchema,
  RejectUserRequestSchema,
  UserRequestAttachmentKindSchema,
  UserRequestAttachmentSchema,
  UserRequestListResponseSchema,
  UserRequestSchema,
  UserRequestTrailEntrySchema,
} from '../validators/user-requests-site-validator';

export type ListUserRequestsQueryDto = z.infer<
  typeof ListUserRequestsQuerySchema
>;
export type RejectUserRequestDto = z.infer<typeof RejectUserRequestSchema>;
export type UserRequestAttachmentKind = z.infer<
  typeof UserRequestAttachmentKindSchema
>;
export type UserRequestAttachmentDto = z.infer<
  typeof UserRequestAttachmentSchema
>;
export type UserRequestTrailEntryDto = z.infer<
  typeof UserRequestTrailEntrySchema
>;
export type UserRequestDto = z.infer<typeof UserRequestSchema>;
export type UserRequestListDto = z.infer<typeof UserRequestListResponseSchema>;
