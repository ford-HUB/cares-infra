import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { formatFileSize } from '../constants/formatting'
import {
  REPORT_DOCUMENT_MAX_BYTES,
  REPORT_DOCUMENT_MAX_COUNT,
} from '../constants/monthly-report'
import { parseApiError } from '../services/api-client'
import { useAuthStore } from '../store/auth-store'
import { useMonthlyReportStore } from '../store/monthly-report-store'
import type { MonthlyReportAttachment } from '../services/monthly-report-service'
import {
  uploadReportDefaultValues,
  uploadReportSchema,
  type UploadReportFormValues,
} from '../validators/upload-report-schema'

/** `File` → `data:<mime>;base64,...`, the shape the server takes attachments in. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`${file.name} could not be read`))
    reader.readAsDataURL(file)
  })
}

/**
 * The coordinator's upload form plus their own slice of the board. Files are held
 * as `File`s and only encoded on submit, so picking a large attachment costs
 * nothing until the rest of the form checks out.
 */
export function useUploadReportForm() {
  const user = useAuthStore((s) => s.user)
  const reports = useMonthlyReportStore((s) => s.reports)
  const submit = useMonthlyReportStore((s) => s.submit)

  const [submitting, setSubmitting] = useState(false)

  const form = useForm<UploadReportFormValues>({
    resolver: zodResolver(uploadReportSchema),
    defaultValues: uploadReportDefaultValues,
  })

  const documents = useWatch({ control: form.control, name: 'documents' })

  /** Only what this coordinator sent, newest movement first. */
  const mine = useMemo(() => {
    const email = user?.email.trim().toLowerCase()
    if (!email) return []
    return reports
      .filter((report) => report.submittedBy.email.trim().toLowerCase() === email)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [reports, user?.email])

  const addFiles = (picked: FileList | File[]) => {
    const current = form.getValues('documents')
    const next = [...current]

    for (const file of Array.from(picked)) {
      if (next.length >= REPORT_DOCUMENT_MAX_COUNT) {
        toast.error(`Up to ${REPORT_DOCUMENT_MAX_COUNT} files per report`)
        break
      }
      if (file.size > REPORT_DOCUMENT_MAX_BYTES) {
        toast.error(
          `${file.name} is over ${formatFileSize(REPORT_DOCUMENT_MAX_BYTES)}`,
        )
        continue
      }
      // The same file picked twice is the same attachment, not two.
      if (next.some((one) => one.name === file.name && one.size === file.size)) continue
      next.push(file)
    }

    form.setValue('documents', next, { shouldDirty: true, shouldValidate: true })
  }

  const removeFile = (index: number) => {
    const current = form.getValues('documents')
    form.setValue(
      'documents',
      current.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      const attachments: MonthlyReportAttachment[] = await Promise.all(
        values.documents.map(async (file: File) => ({
          fileName: file.name,
          content: await readAsDataUrl(file),
        })),
      )

      const created = await submit({
        title: values.title,
        period: values.period,
        department: values.department,
        summary: values.summary,
        metrics: values.metrics,
        documents: attachments,
      })

      toast.success(`${created.reference} sent to the director for review`)
      // Keep the department — a coordinator files for the same college every month.
      form.reset({ ...uploadReportDefaultValues, department: values.department })
    } catch (error) {
      toast.error(parseApiError(error))
    } finally {
      setSubmitting(false)
    }
  })

  return {
    form,
    documents,
    submitting,
    mine,
    addFiles,
    removeFile,
    onSubmit,
  }
}
