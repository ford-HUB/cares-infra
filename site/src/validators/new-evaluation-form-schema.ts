import { z } from 'zod'

/**
 * A new questionnaire only needs a name to be filed. The header, the questions and
 * their typography are settled afterwards in the builder, which owns them.
 */
export const newEvaluationFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Questionnaire title is required')
    .max(200, 'Title must not exceed 200 characters'),
})

export type NewEvaluationFormValues = z.infer<typeof newEvaluationFormSchema>
