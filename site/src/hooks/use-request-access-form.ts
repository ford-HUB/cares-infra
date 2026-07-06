import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ADMIN_REQUEST_EMAIL,
  REQUEST_ACCESS_EMAIL_BODY,
} from '../constants/request-access'
import { LOGIN_PATH } from '../constants/routes'
import { submitRequestAccess } from '../services/request-access-service'
import { validateRequestAccessFiles } from '../utils/request-access-files'
import {
  requestAccessDefaultValues,
  requestAccessSchema,
  type RequestAccessFormValues,
} from '../validators/request-access-schema'

export function useRequestAccessForm() {
  const navigate = useNavigate()
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<RequestAccessFormValues>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      ...requestAccessDefaultValues,
      body: REQUEST_ACCESS_EMAIL_BODY,
    },
  })

  const addAttachments = (incoming: FileList | null) => {
    if (!incoming?.length) return
    const merged = [...attachments, ...Array.from(incoming)]
    const validation = validateRequestAccessFiles(merged)
    if (!validation.valid) {
      setAttachmentError(validation.message ?? 'Invalid file')
      return
    }
    setAttachmentError(null)
    setAttachments(merged)
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    setAttachmentError(null)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const fileCheck = validateRequestAccessFiles(attachments)
    if (!fileCheck.valid) {
      setAttachmentError(fileCheck.message ?? 'Invalid attachments')
      return
    }

    setSubmitting(true)
    const res = await submitRequestAccess({
      fromEmail: values.fromEmail,
      toEmail: ADMIN_REQUEST_EMAIL,
      subject: values.subject,
      body: values.body,
      attachments,
    })
    setSubmitting(false)

    if (res.success) {
      toast.success(res.message)
      navigate(LOGIN_PATH)
      return
    }

    toast.error(res.message)
  })

  return {
    form,
    onSubmit,
    submitting,
    attachments,
    attachmentError,
    addAttachments,
    removeAttachment,
    toEmail: ADMIN_REQUEST_EMAIL,
  }
}
