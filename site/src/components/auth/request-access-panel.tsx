import { ArrowLeft, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LOGIN_PATH } from '../../config/auth-redirect'
import { useRequestAccessForm } from '../../hooks/use-request-access-form'
import { RegistrationGuidelines } from './registration-guidelines'
import { AttachmentUpload } from './ui/attachment-upload'
import { MessageBodyField } from './ui/message-body-field'

export function RequestAccessPanel() {
  const {
    form,
    onSubmit,
    submitting,
    attachments,
    attachmentError,
    addAttachments,
    removeAttachment,
    toEmail,
  } = useRequestAccessForm()

  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--cares-bg)] p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--cares-primary)] opacity-10" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[var(--cares-primary-hover)] opacity-15" />

      <Link
        to={LOGIN_PATH}
        className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-[var(--cares-primary)] hover:underline sm:top-6 sm:left-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to login
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <header className="mb-5 text-center">
          <img
            src="/transparent-logo.png"
            alt="CARES"
            className="mx-auto mb-3 h-10 w-10 object-contain"
          />
          <h1 className="text-lg font-bold text-[var(--cares-heading)]">
            Request administrator access
          </h1>
          <p className="mt-1 text-xs text-[var(--cares-muted)]">
            Complete the form — your request will be reviewed by an administrator.
          </p>
        </header>

        <div className="relative">
          <main className="rounded-lg border border-[var(--cares-border)] bg-white p-4 shadow-sm">
            <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="to-email" className="mb-0.5 block text-xs font-medium text-gray-700">
                    To
                  </label>
                  <input
                    id="to-email"
                    type="email"
                    readOnly
                    value={toEmail}
                    className="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="from-email"
                    className="mb-0.5 block text-xs font-medium text-gray-700"
                  >
                    Active email
                  </label>
                  <input
                    id="from-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@uclm.edu.ph"
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[var(--cares-primary)] focus:outline-none"
                    {...register('fromEmail')}
                  />
                  {errors.fromEmail && (
                    <p className="mt-0.5 text-[10px] text-red-600">{errors.fromEmail.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="mb-0.5 block text-xs font-medium text-gray-700">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[var(--cares-primary)] focus:outline-none"
                  {...register('subject')}
                />
                {errors.subject && (
                  <p className="mt-0.5 text-[10px] text-red-600">{errors.subject.message}</p>
                )}
              </div>

              <MessageBodyField
                registration={register('body')}
                error={errors.body?.message}
              />

              <AttachmentUpload
                files={attachments}
                error={attachmentError}
                onAdd={addAttachments}
                onRemove={removeAttachment}
              />

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--cares-primary)] py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--cares-primary-hover)] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Submitting...' : 'Submit access request'}
              </button>
            </form>
          </main>

          <RegistrationGuidelines />
        </div>
      </div>
    </div>
  )
}
