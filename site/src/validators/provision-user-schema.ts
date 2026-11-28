import { z } from 'zod'
import {
  CREDENTIAL_DEFAULT_HOURS,
  CREDENTIAL_MAX_HOURS,
  CREDENTIAL_MIN_HOURS,
  PARTNER_BARANGAY_USER_TYPE,
  PROVISIONABLE_DEPARTMENTS,
  PROVISIONABLE_PARTNER_BARANGAYS,
  REGULAR_USER_ROLE,
  REGULAR_USER_TYPES,
} from '../constants/manage-users'

const departmentNames = PROVISIONABLE_DEPARTMENTS.map((option) => option.value)
const partnerBarangayNames = PROVISIONABLE_PARTNER_BARANGAYS.map((option) => option.value)
const regularUserTypes = REGULAR_USER_TYPES.map((option) => option.value) as [
  (typeof REGULAR_USER_TYPES)[number]['value'],
  ...(typeof REGULAR_USER_TYPES)[number]['value'][],
]

/** Password is always generated; name and phone are filled in by the person later. */
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
    // Read only for Regular User.
    regularUserType: z.enum(regularUserTypes),
    // '' is "no department".
    department: z.enum(['', ...departmentNames]),
    // Partner-barangay volunteers only; replaces the department.
    partnerBarangay: z.enum(['', ...partnerBarangayNames]),
    // `valueAsNumber` field; `z.coerce` would widen the input type to `unknown`.
    expiresInHours: z
      .number()
      .int()
      .min(CREDENTIAL_MIN_HOURS, 'Pick a lifetime of at least an hour')
      .max(CREDENTIAL_MAX_HOURS, 'A credential cannot outlive 90 days'),
  })
  .superRefine((values, ctx) => {
    if (isPartnerBarangayVolunteer(values) && !values.partnerBarangay) {
      ctx.addIssue({
        code: 'custom',
        path: ['partnerBarangay'],
        message: 'Choose the partner barangay the volunteer belongs to',
      })
    }

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

export function isPartnerBarangayVolunteer(values: {
  role: string
  regularUserType: string
}): boolean {
  return (
    values.role === REGULAR_USER_ROLE &&
    values.regularUserType === PARTNER_BARANGAY_USER_TYPE
  )
}

/** Portal roles pass through; Regular User resolves through its type. */
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
  partnerBarangay: '',
  expiresInHours: CREDENTIAL_DEFAULT_HOURS,
}
