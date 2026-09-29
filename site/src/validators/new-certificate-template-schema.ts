import { z } from 'zod'
import { TEMPLATE_CATEGORY_ORDER } from '../constants/certificate-templates'

/**
 * A new template only needs enough to file it: the wording, artwork and signatories
 * are settled afterwards in the customizer, which is the one screen that owns them.
 */
export const newCertificateTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Template name is required')
    .max(80, 'Template name must not exceed 80 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Describe when this template is used')
    .max(160, 'Description must not exceed 160 characters'),
  category: z.enum(TEMPLATE_CATEGORY_ORDER),
  orientation: z.enum(['landscape', 'portrait']),
})

export type NewCertificateTemplateFormValues = z.infer<
  typeof newCertificateTemplateSchema
>
