import { Loader2, Send, X } from 'lucide-react'
import { MAILBOX_COMPOSER_PLACEHOLDER } from '../../../constants/mailbox'
import type { useMailComposer } from '../../../hooks/use-mail-composer'

type MailboxComposerProps = ReturnType<typeof useMailComposer>

const fieldClass =
  'w-full rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-bg)] px-2.5 py-1.5 text-xs text-[var(--cares-body)] outline-none focus:border-[var(--cares-primary)]'

export function MailboxComposer({
  form,
  mode,
  sending,
  close,
  onSubmit,
}: MailboxComposerProps) {
  if (mode === 'closed') return null

  const { errors } = form.formState

  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/20 p-3 md:items-center">
      <form
        onSubmit={onSubmit}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-card)] shadow-lg"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--cares-border)] px-3 py-2">
          <h2 className="text-xs font-semibold text-[var(--cares-heading)]">
            {mode === 'reply' ? 'Reply' : 'New message'}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close the composer"
            className="rounded-[var(--cares-radius)] p-1 text-[var(--cares-muted)] transition hover:bg-[var(--cares-bg)] hover:text-[var(--cares-body)]"
          >
            <X size={14} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          <div>
            <input
              {...form.register('to')}
              placeholder="To"
              autoComplete="off"
              className={fieldClass}
            />
            {errors.to && (
              <p className="mt-1 text-[11px] text-red-600">{errors.to.message}</p>
            )}
          </div>

          <div>
            <input
              {...form.register('cc')}
              placeholder="Cc (optional)"
              autoComplete="off"
              className={fieldClass}
            />
            {errors.cc && (
              <p className="mt-1 text-[11px] text-red-600">{errors.cc.message}</p>
            )}
          </div>

          <div>
            <input
              {...form.register('subject')}
              placeholder="Subject"
              autoComplete="off"
              className={fieldClass}
            />
            {errors.subject && (
              <p className="mt-1 text-[11px] text-red-600">
                {errors.subject.message}
              </p>
            )}
          </div>

          <div>
            <textarea
              {...form.register('body')}
              rows={10}
              placeholder={MAILBOX_COMPOSER_PLACEHOLDER}
              className={`${fieldClass} resize-y leading-relaxed`}
            />
            {errors.body && (
              <p className="mt-1 text-[11px] text-red-600">{errors.body.message}</p>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--cares-border)] px-3 py-2">
          <button
            type="button"
            onClick={close}
            className="rounded-[var(--cares-radius)] px-3 py-1.5 text-xs text-[var(--cares-body)] transition hover:bg-[var(--cares-bg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-[var(--cares-radius)] bg-[var(--cares-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </footer>
      </form>
    </div>
  )
}
