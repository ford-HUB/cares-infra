import { z } from 'zod'

export const staffLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
})

export type StaffLoginFormValues = z.infer<typeof staffLoginSchema>
