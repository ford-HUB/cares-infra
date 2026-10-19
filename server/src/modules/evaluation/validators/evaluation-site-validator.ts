import { z } from 'zod';
import {
  EvaluationFormStatus,
  EvaluationResponseStatus,
} from '../../../infastructures/prisma/common/client';

/** Mirrors the portal builder's question palette. */
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

/** Photos one image-upload question may take; the builder offers 1..this. */
export const EVALUATION_IMAGE_MAX_FILES = 5;
export const EVALUATION_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const EVALUATION_IMAGE_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;
/** Prefix of every stored answer image, so a portal read can't reach other keys. */
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

/**
 * One question as the builder stores it. The ids are minted client-side and are
 * what every answer is keyed on, so they must survive a save unchanged.
 */
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
    /** Image upload only: how many photos the participant may attach. */
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
  /** True on the questionnaire served for events with no assignment of their own. */
  is_default: z.boolean(),
  /** Events this questionnaire is assigned to; 0 means it only runs as the default. */
  assigned_events: z.number().int(),
  /** Responses recorded against it, across every event it has served. */
  response_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const EvaluationFormListSchema = z.array(EvaluationFormResponseSchema);

/** A new questionnaire starts empty; the builder fills it and saves through PUT. */
export const CreateEvaluationFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().max(2000).default(''),
  })
  .strict();

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

/** One event-to-questionnaire assignment as the portal's Forms page reads it. */
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

export const AssignEvaluationFormSchema = z
  .object({
    form_id: z.string().min(1, 'Questionnaire is required').max(64),
    event_id: z.number().int().positive('Event is required'),
  })
  .strict();

/** An event the picker offers, plus the questionnaire it already carries. */
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

/**
 * The value shape follows the question type: text, a choice list (or, for an
 * image upload, the stored image keys), or a number.
 */
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

/** One row of the portal's answers table, flat so it can be filtered client-side. */
export const EvaluationResponseRowSchema = z.object({
  evaluation_response_id: z.string(),
  /** Which questionnaire collected it — events can ask different ones. */
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
  /** The star-rating answer, or null when the form has no such question. */
  rating: z.number().int().nullable(),
  status: z.enum(EvaluationResponseStatus),
  answers: EvaluationAnswersSchema,
});

export const EvaluationResponseListSchema = z.array(
  EvaluationResponseRowSchema,
);
