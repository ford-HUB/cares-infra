import { z } from 'zod'

const profileFormBaseFields = {
  firstname: z.string().trim().min(1, 'First name is required').max(80),
  lastname: z.string().trim().min(1, 'Last name is required').max(80),
  phone_number: z.string().trim().min(7, 'Phone number is required').max(25),
  gender: z.enum(['M', 'F', 'O']),
  age: z
    .number({ message: 'Age is required' })
    .int('Age must be a whole number')
    .min(18, 'Age must be at least 18')
    .max(120, 'Age must be 120 or below'),
  address_street: z.string().trim().min(1, 'Street is required').max(200),
  address_barangay: z.string().trim().min(1, 'Barangay is required').max(120),
  address_city: z.string().trim().min(1, 'City is required').max(120),
  address_province: z.string().trim().min(1, 'Province is required').max(120),
} as const

export const directorProfileFormSchema = z.object(profileFormBaseFields)

export const portalProfileFormSchema = z.object({
  ...profileFormBaseFields,
  department: z.string().trim().min(1, 'Department is required').max(120),
})

export type DirectorProfileFormValues = z.infer<typeof directorProfileFormSchema>
export type PortalProfileFormValues = z.infer<typeof portalProfileFormSchema>
export type ProfileFormValues = PortalProfileFormValues

export const profileFormDefaultValues: ProfileFormValues = {
  firstname: '',
  lastname: '',
  phone_number: '',
  gender: 'O',
  age: 18,
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
  gender: 'O',
  age: 18,
  address_street: '',
  address_barangay: '',
  address_city: '',
  address_province: '',
}

export function getProfileFormSchema(isDirector: boolean) {
  return isDirector ? directorProfileFormSchema : portalProfileFormSchema
}
