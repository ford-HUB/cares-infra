import { z } from 'zod';
import {
  AssistanceTimelineEntrySchema,
  CreateAssistanceRequestSchema,
  MobileAssistanceRequestListResponseSchema,
  MobileAssistanceRequestSchema,
} from '../validators/assistance-requests-mobile-validator';

export type CreateAssistanceRequestDto = z.infer<
  typeof CreateAssistanceRequestSchema
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
