import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { formatFileSize } from '../constants/formatting'
import {
  REPORT_DOCUMENT_MAX_BYTES,
  REPORT_DOCUMENT_MAX_COUNT,
  reportDocumentKindFor,
  type UploadReportStep,
} from '../constants/monthly-report'
import { parseApiError } from '../services/api-client'
import { useAuthStore } from '../store/auth-store'
import { useMonthlyReportStore } from '../store/monthly-report-store'
import type { ReportDocumentKind } from '../types/monthly-report'
import {
  uploadReportDefaultValues,
  uploadReportSchema,
  type UploadReportFormValues,
} from '../validators/upload-report-schema'

/**
 * One file on the upload page. It is read into a data URL as soon as it is picked,
 * and the read is what the progress bar shows — by the time the coordinator presses
 * Submit every file is already encoded and the post is one JSON body.
 */
export interface UploadAttachment {
  id: string
  file: File
  kind: ReportDocumentKind
  /** 0–100 while the file is being read; 100 once `content` is set. */
  progress: number
  /** `data:<mime>;base64,...` once the read finishes. */
  content: string | null
  error: string | null
}

/** Fields the first page owns — validated before the coordinator moves on. */
const DETAILS_FIELDS = ['title', 'period', 'department', 'summary', 'metrics'] as const

function attachmentId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

export function useUploadReportForm() {
  const user = useAuthStore((s) => s.user)
  const reports = useMonthlyReportStore((s) => s.reports)
  const submit = useMonthlyReportStore((s) => s.submit)

  const [step, setStep] = useState<UploadReportStep>('details')
  const [attachments, setAttachments] = useState<UploadAttachment[]>([])
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<UploadReportFormValues>({
    resolver: zodResolver(uploadReportSchema),
    defaultValues: uploadReportDefaultValues,
  })

  /** Only what this coordinator sent, newest movement first. */
  const mine = useMemo(() => {
    const email = user?.email.trim().toLowerCase()
    if (!email) return []
    return reports
      .filter((report) => report.submittedBy.email.trim().toLowerCase() === email)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [reports, user?.email])

  const patchAttachment = (id: string, patch: Partial<UploadAttachment>) =>
    setAttachments((current) =>
      current.map((one) => (one.id === id ? { ...one, ...patch } : one)),
    )

  /** Encodes one file, reporting progress as the browser reads it. */
  const readAttachment = (attachment: UploadAttachment) => {
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (!event.lengthComputable) return
      patchAttachment(attachment.id, {
        progress: Math.min(99, Math.round((event.loaded / event.total) * 100)),
      })
    }
    reader.onload = () =>
      patchAttachment(attachment.id, { progress: 100, content: String(reader.result) })
    reader.onerror = () =>
      patchAttachment(attachment.id, {
        progress: 0,
        error: 'This file could not be read — remove it and try again.',
      })
    reader.readAsDataURL(attachment.file)
  }

  const addFiles = (picked: FileList | File[]) => {
    const accepted: UploadAttachment[] = []
    let count = attachments.length

    for (const file of Array.from(picked)) {
      if (count >= REPORT_DOCUMENT_MAX_COUNT) {
        toast.error(`Up to ${REPORT_DOCUMENT_MAX_COUNT} files per report`)
        break
      }
      const kind = reportDocumentKindFor(file)
      if (!kind) {
        toast.error(`${file.name} is not a PDF, Word document or image`)
        continue
      }
      if (file.size > REPORT_DOCUMENT_MAX_BYTES) {
        toast.error(`${file.name} is over ${formatFileSize(REPORT_DOCUMENT_MAX_BYTES)}`)
        continue
      }
      const id = attachmentId(file)
      // The same file picked twice is the same attachment, not two.
      if (attachments.some((one) => one.id === id) || accepted.some((one) => one.id === id)) {
        continue
      }
      accepted.push({ id, file, kind, progress: 0, content: null, error: null })
      count += 1
    }

    if (accepted.length === 0) return
    setAttachments((current) => [...current, ...accepted])
    accepted.forEach(readAttachment)
  }

  const removeFile = (id: string) =>
    setAttachments((current) => current.filter((one) => one.id !== id))

  const goToFiles = async () => {
    const valid = await form.trigger([...DETAILS_FIELDS])
    if (valid) setStep('files')
  }

  const goToDetails = () => setStep('details')

  const ready = attachments.filter((one) => one.content !== null)
  const stillReading = attachments.some((one) => one.content === null && !one.error)
  const canSubmit = ready.length > 0 && !stillReading && !submitting

  const onSubmit = form.handleSubmit(async (values) => {
    if (ready.length === 0) {
      toast.error('Attach at least one report file')
      return
    }

    setSubmitting(true)
    try {
      const created = await submit({
        title: values.title,
        period: values.period,
        department: values.department,
        summary: values.summary,
        metrics: values.metrics,
        documents: ready.map((one) => ({ fileName: one.file.name, content: one.content! })),
      })

      toast.success(`${created.reference} sent to the director for review`)
      // Keep the department — a coordinator files for the same college every month.
      form.reset({ ...uploadReportDefaultValues, department: values.department })
      setAttachments([])
      setStep('details')
    } catch (error) {
      toast.error(parseApiError(error))
    } finally {
      setSubmitting(false)
    }
  })

  return {
    form,
    step,
    attachments,
    submitting,
    canSubmit,
    mine,
    addFiles,
    removeFile,
    goToFiles,
    goToDetails,
    onSubmit,
  }
}
