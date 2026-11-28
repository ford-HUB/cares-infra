import { z } from 'zod'

export const newEvaluationFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Questionnaire title is required')
    .max(200, 'Title must not exceed 200 characters'),
})

export type NewEvaluationFormValues = z.infer<typeof newEvaluationFormSchema>
