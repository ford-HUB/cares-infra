import { z } from 'zod'
import {
  CREDENTIAL_DEFAULT_HOURS,
  CREDENTIAL_MAX_HOURS,
  CREDENTIAL_MIN_HOURS,
  PROVISIONABLE_DEPARTMENTS,
} from '../constants/manage-users'

const departmentCodes = PROVISIONABLE_DEPARTMENTS.map((option) => option.value)

/**
 * `generate` has the server mint the sign-in name; `manual` carries the address the
 * requester asked from. The password is generated either way — an administrator
 * choosing someone else's password is what this flow exists to avoid. The person's
 * name and phone are not asked for: they fill those in themselves once signed in.
 * `recipientEmail` is the inbox the credentials are mailed to.
 */
export const provisionUserSchema = z
  .object({
    mode: z.enum(['manual', 'generate']),
    email: z.string().trim().max(160).optional(),
    recipientEmail: z
      .string()
      .trim()
      .min(1, 'Enter the email address to send the credentials to')
      .max(160)
      .email('Enter a valid email address'),
    role: z.enum(['ADMIN', 'DIRECTOR', 'COORDINATOR']),
    // '' is the "no department" option — an admin or director usually has none.
    department: z.enum(['', ...departmentCodes]),
    // The select stores a number (`valueAsNumber` on the field), so no coercion here —
    // `z.coerce` would widen the form's input type to `unknown`.
    expiresInHours: z
      .number()
      .int()
      .min(CREDENTIAL_MIN_HOURS, 'Pick a lifetime of at least an hour')
      .max(CREDENTIAL_MAX_HOURS, 'A credential cannot outlive 90 days'),
  })
  .superRefine((values, ctx) => {
    if (values.mode !== 'manual') return

    if (!values.email) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Enter the email address from the access request',
      })
      return
    }

    if (!z.string().email().safeParse(values.email).success) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Enter a valid email address',
      })
    }
  })

export type ProvisionUserFormValues = z.infer<typeof provisionUserSchema>

export const provisionUserDefaultValues: ProvisionUserFormValues = {
  mode: 'generate',
  email: '',
  recipientEmail: '',
  role: 'COORDINATOR',
  department: '',
  expiresInHours: CREDENTIAL_DEFAULT_HOURS,
}
