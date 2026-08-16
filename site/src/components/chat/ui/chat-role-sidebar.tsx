import { Search, Users } from 'lucide-react'
import { Skeleton } from '../../ui/skeleton'
import { CHAT_SEARCH_PLACEHOLDER } from '../../../constants/chat'
import type {
  ChatPresence,
  ChatRoleGroup,
  ChatThreadSummary,
} from '../../../types/chat'
import { ChatContactRow } from './chat-contact-row'

interface ChatRoleSidebarProps {
  groups: ChatRoleGroup[]
  threads: ChatThreadSummary[]
  activeContactId: string | null
  presenceOf: (contactId: string) => ChatPresence
  search: string
  loading: boolean
  onSearchChange: (value: string) => void
  onSelect: (contactId: string) => void
}

export function ChatRoleSidebar({
  groups,
  threads,
  activeContactId,
  presenceOf,
  search,
  loading,
  onSearchChange,
  onSelect,
}: ChatRoleSidebarProps) {
  const threadFor = (contactId: string) =>
    threads.find((thread) => thread.contactId === contactId)

  return (
    <aside className="flex max-h-[45%] w-full min-h-0 flex-col border-b border-[var(--cares-border)] bg-[var(--cares-card)] md:max-h-none md:w-64 md:shrink-0 md:border-b-0 md:border-r lg:w-72">
      <div className="shrink-0 border-b border-[var(--cares-border)] px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-[var(--cares-heading)]">
          <Users size={14} className="text-[var(--cares-primary)]" />
          Administrator roles
        </h2>
        <div className="relative mt-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cares-muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={CHAT_SEARCH_PLACEHOLDER}
            className="w-full rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-bg)] py-1.5 pl-8 pr-2.5 text-xs text-[var(--cares-body)] outline-none focus:border-[var(--cares-primary)]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2.5 px-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading &&
          groups.map((group) => (
            <section key={group.id} className="mb-3 last:mb-0">
              <header className="px-2 pb-1">
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cares-muted)]">
                  {group.label}
                </h3>
                <p className="text-[10px] leading-tight text-[var(--cares-muted)]">
                  {group.description}
                </p>
              </header>
              <div className="space-y-0.5">
                {group.contacts.map((contact) => (
                  <ChatContactRow
                    key={contact.id}
                    contact={contact}
                    thread={threadFor(contact.id)}
                    presence={presenceOf(contact.id)}
                    active={contact.id === activeContactId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          ))}

        {!loading && groups.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-[var(--cares-muted)]">
            No administrator matches that search.
          </p>
        )}
      </div>
    </aside>
  )
}
