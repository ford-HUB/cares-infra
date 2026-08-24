import { z } from 'zod'
import {
  CREDENTIAL_DEFAULT_HOURS,
  CREDENTIAL_MAX_HOURS,
  CREDENTIAL_MIN_HOURS,
} from '../constants/manage-users'

/**
 * `generate` has the server mint the sign-in name; `manual` carries the address the
 * requester asked from. The password is generated either way — an administrator
 * choosing someone else's password is what this flow exists to avoid.
 */
export const provisionUserSchema = z
  .object({
    mode: z.enum(['manual', 'generate']),
    firstName: z.string().trim().min(1, 'First name is required').max(80),
    lastName: z.string().trim().min(1, 'Last name is required').max(80),
    email: z.string().trim().max(160).optional(),
    role: z.enum(['ADMIN', 'DIRECTOR', 'COORDINATOR']),
    department: z.string().trim().max(120).optional(),
    phoneNumber: z.string().trim().max(25).optional(),
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
  firstName: '',
  lastName: '',
  email: '',
  role: 'COORDINATOR',
  department: '',
  phoneNumber: '',
  expiresInHours: CREDENTIAL_DEFAULT_HOURS,
}
