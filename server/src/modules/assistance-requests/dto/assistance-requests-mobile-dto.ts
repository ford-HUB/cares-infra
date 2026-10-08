import { z } from 'zod';
import {
  AssistanceTimelineEntrySchema,
  CancelAssistanceRequestSchema,
  CreateAssistanceRequestSchema,
  MobileAssistanceRequestListResponseSchema,
  MobileAssistanceRequestSchema,
  UpdateAssistanceRequestSchema,
} from '../validators/assistance-requests-mobile-validator';

export type CreateAssistanceRequestDto = z.infer<
  typeof CreateAssistanceRequestSchema
>;
export type UpdateAssistanceRequestDto = z.infer<
  typeof UpdateAssistanceRequestSchema
>;
export type CancelAssistanceRequestDto = z.infer<
  typeof CancelAssistanceRequestSchema
>;
export type AssistanceTimelineEntryDto = z.infer<
  typeof AssistanceTimelineEntrySchema
>;
export type MobileAssistanceRequestDto = z.infer<
  typeof MobileAssistanceRequestSchema
>;
export type MobileAssistanceRequestListDto = z.infer<
  typeof MobileAssistanceRequestListResponseSchema
>;
