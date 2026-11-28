import { z } from 'zod';

/** `.strict()` silently drops an own `__proto__` key; this rejects it with a 400. */
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
