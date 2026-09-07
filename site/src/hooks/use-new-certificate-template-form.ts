import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useCertificateTemplateStore } from '../store/certificate-template-store'
import type { CertificateTemplate } from '../types/certificate-template'
import {
  newCertificateTemplateSchema,
  type NewCertificateTemplateFormValues,
} from '../validators/new-certificate-template-schema'

const EMPTY: NewCertificateTemplateFormValues = {
  name: '',
  description: '',
  category: 'participation',
  orientation: 'landscape',
}

/**
 * Owns the "new template" form. The created template is handed back so the page can
 * open the customizer on it — filing a template and designing it is one errand.
 */
export function useNewCertificateTemplateForm(
  open: boolean,
  onCreated: (template: CertificateTemplate) => void,
) {
  const createTemplate = useCertificateTemplateStore((state) => state.createTemplate)
  const saving = useCertificateTemplateStore((state) => state.saving)

  const form = useForm<NewCertificateTemplateFormValues>({
    resolver: zodResolver(newCertificateTemplateSchema),
    defaultValues: EMPTY,
    mode: 'onChange',
  })

  // Reopening starts on a blank form rather than the last abandoned draft.
  const { reset } = form
  useEffect(() => {
    if (open) reset(EMPTY)
  }, [open, reset])

  const submit = form.handleSubmit(async (values) => {
    try {
      const created = await createTemplate(values)
      toast.success(`${created.name} created — ${created.reference}`)
      onCreated(created)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'The template could not be created',
      )
    }
  })

  return { form, submit, saving }
}
