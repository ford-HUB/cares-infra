import { FileText, Mail, Send, User } from 'lucide-react'
import { useRequestAccessForm } from '../../hooks/use-request-access-form'
import { AttachmentUpload } from './ui/attachment-upload'
import { AuthModalHeader } from './ui/auth-modal-header'
import { cn } from '@/lib/utils'
import { MessageBodyField } from './ui/message-body-field'
import { modalReveal } from './ui/modal-reveal'
import { REQUEST_FIELD_INPUT, RequestFieldLabel } from './ui/request-field-label'

interface RequestAccessPanelProps {
  /** Switches the modal to sign-in; also runs once a request is sent. */
  onSignIn: () => void
}

/** Request-access card body; it sits inside the auth modal over the landing page. */
export function RequestAccessPanel({ onSignIn }: RequestAccessPanelProps) {
  const {
    form,
    onSubmit,
    submitting,
    attachments,
    attachmentError,
    addAttachments,
    removeAttachment,
    toEmail,
  } = useRequestAccessForm(onSignIn)

  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="px-5 py-6">
      <AuthModalHeader
        title="Request Administrator Access"
        description="Please complete the form to submit your request for administrator review."
        dividerLabel="Access request"
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div {...modalReveal(3)}>
            <RequestFieldLabel icon={User} htmlFor="to-email">
              To
            </RequestFieldLabel>
            <input
              id="to-email"
              type="email"
              readOnly
              value={toEmail}
              className={`${REQUEST_FIELD_INPUT} cursor-not-allowed text-gray-700`}
            />
          </div>

          <div {...modalReveal(4)}>
            <RequestFieldLabel icon={Mail} htmlFor="from-email">
              Active email
            </RequestFieldLabel>
            <input
              id="from-email"
              type="email"
              autoComplete="email"
              placeholder="you@uclm.edu.ph"
              className={REQUEST_FIELD_INPUT}
              {...register('fromEmail')}
            />
            {errors.fromEmail && (
              <p className="mt-0.5 text-[10px] text-red-600">{errors.fromEmail.message}</p>
            )}
          </div>
        </div>

        <div {...modalReveal(5)}>
          <RequestFieldLabel icon={FileText} htmlFor="subject">
            Subject
          </RequestFieldLabel>
          <input
            id="subject"
            type="text"
            className={REQUEST_FIELD_INPUT}
            {...register('subject')}
          />
          {errors.subject && (
            <p className="mt-0.5 text-[10px] text-red-600">{errors.subject.message}</p>
          )}
        </div>

        <div {...modalReveal(6)}>
          <MessageBodyField registration={register('body')} error={errors.body?.message} />
        </div>

        <div {...modalReveal(7)}>
          <AttachmentUpload
            files={attachments}
            error={attachmentError}
            onAdd={addAttachments}
            onRemove={removeAttachment}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={modalReveal(8).style}
          className={cn(modalReveal(8).className, 'mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-gradient-to-b from-green-700 to-[var(--cares-primary)] py-3 text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(20,83,45,0.7),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[filter,box-shadow] duration-300 hover:brightness-110 disabled:opacity-60')}
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting...' : 'Submit access request'}
        </button>
      </form>

      <p
        className={cn('mt-4 text-center text-xs text-[var(--cares-muted)]', modalReveal(9).className)}
        style={modalReveal(9).style}
      >
        Already approved?{' '}
        <button
          type="button"
          onClick={onSignIn}
          className="font-semibold text-[var(--cares-primary)] hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}
