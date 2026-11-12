import { z } from 'zod';

/**
 * `JSON.parse` keeps `"__proto__"` as an own key, and `.strict()` silently drops
 * it instead of reporting it as unrecognized. Wrapping a request schema with this
 * rejects such a body outright, so a pollution attempt is a 400 rather than a
 * quietly accepted request.
 */
export const withoutPrototypeKeys = <T extends z.ZodType>(schema: T) =>
  z.preprocess((input, ctx) => {
    if (
      input !== null &&
      typeof input === 'object' &&
      Object.prototype.hasOwnProperty.call(input, '__proto__')
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Unrecognized key: "__proto__"',
        input,
      });
    }
    return input;
  }, schema);
