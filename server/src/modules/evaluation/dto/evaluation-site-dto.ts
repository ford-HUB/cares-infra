import { z } from 'zod';
import {
  EvaluationAnswersSchema,
  EvaluationAnswerValueSchema,
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
export type EvaluationFormDto = z.infer<typeof EvaluationFormResponseSchema>;
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
