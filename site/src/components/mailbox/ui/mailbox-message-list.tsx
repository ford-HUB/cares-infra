import { Loader2, RefreshCw, Search, X } from 'lucide-react'
import {
  MAILBOX_EMPTY_BODY,
  MAILBOX_EMPTY_TITLE,
  MAILBOX_SEARCH_PLACEHOLDER,
} from '../../../constants/mailbox'
import type { MailSummary } from '../../../types/mailbox'
import { MailboxListSkeleton } from './mailbox-list-skeleton'
import { MailboxMessageRow } from './mailbox-message-row'

interface MailboxMessageListProps {
  messages: MailSummary[]
  selectedId: string | null
  loading: boolean
  initialized: boolean
  loadingMore: boolean
  hasMore: boolean
  searchDraft: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onClearSearch: () => void
  onSelect: (id: string) => void
  onRefresh: () => void
  onLoadMore: () => void
}

export function MailboxMessageList({
  messages,
  selectedId,
  loading,
  initialized,
  loadingMore,
  hasMore,
  searchDraft,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onSelect,
  onRefresh,
  onLoadMore,
}: MailboxMessageListProps) {
  // A refetch keeps the rows that are already on screen; only a cold list skeletons.
  const showSkeleton = !initialized || (loading && messages.length === 0)

  return (
    <section className="flex w-full min-w-0 shrink-0 flex-col border-b border-[var(--cares-border)] md:w-80 md:border-b-0 md:border-r lg:w-96">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--cares-border)] px-3 py-2.5">
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            onSearchSubmit()
          }}
        >
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cares-muted)]"
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={MAILBOX_SEARCH_PLACEHOLDER}
            className="w-full rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-bg)] py-1.5 pl-8 pr-7 text-xs text-[var(--cares-body)] outline-none focus:border-[var(--cares-primary)]"
          />
          {searchDraft && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--cares-muted)] hover:text-[var(--cares-body)]"
            >
              <X size={13} />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh"
          className="shrink-0 rounded-[var(--cares-radius)] p-1.5 text-[var(--cares-muted)] transition hover:bg-[var(--cares-bg)] hover:text-[var(--cares-body)] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
        {showSkeleton ? (
          <MailboxListSkeleton />
        ) : messages.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-xs font-semibold text-[var(--cares-heading)]">
              {MAILBOX_EMPTY_TITLE}
            </p>
            <p className="mt-1 text-[11px] text-[var(--cares-muted)]">
              {MAILBOX_EMPTY_BODY}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MailboxMessageRow
                key={message.id}
                message={message}
                active={message.id === selectedId}
                onSelect={onSelect}
              />
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 py-3 text-xs text-[var(--cares-primary)] transition hover:bg-[var(--cares-bg)] disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={13} className="animate-spin" />}
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
