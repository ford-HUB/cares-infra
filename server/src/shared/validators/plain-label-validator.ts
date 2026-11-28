import { z } from 'zod';

/** Mixed punctuation allowed (`1:00–2:30 AM`); rejects doubled marks, `()`, `javascript:`-style colons and encoded values. */
const ALLOWED_PATTERN = /^[\p{L}\p{M}\p{N} .,'’\-–—()&/:?!%]+$/u;
const REPEATED_PUNCTUATION_PATTERN = /([^\p{L}\p{M}\p{N} ])\1|\(\)/u;
const COLON_BEFORE_LETTER_PATTERN = /:\p{L}/u;
const ENCODED_VALUE_PATTERN = /\b0x[0-9a-f]+\b|%[0-9a-f]{2}/i;

/** Empty is left to the schema's `min`. */
export const plainLabel = (schema: z.ZodString, label: string) =>
  schema
    .refine((value) => value === '' || ALLOWED_PATTERN.test(value), {
      message: `${label} may only contain letters, numbers, spaces and basic punctuation`,
    })
    .refine((value) => !REPEATED_PUNCTUATION_PATTERN.test(value), {
      message: `${label} cannot contain repeated punctuation`,
    })
    .refine((value) => !COLON_BEFORE_LETTER_PATTERN.test(value), {
      message: `A colon before a word in the ${label.toLowerCase()} must be followed by a space`,
    })
    .refine((value) => !ENCODED_VALUE_PATTERN.test(value), {
      message: `${label} cannot contain encoded values`,
    });
