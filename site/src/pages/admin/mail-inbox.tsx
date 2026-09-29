import { MailboxWorkspace } from '../../components/mailbox/mailbox-workspace'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { useMailboxWorkspace } from '../../hooks/use-mailbox-workspace'

export function MailInboxPage() {
  const workspace = useMailboxWorkspace()

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <div className="mb-3 shrink-0">
        <h1 className="text-xl font-bold text-[var(--cares-heading)]">Mail Inbox</h1>
        <p className="text-xs text-[var(--cares-muted)]">
          Read and reply to mail from your connected Google account.
        </p>
      </div>
      <MailboxWorkspace {...workspace} />
    </ContentShell>
  )
}
