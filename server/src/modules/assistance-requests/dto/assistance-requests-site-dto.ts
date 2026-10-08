import { z } from 'zod';
import {
  ApproveAssistanceRequestSchema,
  DeclineAssistanceRequestSchema,
  SiteAssistanceRequestListResponseSchema,
  SiteAssistanceRequestSchema,
} from '../validators/assistance-requests-site-validator';

export type ApproveAssistanceRequestDto = z.infer<
  typeof ApproveAssistanceRequestSchema
>;
export type DeclineAssistanceRequestDto = z.infer<
  typeof DeclineAssistanceRequestSchema
>;
export type SiteAssistanceRequestDto = z.infer<
  typeof SiteAssistanceRequestSchema
>;
export type SiteAssistanceRequestListDto = z.infer<
  typeof SiteAssistanceRequestListResponseSchema
>;
