import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { MAILBOX_SENT_TOAST, replySubject } from '../constants/mailbox'
import { useMailboxStore } from '../store/mailbox-store'
import type { MailDetail } from '../types/mailbox'
import {
  mailComposerDefaultValues,
  mailComposerSchema,
  parseEmailList,
  type MailComposerFormValues,
} from '../validators/mail-composer-schema'

export type MailComposerMode = 'closed' | 'new' | 'reply'

interface ThreadContext {
  threadId?: string
  inReplyTo?: string
}

/**
 * Owns the compose/reply form. Thread context sits outside the form because it is never
 * edited — it only decides whether Gmail files the send as a new conversation or as a
 * reply inside the original thread.
 */
export function useMailComposer() {
  const send = useMailboxStore((s) => s.send)
  const sending = useMailboxStore((s) => s.sending)

  const [mode, setMode] = useState<MailComposerMode>('closed')
  const [threadContext, setThreadContext] = useState<ThreadContext>({})

  const form = useForm<MailComposerFormValues>({
    resolver: zodResolver(mailComposerSchema),
    defaultValues: mailComposerDefaultValues,
  })

  const close = () => {
    setThreadContext({})
    form.reset(mailComposerDefaultValues)
    setMode('closed')
  }

  const openNew = () => {
    setThreadContext({})
    form.reset(mailComposerDefaultValues)
    setMode('new')
  }

  const openReply = (message: MailDetail) => {
    setThreadContext({
      threadId: message.threadId,
      inReplyTo: message.messageIdHeader ?? undefined,
    })
    form.reset({
      to: message.fromEmail,
      cc: '',
      subject: replySubject(message.subject),
      body: '',
    })
    setMode('reply')
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const sent = await send({
      to: parseEmailList(values.to),
      cc: parseEmailList(values.cc),
      subject: values.subject,
      body: values.body,
      ...threadContext,
    })

    if (!sent) {
      toast.error(useMailboxStore.getState().error ?? 'Could not send the message')
      return
    }

    toast.success(MAILBOX_SENT_TOAST)
    close()
  })

  return { form, mode, sending, openNew, openReply, close, onSubmit }
}
