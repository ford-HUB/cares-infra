import { z } from 'zod'

const profileFormBaseFields = {
  firstname: z.string().trim().min(1, 'First name is required').max(80),
  lastname: z.string().trim().min(1, 'Last name is required').max(80),
  phone_number: z.string().trim().min(7, 'Phone number is required').max(25),
  gender: z.enum(['M', 'F']),
  address_street: z.string().trim().min(1, 'Street is required').max(200),
  address_barangay: z.string().trim().min(1, 'Barangay is required').max(120),
  address_city: z.string().trim().min(1, 'City is required').max(120),
  address_province: z.string().trim().min(1, 'Province is required').max(120),
} as const

export const directorProfileFormSchema = z.object(profileFormBaseFields)

export const staffProfileFormSchema = z.object({
  ...profileFormBaseFields,
  department: z.string().trim().min(1, 'Department is required').max(120),
})

/** @deprecated Use staffProfileFormSchema or directorProfileFormSchema */
export const profileFormSchema = staffProfileFormSchema

export type DirectorProfileFormValues = z.infer<typeof directorProfileFormSchema>
export type StaffProfileFormValues = z.infer<typeof staffProfileFormSchema>
export type ProfileFormValues = StaffProfileFormValues

export const profileFormDefaultValues: ProfileFormValues = {
  firstname: '',
  lastname: '',
  phone_number: '',
  gender: 'F',
  department: '',
  address_street: '',
  address_barangay: '',
  address_city: '',
  address_province: '',
}

export const directorProfileFormDefaultValues: DirectorProfileFormValues = {
  firstname: '',
  lastname: '',
  phone_number: '',
  gender: 'F',
  address_street: '',
  address_barangay: '',
  address_city: '',
  address_province: '',
}

export function getProfileFormSchema(isDirector: boolean) {
  return isDirector ? directorProfileFormSchema : staffProfileFormSchema
}
