import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MAX_COUNT,
  CHAT_ATTACHMENT_TOO_LARGE,
  CHAT_ATTACHMENT_TOO_MANY,
  CHAT_ROLE_GROUPS,
} from '../constants/chat'
import { useAuthStore } from '../store/auth-store'
import { useChatStore } from '../store/chat-store'
import type {
  ChatContact,
  ChatDraftAttachment,
  ChatPresence,
  ChatRoleGroup,
} from '../types/chat'

function matchesTerm(contact: ChatContact, term: string): boolean {
  const haystack = [
    contact.firstName,
    contact.lastName,
    contact.email,
    contact.department ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

/** Wires the chat store to the page: search, selection, files, and the draft. */
export function useChatWorkspace() {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)

  const contacts = useChatStore((s) => s.contacts)
  const threads = useChatStore((s) => s.threads)
  const messages = useChatStore((s) => s.messages)
  const onlineIds = useChatStore((s) => s.onlineIds)
  const activeContactId = useChatStore((s) => s.activeContactId)
  const loading = useChatStore((s) => s.loading)
  const messagesLoading = useChatStore((s) => s.messagesLoading)
  const sending = useChatStore((s) => s.sending)
  const error = useChatStore((s) => s.error)
  const load = useChatStore((s) => s.load)
  const selectContact = useChatStore((s) => s.selectContact)
  const send = useChatStore((s) => s.send)

  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<ChatDraftAttachment[]>([])

  useEffect(() => {
    void load()
  }, [load])

  const presenceOf = (contactId: string): ChatPresence =>
    onlineIds.includes(contactId) ? 'online' : 'offline'

  const groups = useMemo<ChatRoleGroup[]>(() => {
    const term = search.trim().toLowerCase()
    return CHAT_ROLE_GROUPS.map((group) => ({
      ...group,
      contacts: contacts.filter(
        (contact) =>
          contact.roleType === group.id && (!term || matchesTerm(contact, term)),
      ),
    })).filter((group) => group.contacts.length > 0)
  }, [contacts, search])

  const activeContact = useMemo(
    () => contacts.find((contact) => contact.id === activeContactId) ?? null,
    [contacts, activeContactId],
  )

  const activeMessages = activeContactId ? (messages[activeContactId] ?? []) : []
  const threadLoaded = activeContactId ? activeContactId in messages : false

  const clearAttachments = (queued: ChatDraftAttachment[]) => {
    queued.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
    setAttachments([])
  }

  const addAttachments = (files: FileList | File[]) => {
    const picked = Array.from(files)
    if (picked.length === 0) return

    const accepted: ChatDraftAttachment[] = []
    for (const file of picked) {
      if (attachments.length + accepted.length >= CHAT_ATTACHMENT_MAX_COUNT) {
        toast.error(CHAT_ATTACHMENT_TOO_MANY)
        break
      }
      if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
        toast.error(CHAT_ATTACHMENT_TOO_LARGE(file.name))
        continue
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        previewUrl: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
        file,
      })
    }

    if (accepted.length > 0) setAttachments((current) => [...current, ...accepted])
  }

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  const handleSend = async () => {
    const body = draft.trim()
    if ((!body && attachments.length === 0) || sending) return

    const queued = attachments
    const sent = await send(
      body,
      queued.map((item) => item.file),
    )

    if (!sent) {
      toast.error(useChatStore.getState().error ?? 'Message not sent')
      return
    }

    setDraft('')
    clearAttachments(queued)
  }

  return {
    groups,
    threads,
    search,
    setSearch,
    activeContact,
    activeContactId,
    activeMessages,
    currentUserId,
    presenceOf,
    /** `false` for a contact with no prior conversation — drives the empty state. */
    hasHistory: threadLoaded && activeMessages.length > 0,
    draft,
    setDraft,
    attachments,
    addAttachments,
    removeAttachment,
    handleSend,
    onSelect: (contactId: string) => {
      if (contactId === activeContactId) return
      // A different thread starts with a clean composer.
      setDraft('')
      clearAttachments(attachments)
      void selectContact(contactId)
    },
    loading,
    messagesLoading: messagesLoading || (Boolean(activeContactId) && !threadLoaded),
    sending,
    error,
  }
}
