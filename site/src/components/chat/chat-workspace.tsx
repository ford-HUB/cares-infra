import type { useChatWorkspace } from '../../hooks/use-chat-workspace'
import { ChatComposer } from './ui/chat-composer'
import { ChatConversation } from './ui/chat-conversation'
import { ChatEmptyState } from './ui/chat-empty-state'
import { ChatRoleSidebar } from './ui/chat-role-sidebar'

type ChatWorkspaceProps = ReturnType<typeof useChatWorkspace>

export function ChatWorkspace({
  groups,
  threads,
  search,
  setSearch,
  activeContact,
  activeContactId,
  activeMessages,
  currentUserId,
  presenceOf,
  hasHistory,
  draft,
  setDraft,
  attachments,
  addAttachments,
  removeAttachment,
  handleSend,
  loading,
  messagesLoading,
  sending,
  onSelect,
}: ChatWorkspaceProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-card)] shadow-sm md:flex-row">
      <ChatRoleSidebar
        groups={groups}
        threads={threads}
        activeContactId={activeContactId}
        presenceOf={presenceOf}
        search={search}
        loading={loading}
        onSearchChange={setSearch}
        onSelect={onSelect}
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {activeContact ? (
          <>
            <ChatConversation
              contact={activeContact}
              presence={presenceOf(activeContact.id)}
              messages={activeMessages}
              currentUserId={currentUserId}
              hasHistory={hasHistory}
              loading={messagesLoading}
            />
            <ChatComposer
              value={draft}
              attachments={attachments}
              disabled={messagesLoading}
              sending={sending}
              onChange={setDraft}
              onAttach={addAttachments}
              onRemoveAttachment={removeAttachment}
              onSend={() => void handleSend()}
            />
          </>
        ) : (
          <ChatEmptyState variant="no-selection" />
        )}
      </section>
    </div>
  )
}
