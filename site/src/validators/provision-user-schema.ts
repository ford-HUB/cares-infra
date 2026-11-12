import { z } from 'zod'
import {
  CREDENTIAL_DEFAULT_HOURS,
  CREDENTIAL_MAX_HOURS,
  CREDENTIAL_MIN_HOURS,
  PROVISIONABLE_DEPARTMENTS,
  REGULAR_USER_ROLE,
  REGULAR_USER_TYPES,
} from '../constants/manage-users'

const departmentNames = PROVISIONABLE_DEPARTMENTS.map((option) => option.value)
const regularUserTypes = REGULAR_USER_TYPES.map((option) => option.value) as [
  (typeof REGULAR_USER_TYPES)[number]['value'],
  ...(typeof REGULAR_USER_TYPES)[number]['value'][],
]

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
    role: z.enum(['ADMIN', 'DIRECTOR', 'COORDINATOR', REGULAR_USER_ROLE]),
    // Only read when `role` is Regular User — it decides the app role (and, for a
    // volunteer, whether they are a student or staff).
    regularUserType: z.enum(regularUserTypes),
    // '' is the "no department" option — an admin or director usually has none.
    department: z.enum(['', ...departmentNames]),
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

/**
 * The role type the server should create, plus the volunteer sub-type when there is one.
 * Portal roles pass straight through; a Regular User resolves through its type.
 */
export function resolveProvisionRole(
  values: Pick<ProvisionUserFormValues, 'role' | 'regularUserType'>,
): { roleType: string; volunteerType: string | null; isPortalRole: boolean } {
  if (values.role !== REGULAR_USER_ROLE) {
    return { roleType: values.role, volunteerType: null, isPortalRole: true }
  }

  const type =
    REGULAR_USER_TYPES.find((option) => option.value === values.regularUserType) ??
    REGULAR_USER_TYPES[0]
  return {
    roleType: type.roleType,
    volunteerType: type.volunteerType,
    isPortalRole: false,
  }
}

export const provisionUserDefaultValues: ProvisionUserFormValues = {
  mode: 'generate',
  email: '',
  recipientEmail: '',
  role: 'COORDINATOR',
  regularUserType: 'VOLUNTEER_STUDENT',
  department: '',
  expiresInHours: CREDENTIAL_DEFAULT_HOURS,
}
