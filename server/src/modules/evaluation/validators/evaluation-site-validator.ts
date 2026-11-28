import { z } from 'zod';
import {
  EvaluationFormStatus,
  EvaluationResponseStatus,
} from '../../../infastructures/prisma/common/client';
import { CONTROL_CHARACTER_PATTERN } from '../../../shared/validators/control-character-validator';
import { plainLabel } from '../../../shared/validators/plain-label-validator';
import { withoutPrototypeKeys } from '../../../shared/validators/prototype-key-validator';

/** Max of the `Int` event id column. */
const EVENT_ID_MAX = 2147483647;

/** Must match the portal builder's palette. */
export const EvaluationQuestionTypeSchema = z.enum([
  'short_answer',
  'paragraph',
  'multiple_choice',
  'checkboxes',
  'dropdown',
  'linear_scale',
  'star_rating',
  'date',
  'image_upload',
]);

/** Per question; the builder offers 1..this. */
export const EVALUATION_IMAGE_MAX_FILES = 5;
export const EVALUATION_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const EVALUATION_IMAGE_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;
/** Bounds portal reads to these keys. */
export const EVALUATION_IMAGE_KEY_PREFIX = 'evaluation-responses/';

export const EvaluationFontFamilySchema = z.enum([
  'inter',
  'lato',
  'montserrat',
  'lora',
  'merriweather',
  'playfair',
  'garamond',
]);

export const EvaluationFontSizeSchema = z.enum(['sm', 'md', 'lg', 'xl']);

export const EvaluationTypographySchema = z
  .object({
    font_family: EvaluationFontFamilySchema,
    font_size: EvaluationFontSizeSchema,
  })
  .strict();

/** Client-minted ids key every answer, so must survive saves. */
export const EvaluationQuestionSchema = z
  .object({
    id: z.string().min(1, 'Question id is required').max(64),
    type: EvaluationQuestionTypeSchema,
    title: z.string().max(500),
    description: z.string().max(1000),
    required: z.boolean(),
    options: z.array(z.string().max(200)).max(10),
    scale_max: z.number().int().min(2).max(10),
    scale_min_label: z.string().max(100),
    scale_max_label: z.string().max(100),
    /** Image upload only. */
    max_files: z
      .number()
      .int()
      .min(1)
      .max(EVALUATION_IMAGE_MAX_FILES)
      .default(1),
    typography: EvaluationTypographySchema,
  })
  .strict();

export const SaveEvaluationFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().max(2000),
    header_typography: EvaluationTypographySchema,
    questions: z.array(EvaluationQuestionSchema).max(100),
    status: z.enum(EvaluationFormStatus),
  })
  .strict()
  .superRefine((form, ctx) => {
    const seen = new Set<string>();
    for (const question of form.questions) {
      if (seen.has(question.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions'],
          message: `Duplicate question id "${question.id}"`,
        });
      }
      seen.add(question.id);
    }
  });

export const EvaluationFormResponseSchema = z.object({
  evaluation_form_id: z.string(),
  title: z.string(),
  description: z.string(),
  header_typography: EvaluationTypographySchema,
  questions: z.array(EvaluationQuestionSchema),
  status: z.enum(EvaluationFormStatus),
  /** Served for unassigned events. */
  is_default: z.boolean(),
  /** 0 means default-only. */
  assigned_events: z.number().int(),
  /** Across every event. */
  response_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const EvaluationFormListSchema = z.array(EvaluationFormResponseSchema);

/** Starts empty; filled via PUT. */
export const CreateEvaluationFormSchema = withoutPrototypeKeys(
  z
    .object({
      title: plainLabel(
        z.string().trim().min(1, 'Title is required').max(200),
        'Title',
      ),
      description: z
        .string()
        .max(2000)
        .refine((value) => !CONTROL_CHARACTER_PATTERN.test(value), {
          message: 'Description cannot contain control characters',
        })
        .default(''),
    })
    .strict(),
);

export const EvaluationResponseIdParamSchema = z.uuid(
  'A valid response id is required',
);

export const EvaluationQuestionIdParamSchema = z
  .string()
  .min(1, 'Question id is required')
  .max(64);

export const EvaluationImageIndexParamSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .pipe(
    z
      .number()
      .int()
      .min(0)
      .max(EVALUATION_IMAGE_MAX_FILES - 1),
  );

export const EvaluationFormIdParamSchema = z
  .string()
  .min(1, 'Questionnaire id is required')
  .max(64);

export const EvaluationAssignmentSchema = z.object({
  evaluation_assignment_id: z.string(),
  form_id: z.string(),
  form_title: z.string(),
  form_status: z.enum(EvaluationFormStatus),
  event_id: z.number(),
  event_title: z.string(),
  event_location: z.string(),
  event_status: z.string(),
  event_started: z.string(),
  event_ended: z.string(),
  participants: z.number().int(),
  assigned_by: z.string().nullable(),
  assigned_at: z.string(),
});

export const EvaluationAssignmentListSchema = z.array(
  EvaluationAssignmentSchema,
);

export const AssignEvaluationFormSchema = withoutPrototypeKeys(
  z
    .object({
      form_id: z.uuid('Questionnaire is required'),
      event_id: z
        .number()
        .int()
        .positive('Event is required')
        .max(EVENT_ID_MAX),
    })
    .strict(),
);

export const AssignableEventSchema = z.object({
  event_id: z.number(),
  title: z.string(),
  location: z.string(),
  status: z.string(),
  participants: z.number().int(),
  event_started: z.string(),
  event_ended: z.string(),
  assigned_form_id: z.string().nullable(),
});

export const AssignableEventListSchema = z.array(AssignableEventSchema);

export const EvaluationResponsesQuerySchema = z
  .object({
    event_id: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === '' || value === null)
          return undefined;
        const parsed = typeof value === 'string' ? Number(value) : value;
        return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
      }),
  })
  .strict();

/** Text, choice list (or stored image keys), or number. */
export const EvaluationAnswerValueSchema = z.union([
  z.string().max(5000),
  z.array(z.string().max(200)).max(10),
  z.number(),
  z.null(),
]);

export const EvaluationAnswersSchema = z.record(
  z.string().max(64),
  EvaluationAnswerValueSchema,
);

/** Flat for client-side filtering. */
export const EvaluationResponseRowSchema = z.object({
  evaluation_response_id: z.string(),
  /** Events can use different questionnaires. */
  form_id: z.string(),
  form_title: z.string(),
  event_id: z.number(),
  event_title: z.string(),
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  department: z.string().nullable(),
  submitted_at: z.string(),
  /** Null when the form has no rating question. */
  rating: z.number().int().nullable(),
  status: z.enum(EvaluationResponseStatus),
  answers: EvaluationAnswersSchema,
});

export const EvaluationResponseListSchema = z.array(
  EvaluationResponseRowSchema,
);
