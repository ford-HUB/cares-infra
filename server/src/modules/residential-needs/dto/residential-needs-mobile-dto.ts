import { z } from 'zod';
import {
  MobileNeedsAssessmentSchema,
  MyNeedsAssessmentResponseSchema,
  SubmitNeedsAssessmentSchema,
} from '../validators/residential-needs-mobile-validator';

export type SubmitNeedsAssessmentDto = z.infer<
  typeof SubmitNeedsAssessmentSchema
>;
export type MobileNeedsAssessmentDto = z.infer<
  typeof MobileNeedsAssessmentSchema
>;
export type MyNeedsAssessmentResponseDto = z.infer<
  typeof MyNeedsAssessmentResponseSchema
>;
