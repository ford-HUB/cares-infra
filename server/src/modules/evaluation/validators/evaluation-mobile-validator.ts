import { z } from 'zod';
import { EventStatus } from '../../../infastructures/prisma/common/client';
import {
  EvaluationAnswersSchema,
  EvaluationFormResponseSchema,
} from './evaluation-site-validator';

export const EvaluationSubmissionSchema = z.object({
  evaluation_response_id: z.string(),
  submitted_at: z.string(),
  answers: EvaluationAnswersSchema,
});

export const EventEvaluationResponseSchema = z.object({
  event_id: z.number(),
  event_title: z.string(),
  event_status: z.enum(EventStatus),
  /** Null until published. */
  form: EvaluationFormResponseSchema.nullable(),
  /** Event over, caller took part, form published. */
  can_submit: z.boolean(),
  submission: EvaluationSubmissionSchema.nullable(),
});

/** JSON, or multipart with `answers` as a JSON string plus `image_<questionId>` files. */
export const SubmitEvaluationSchema = z
  .object({
    answers: z.preprocess((value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return value;
      }
    }, EvaluationAnswersSchema),
  })
  .strict();

export const EVALUATION_IMAGE_FIELD_PREFIX = 'image_';

export const SubmitEvaluationResponseSchema = z.object({
  event_id: z.number(),
  submission: EvaluationSubmissionSchema,
});

/** For the activity tab's badge. */
export const EvaluationSubmissionsResponseSchema = z.object({
  submissions: z.array(
    z.object({
      event_id: z.number(),
      submitted_at: z.string(),
    }),
  ),
});
