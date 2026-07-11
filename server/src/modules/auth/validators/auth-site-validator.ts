import { z } from "zod";

export const LoginSchema = z
  .object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;
