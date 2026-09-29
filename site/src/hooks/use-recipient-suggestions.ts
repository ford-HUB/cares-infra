import { useEffect, useMemo, useState } from 'react'
import {
  MAILBOX_CONTACT_DEBOUNCE_MS,
  MAILBOX_CONTACT_MIN_CHARS,
  MAILBOX_CONTACT_SUGGESTION_LIMIT,
} from '../constants/mailbox'
import { searchUserDirectory } from '../services/manage-user-service'
import { useMailboxStore } from '../store/mailbox-store'
import type { MailContact, MailSummary } from '../types/mailbox'

interface UseRecipientSuggestionsResult {
  suggestions: MailContact[]
  loading: boolean
}

function matches(contact: MailContact, term: string): boolean {
  return (
    contact.email.toLowerCase().includes(term) ||
    contact.name.toLowerCase().includes(term)
  )
}

/** People already visible in the open folder — the fastest match, and free. */
function correspondents(messages: MailSummary[], term: string): MailContact[] {
  return messages
    .map((message) => ({
      name: message.fromName || message.fromEmail,
      email: message.fromEmail,
    }))
    .filter((contact) => contact.email && matches(contact, term))
}

/** Later entries never displace an earlier one, so source order sets priority. */
function dedupe(contacts: MailContact[]): MailContact[] {
  const seen = new Set<string>()
  return contacts.filter((contact) => {
    const key = contact.email.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Recipient suggestions for the fragment currently being typed. Correspondents from
 * the loaded mail appear first because they need no request; CARES users follow, from
 * a debounced directory lookup. Fetching pauses while `enabled` is false, so picking a
 * suggestion does not immediately reopen the list.
 */
export function useRecipientSuggestions(
  fragment: string,
  enabled: boolean,
): UseRecipientSuggestionsResult {
  const messages = useMailboxStore((s) => s.messages)
  /** Results are stamped with the term that produced them, so a stale page never shows. */
  const [directory, setDirectory] = useState<{ term: string; contacts: MailContact[] }>({
    term: '',
    contacts: [],
  })

  const term = fragment.trim().toLowerCase()
  const active = enabled && term.length >= MAILBOX_CONTACT_MIN_CHARS
  const settled = directory.term === term

  useEffect(() => {
    if (!active) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      const users = await searchUserDirectory(
        term,
        MAILBOX_CONTACT_SUGGESTION_LIMIT,
        controller.signal,
      )
      if (controller.signal.aborted) return

      setDirectory({
        term,
        contacts: users
          .filter((user) => user.email)
          .map((user) => ({
            name: `${user.firstName} ${user.lastName}`.trim() || user.email,
            email: user.email,
          })),
      })
    }, MAILBOX_CONTACT_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [active, term])

  const suggestions = useMemo(() => {
    if (!active) return []
    const users = settled ? directory.contacts : []
    return dedupe([...correspondents(messages, term), ...users]).slice(
      0,
      MAILBOX_CONTACT_SUGGESTION_LIMIT,
    )
  }, [active, directory, messages, settled, term])

  return { suggestions, loading: active && !settled }
}
