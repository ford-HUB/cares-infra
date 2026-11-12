import { z } from 'zod';

/**
 * A short label is shown to every audience and sent in notifications, so it is held to
 * plain wording. Real labels use dashes, times and abbreviations (`1:00–2:30 AM`,
 * `a.m.,`, `(PH time).`), so mixed punctuation stays allowed; what is rejected is a
 * doubled mark or empty parentheses (`--`, `!!!`, `()`), a colon run into a word
 * (`javascript:`), and encoded values (`0x27…`, `%27`).
 */
const ALLOWED_PATTERN = /^[\p{L}\p{M}\p{N} .,'’\-–—()&/:?!%]+$/u;
const REPEATED_PUNCTUATION_PATTERN = /([^\p{L}\p{M}\p{N} ])\1|\(\)/u;
const COLON_BEFORE_LETTER_PATTERN = /:\p{L}/u;
const ENCODED_VALUE_PATTERN = /\b0x[0-9a-f]+\b|%[0-9a-f]{2}/i;

/** An empty value is left to the schema's own `min`, so optional labels can stay blank. */
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
