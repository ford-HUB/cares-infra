import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { MAX_SIGNATORIES, createSignatory } from '../constants/certificate-design'
import { DEFAULT_CERTIFICATE_FONT } from '../constants/certificate-fonts'
import { DEFAULT_CERTIFICATE_SEAL } from '../constants/certificate-seals'
import { useCertificateTemplateStore } from '../store/certificate-template-store'
import type {
  CertificateTemplate,
  SignatoryCoordinator,
} from '../types/certificate-template'
import {
  certificateTemplateSchema,
  type CertificateTemplateFormValues,
} from '../validators/certificate-template-schema'

function toFormValues(template: CertificateTemplate): CertificateTemplateFormValues {
  return {
    name: template.name,
    description: template.description,
    category: template.category,
    status: template.status,
    orientation: template.orientation,
    accent: template.design.accent,
    frame: template.design.frame,
    frameSvgUrl: template.design.frameSvgUrl,
    frameSvgName: template.design.frameSvgName,
    layout: template.design.layout,
    font: template.design.font ?? DEFAULT_CERTIFICATE_FONT,
    elementFonts: template.design.elementFonts ?? {},
    elementSizes: template.design.elementSizes ?? {},
    elementWidths: template.design.elementWidths ?? {},
    elementHeights: template.design.elementHeights ?? {},
    elementAligns: template.design.elementAligns ?? {},
    headline: template.design.headline,
    body: template.design.body,
    showSeal: template.design.showSeal,
    sealLabel: template.design.sealLabel,
    sealStyle: template.design.sealStyle ?? DEFAULT_CERTIFICATE_SEAL,
    sealAccent: template.design.sealAccent,
    sealSvgUrl: template.design.sealSvgUrl,
    sealSvgName: template.design.sealSvgName,
    images: template.design.images,
    signatories: template.design.signatories,
  }
}

/**
 * Owns the template customizer: the form, its signatory rows, and the save that folds
 * the flat form back into the template's `design`. The form is the single source for
 * the live preview, so every keystroke is what the certificate will look like.
 */
export function useCertificateTemplateForm(
  template: CertificateTemplate,
  onSaved: () => void,
) {
  const saveTemplate = useCertificateTemplateStore((state) => state.saveTemplate)
  const saving = useCertificateTemplateStore((state) => state.saving)

  const form = useForm<CertificateTemplateFormValues>({
    resolver: zodResolver(certificateTemplateSchema),
    defaultValues: toFormValues(template),
    mode: 'onChange',
  })

  const signatories = useFieldArray({ control: form.control, name: 'signatories' })

  // Opening the customizer on a different template reloads the form rather than
  // leaving the previous template's wording in the fields.
  const { reset } = form
  useEffect(() => {
    reset(toFormValues(template))
  }, [template, reset])

  // The picker offers the whole directory; the same account is never added twice.
  const addSignatory = (coordinator: SignatoryCoordinator) => {
    if (signatories.fields.length >= MAX_SIGNATORIES) return
    if (signatories.fields.some((one) => one.coordinatorId === coordinator.id)) return
    signatories.append(createSignatory(coordinator))
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      await saveTemplate(template.id, {
        name: values.name,
        description: values.description,
        category: values.category,
        status: values.status,
        orientation: values.orientation,
        design: {
          accent: values.accent,
          frame: values.frame,
          frameSvgUrl: values.frameSvgUrl,
          frameSvgName: values.frameSvgName,
          layout: values.layout,
          font: values.font,
          elementFonts: values.elementFonts,
          elementSizes: values.elementSizes,
          elementWidths: values.elementWidths,
          elementHeights: values.elementHeights,
          elementAligns: values.elementAligns,
          headline: values.headline,
          body: values.body,
          showSeal: values.showSeal,
          sealLabel: values.sealLabel,
          sealStyle: values.sealStyle,
          sealAccent: values.sealAccent,
          sealSvgUrl: values.sealSvgUrl,
          sealSvgName: values.sealSvgName,
          images: values.images,
          signatories: values.signatories,
        },
      })
      toast.success(`${values.name} saved`)
      onSaved()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'The template could not be saved',
      )
    }
  })

  return { form, signatories, addSignatory, submit, saving }
}
