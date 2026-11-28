import { z } from 'zod';
import { InterestCode } from '../../../infastructures/prisma/common/client';

const InterestCodeSchema = z.enum(InterestCode);

export const OTHER_INTEREST_MAX_LENGTH = 100;

/** No markup or control characters. */
const OTHER_INTEREST_PATTERN = /^[^<>\p{Cc}]*$/u;

const OtherInterestSchema = z
  .string()
  .trim()
  .max(
    OTHER_INTEREST_MAX_LENGTH,
    `Keep your other interest under ${OTHER_INTEREST_MAX_LENGTH} characters`,
  )
  .regex(OTHER_INTEREST_PATTERN, 'Other interest contains invalid characters');

export const SaveUserInterestsSchema = z
  .object({
    selected: z.array(InterestCodeSchema).min(1),
    /** Omit to keep the saved text; required non-empty alongside OTHERS. */
    other_interest: OtherInterestSchema.nullish(),
  })
  .strict()
  .refine(
    (data) =>
      data.other_interest === undefined ||
      !data.selected.includes(InterestCode.OTHERS) ||
      (data.other_interest ?? '').length > 0,
    {
      path: ['other_interest'],
      message: 'Tell us what your other interest is',
    },
  );

export const UserIdParamSchema = z.uuid();

export const InterestCatalogItemSchema = z.object({
  code: InterestCodeSchema,
  label: z.string(),
  description: z.string().nullable(),
  sort_order: z.number(),
});

export const InterestCatalogResponseSchema = z.array(InterestCatalogItemSchema);

export const SaveUserInterestsResponseSchema = z.object({
  user_interest_id: z.string(),
  user_id: z.string(),
  selected: z.array(InterestCodeSchema),
  other_interest: z.string().nullable(),
});

export const UserInterestsResponseSchema = z.object({
  selected: z.array(InterestCodeSchema).nullable(),
  other_interest: z.string().nullable(),
});
