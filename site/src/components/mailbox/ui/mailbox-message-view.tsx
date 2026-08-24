import { ArrowLeft, MailOpen, Paperclip, Reply } from 'lucide-react'
import {
  formatAttachmentSize,
  formatMailFullTimestamp,
} from '../../../constants/mailbox'
import type { MailDetail } from '../../../types/mailbox'

interface MailboxMessageViewProps {
  message: MailDetail
  onBack: () => void
  onReply: () => void
  onMarkUnread: () => void
}

export function MailboxMessageView({
  message,
  onBack,
  onReply,
  onMarkUnread,
}: MailboxMessageViewProps) {
  const initial = (message.fromName || message.fromEmail).charAt(0).toUpperCase()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-[var(--cares-border)] px-4 py-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to the message list"
            className="rounded-[var(--cares-radius)] p-1 text-[var(--cares-muted)] transition hover:bg-[var(--cares-bg)] hover:text-[var(--cares-body)] md:hidden"
          >
            <ArrowLeft size={15} />
          </button>

          <h2 className="min-w-0 flex-1 text-sm font-semibold text-[var(--cares-heading)]">
            {message.subject}
          </h2>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onMarkUnread}
              className="inline-flex items-center gap-1.5 rounded-[var(--cares-radius)] px-2 py-1.5 text-[11px] text-[var(--cares-body)] transition hover:bg-[var(--cares-bg)]"
            >
              <MailOpen size={13} />
              Mark unread
            </button>
            <button
              type="button"
              onClick={onReply}
              className="inline-flex items-center gap-1.5 rounded-[var(--cares-radius)] bg-[var(--cares-primary)] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:opacity-90"
            >
              <Reply size={13} />
              Reply
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cares-bg)] text-xs font-semibold text-[var(--cares-primary)]">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--cares-heading)]">
              {message.fromName || message.fromEmail}
              <span className="ml-1.5 font-normal text-[var(--cares-muted)]">
                &lt;{message.fromEmail}&gt;
              </span>
            </p>
            <p className="truncate text-[11px] text-[var(--cares-muted)]">
              to {message.to.join(', ') || 'me'}
              {message.cc.length > 0 && ` · cc ${message.cc.join(', ')}`}
              {' · '}
              {formatMailFullTimestamp(message.receivedAt)}
            </p>
          </div>
        </div>
      </header>

      {/* HTML mail scrolls inside its own frame; plain text scrolls in this pane. */}
      <div
        className={`min-h-0 flex-1 ${message.bodyHtml ? 'overflow-hidden' : 'overflow-y-auto'}`}
      >
        {message.bodyHtml ? (
          /**
           * Mail is third-party HTML. It is sanitised on the server and then rendered in
           * a fully sandboxed frame — no scripts, no forms, no access to the portal — so
           * neither layer alone has to be perfect.
           */
          <iframe
            title={`Message: ${message.subject}`}
            sandbox=""
            srcDoc={message.bodyHtml}
            className="block h-full w-full border-0 bg-white"
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words p-4 font-sans text-xs leading-relaxed text-[var(--cares-body)]">
            {message.bodyText}
          </pre>
        )}
      </div>

      {message.attachments.length > 0 && (
        <footer className="shrink-0 border-t border-[var(--cares-border)] px-4 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cares-muted)]">
            {message.attachments.length} attachment
            {message.attachments.length > 1 ? 's' : ''}
          </p>
          <ul className="flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="inline-flex items-center gap-1.5 rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-bg)] px-2 py-1 text-[11px] text-[var(--cares-body)]"
              >
                <Paperclip size={11} className="text-[var(--cares-muted)]" />
                <span className="max-w-[180px] truncate">{attachment.filename}</span>
                <span className="text-[var(--cares-muted)]">
                  {formatAttachmentSize(attachment.size)}
                </span>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </div>
  )
}
