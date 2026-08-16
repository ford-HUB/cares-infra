import { ChatWorkspace } from '../../components/chat/chat-workspace'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { useChatWorkspace } from '../../hooks/use-chat-workspace'

export function ChatPage() {
  const workspace = useChatWorkspace()

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <div className="mb-3 shrink-0">
        <h1 className="text-xl font-bold text-[var(--cares-heading)]">Chat</h1>
        <p className="text-xs text-[var(--cares-muted)]">
          Message administrators, directors, and coordinators across the portal.
        </p>
      </div>
      <ChatWorkspace {...workspace} />
    </ContentShell>
  )
}
