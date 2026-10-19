import { z } from 'zod';
import { EventStatus } from '../../../infastructures/prisma/common/client';
import {
  EvaluationAnswersSchema,
  EvaluationFormResponseSchema,
} from './evaluation-site-validator';

/** What the volunteer already sent for this event, if anything. */
export const EvaluationSubmissionSchema = z.object({
  evaluation_response_id: z.string(),
  submitted_at: z.string(),
  answers: EvaluationAnswersSchema,
});

/**
 * Everything the feedback screen needs for one event: the published questionnaire,
 * whether the caller may still answer it, and their previous submission.
 */
export const EventEvaluationResponseSchema = z.object({
  event_id: z.number(),
  event_title: z.string(),
  event_status: z.enum(EventStatus),
  /** Null until the director publishes a questionnaire. */
  form: EvaluationFormResponseSchema.nullable(),
  /** True when the event is over, the caller took part, and a form is published. */
  can_submit: z.boolean(),
  submission: EvaluationSubmissionSchema.nullable(),
});

/**
 * A plain JSON body, or — when the form has image-upload questions — multipart,
 * where `answers` arrives as a JSON string beside one `image_<questionId>` file
 * field per photo.
 */
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

/** The multipart field an image answer is sent under. */
export const EVALUATION_IMAGE_FIELD_PREFIX = 'image_';

export const SubmitEvaluationResponseSchema = z.object({
  event_id: z.number(),
  submission: EvaluationSubmissionSchema,
});

/** Which events the caller already gave feedback on — the activity tab's badge. */
export const EvaluationSubmissionsResponseSchema = z.object({
  submissions: z.array(
    z.object({
      event_id: z.number(),
      submitted_at: z.string(),
    }),
  ),
});
