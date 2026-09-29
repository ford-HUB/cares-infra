import { Skeleton } from '@/components/ui/skeleton'
import {
  MAILBOX_NO_SELECTION_BODY,
  MAILBOX_NO_SELECTION_TITLE,
} from '../../constants/mailbox'
import type { useMailboxWorkspace } from '../../hooks/use-mailbox-workspace'
import { MailboxConnectPanel } from './mailbox-connect-panel'
import { MailboxAccountBar } from './ui/mailbox-account-bar'
import { MailboxComposer } from './ui/mailbox-composer'
import { MailboxFolderSidebar } from './ui/mailbox-folder-sidebar'
import { MailboxMessageList } from './ui/mailbox-message-list'
import { MailboxMessageSkeleton } from './ui/mailbox-message-skeleton'
import { MailboxMessageView } from './ui/mailbox-message-view'

type MailboxWorkspaceProps = ReturnType<typeof useMailboxWorkspace>

export function MailboxWorkspace({
  connected,
  connectedEmail,
  initialized,
  connecting,
  disconnecting,
  folder,
  messages,
  listLoading,
  listInitialized,
  hasNextPage,
  hasPreviousPage,
  searchDraft,
  setSearchDraft,
  selectedId,
  detail,
  detailLoading,
  error,
  composer,
  onConnect,
  onDisconnect,
  onSelectFolder,
  onSelectMessage,
  onClearSelection,
  onMarkUnread,
  onRefresh,
  onNextPage,
  onPreviousPage,
  onSearchSubmit,
  onClearSearch,
}: MailboxWorkspaceProps) {
  // The connect screen and the mailbox look nothing alike, so the first check waits.
  if (!initialized) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-card)] p-4 shadow-sm">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-72" />
        <Skeleton className="min-h-0 flex-1" />
      </div>
    )
  }

  if (!connected) {
    return (
      <MailboxConnectPanel
        connecting={connecting}
        error={error}
        onConnect={onConnect}
      />
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-card)] shadow-sm">
      <MailboxAccountBar
        email={connectedEmail}
        disconnecting={disconnecting}
        onDisconnect={onDisconnect}
      />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <MailboxFolderSidebar
          folder={folder}
          disabled={disconnecting}
          onSelect={onSelectFolder}
          onCompose={composer.openNew}
        />

        {/* On mobile the reading pane replaces the list rather than sitting beside it. */}
        {/* Fixed width and `min-h-0` so the list scrolls inside the card, never past it. */}
        <div
          className={`min-h-0 w-full flex-1 flex-col md:w-80 md:flex-none lg:w-96 ${selectedId ? 'hidden md:flex' : 'flex'}`}
        >
          <MailboxMessageList
            messages={messages}
            selectedId={selectedId}
            loading={listLoading}
            initialized={listInitialized}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            searchDraft={searchDraft}
            onSearchChange={setSearchDraft}
            onSearchSubmit={onSearchSubmit}
            onClearSearch={onClearSearch}
            onSelect={onSelectMessage}
            onRefresh={onRefresh}
            onNextPage={onNextPage}
            onPreviousPage={onPreviousPage}
          />
        </div>

        <section
          className={`min-h-0 min-w-0 flex-1 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}
        >
          {detailLoading && <MailboxMessageSkeleton />}

          {!detailLoading && detail && (
            <MailboxMessageView
              message={detail}
              onBack={onClearSelection}
              onReply={() => composer.openReply(detail)}
              onMarkUnread={() => onMarkUnread(detail.id)}
            />
          )}

          {!detailLoading && !detail && (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
              <div>
                <p className="text-xs font-semibold text-[var(--cares-heading)]">
                  {MAILBOX_NO_SELECTION_TITLE}
                </p>
                <p className="mt-1 text-[11px] text-[var(--cares-muted)]">
                  {MAILBOX_NO_SELECTION_BODY}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <MailboxComposer {...composer} />
    </div>
  )
}
