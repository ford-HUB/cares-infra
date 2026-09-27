import { z } from 'zod';
import {
  AssignableEventSchema,
  AssignEvaluationFormSchema,
  CreateEvaluationFormSchema,
  EvaluationAnswersSchema,
  EvaluationAnswerValueSchema,
  EvaluationAssignmentSchema,
  EvaluationFormResponseSchema,
  EvaluationQuestionSchema,
  EvaluationResponseRowSchema,
  EvaluationResponsesQuerySchema,
  EvaluationTypographySchema,
  SaveEvaluationFormSchema,
} from '../validators/evaluation-site-validator';

export type EvaluationTypographyDto = z.infer<
  typeof EvaluationTypographySchema
>;
export type EvaluationQuestionDto = z.infer<typeof EvaluationQuestionSchema>;
export type SaveEvaluationFormDto = z.infer<typeof SaveEvaluationFormSchema>;
export type CreateEvaluationFormDto = z.infer<
  typeof CreateEvaluationFormSchema
>;
export type EvaluationFormDto = z.infer<typeof EvaluationFormResponseSchema>;
export type EvaluationAssignmentDto = z.infer<
  typeof EvaluationAssignmentSchema
>;
export type AssignEvaluationFormDto = z.infer<
  typeof AssignEvaluationFormSchema
>;
export type AssignableEventDto = z.infer<typeof AssignableEventSchema>;
export type EvaluationResponsesQueryDto = z.infer<
  typeof EvaluationResponsesQuerySchema
>;
export type EvaluationAnswerValueDto = z.infer<
  typeof EvaluationAnswerValueSchema
>;
export type EvaluationAnswersDto = z.infer<typeof EvaluationAnswersSchema>;
export type EvaluationResponseRowDto = z.infer<
  typeof EvaluationResponseRowSchema
>;
