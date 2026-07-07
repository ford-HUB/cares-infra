import { z } from 'zod'

export const changeEmailSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_email: z
    .string()
    .trim()
    .min(1, 'New email is required')
    .email('Enter a valid email address'),
})

export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>

export const changeEmailDefaultValues: ChangeEmailFormValues = {
  current_password: '',
  new_email: '',
}
