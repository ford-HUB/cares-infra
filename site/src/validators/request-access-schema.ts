import { z } from 'zod'
import { REQUEST_ACCESS_SUBJECT } from '../constants/request-access'

export const requestAccessSchema = z.object({
  fromEmail: z.string().email('Enter a valid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(20, 'Please complete the message body'),
})

export type RequestAccessFormValues = z.infer<typeof requestAccessSchema>

export const requestAccessDefaultValues: RequestAccessFormValues = {
  fromEmail: '',
  subject: REQUEST_ACCESS_SUBJECT,
  body: '',
}
