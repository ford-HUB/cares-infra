import { z } from 'zod';
import {
  EvaluationSubmissionSchema,
  EvaluationSubmissionsResponseSchema,
  EventEvaluationResponseSchema,
  SubmitEvaluationResponseSchema,
  SubmitEvaluationSchema,
} from '../validators/evaluation-mobile-validator';

export type EvaluationSubmissionDto = z.infer<
  typeof EvaluationSubmissionSchema
>;
export type EventEvaluationDto = z.infer<typeof EventEvaluationResponseSchema>;
export type SubmitEvaluationDto = z.infer<typeof SubmitEvaluationSchema>;
export type SubmitEvaluationResponseDto = z.infer<
  typeof SubmitEvaluationResponseSchema
>;
export type EvaluationSubmissionsResponseDto = z.infer<
  typeof EvaluationSubmissionsResponseSchema
>;
