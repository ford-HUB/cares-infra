import { z } from 'zod'

/** Recipients are typed as one comma-separated line, the way every mail client does it. */
export function parseEmailList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const singleEmail = z.string().email()

function isEmailList(value: string): boolean {
  const entries = parseEmailList(value)
  return entries.length > 0 && entries.every((entry) => singleEmail.safeParse(entry).success)
}

export const mailComposerSchema = z.object({
  to: z
    .string()
    .trim()
    .min(1, 'Add at least one recipient')
    .refine(isEmailList, 'Separate email addresses with commas'),
  cc: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || isEmailList(value),
      'Separate email addresses with commas',
    ),
  subject: z.string().trim().max(500, 'Subject is too long'),
  body: z.string().min(1, 'Write a message before sending'),
})

export type MailComposerFormValues = z.infer<typeof mailComposerSchema>

export const mailComposerDefaultValues: MailComposerFormValues = {
  to: '',
  cc: '',
  subject: '',
  body: '',
}
