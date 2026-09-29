import { create } from 'zustand'
import {
  createMailboxAuthorizeUrl,
  disconnectMailbox,
  getMail,
  getMailboxConnection,
  listMail,
  sendMail,
  setMailReadState,
} from '../services/mailbox-service'
import type {
  MailDetail,
  MailFolder,
  MailSummary,
  MailboxConnection,
  SendMailPayload,
} from '../types/mailbox'

interface MailboxState {
  connection: MailboxConnection | null
  /** False until the first connection check settles; gates the connect screen. */
  initialized: boolean
  connectionLoading: boolean
  connecting: boolean
  disconnecting: boolean

  folder: MailFolder
  /** The term the current list reflects — not the text being typed. */
  search: string
  messages: MailSummary[]
  nextPageToken: string | null
  /**
   * Gmail page tokens only run forwards, so every token used to reach a page is
   * kept here — index 0 is the first page, which needs no token at all.
   */
  pageTokens: (string | null)[]
  pageIndex: number
  estimatedTotal: number
  listLoading: boolean
  listInitialized: boolean

  selectedId: string | null
  detail: MailDetail | null
  detailLoading: boolean
  sending: boolean
  error: string | null

  loadConnection: () => Promise<void>
  connect: () => Promise<string | null>
  disconnect: () => Promise<boolean>
  openFolder: (folder: MailFolder) => Promise<void>
  applySearch: (search: string) => Promise<void>
  refresh: () => Promise<void>
  nextPage: () => Promise<void>
  previousPage: () => Promise<void>
  selectMessage: (id: string) => Promise<void>
  clearSelection: () => void
  toggleRead: (id: string, unread: boolean) => Promise<void>
  send: (payload: SendMailPayload) => Promise<boolean>
  reset: () => void
}

/** Everything that has to fall away the moment the mailbox is disconnected. */
const EMPTY_MAIL = {
  messages: [] as MailSummary[],
  nextPageToken: null,
  pageTokens: [null] as (string | null)[],
  pageIndex: 0,
  estimatedTotal: 0,
  listInitialized: false,
  selectedId: null,
  detail: null,
}

export const useMailboxStore = create<MailboxState>((set, get) => {
  /**
   * Gmail rejects a burst of concurrent calls from one account with 429, and React's
   * StrictMode runs every mount effect twice in development. These handles let an
   * identical request that is already in flight be joined instead of fired again.
   */
  let connectionRequest: Promise<void> | null = null
  let listRequest: { key: string; promise: Promise<void> } | null = null
  let listSequence = 0

  const fetchPage = async (tokens: (string | null)[], sequence: number) => {
    const { folder, search } = get()
    const index = tokens.length - 1
    set({ listLoading: true, error: null })

    const res = await listMail({
      folder,
      search: search || undefined,
      pageToken: tokens[index] ?? undefined,
    })

    // A newer page started while this was in flight — its answer is the current one.
    if (sequence !== listSequence) return

    if (!res.success || !res.data) {
      set({
        listLoading: false,
        listInitialized: true,
        // A dropped connection sends the page back to the connect screen.
        ...(res.notConnected
          ? {
              ...EMPTY_MAIL,
              listInitialized: true,
              connection: { connected: false, email: null, connectedAt: null },
            }
          : {}),
        error: res.message ?? 'Could not load mail',
      })
      return
    }

    set({
      messages: res.data.messages,
      nextPageToken: res.data.nextPageToken,
      pageTokens: tokens,
      pageIndex: index,
      estimatedTotal: res.data.estimatedTotal,
      listLoading: false,
      listInitialized: true,
      error: null,
    })
  }

  /**
   * Loads one page of the current folder. `tokens` is the history that reached it,
   * so stepping backwards can replay the token the page was originally fetched with.
   */
  const loadPage = (tokens: (string | null)[]) => {
    const { folder, search } = get()
    const key = `${folder}|${search}|${tokens[tokens.length - 1] ?? ''}`
    if (listRequest?.key === key) return listRequest.promise

    listSequence += 1
    const promise = fetchPage(tokens, listSequence).finally(() => {
      if (listRequest?.promise === promise) listRequest = null
    })
    listRequest = { key, promise }
    return promise
  }

  /** Invalidates any list request still in flight so its answer cannot land later. */
  const abandonList = () => {
    listSequence += 1
    listRequest = null
  }

  const fetchConnection = async () => {
    set({ connectionLoading: true })
    const res = await getMailboxConnection()

    if (!res.success || !res.data) {
      set({
        connection: { connected: false, email: null, connectedAt: null },
        connectionLoading: false,
        initialized: true,
        error: res.message ?? null,
      })
      return
    }

    set({
      connection: res.data,
      connectionLoading: false,
      initialized: true,
      error: null,
    })

    if (res.data.connected) await get().refresh()
  }

  return {
    connection: null,
    initialized: false,
    connectionLoading: false,
    connecting: false,
    disconnecting: false,

    folder: 'inbox',
    search: '',
    messages: [],
    nextPageToken: null,
    pageTokens: [null],
    pageIndex: 0,
    estimatedTotal: 0,
    listLoading: false,
    listInitialized: false,

    selectedId: null,
    detail: null,
    detailLoading: false,
    sending: false,
    error: null,

    loadConnection: () => {
      if (connectionRequest) return connectionRequest

      connectionRequest = fetchConnection().finally(() => {
        connectionRequest = null
      })
      return connectionRequest
    },

    connect: async () => {
      set({ connecting: true, error: null })
      const res = await createMailboxAuthorizeUrl()

      if (!res.success || !res.data) {
        set({ connecting: false, error: res.message ?? 'Could not start Google sign-in' })
        return null
      }

      // Left `connecting` — the caller navigates away, so the button stays busy.
      return res.data
    },

    disconnect: async () => {
      set({ disconnecting: true, error: null })
      const res = await disconnectMailbox()

      if (!res.success) {
        set({ disconnecting: false, error: res.message ?? 'Could not disconnect' })
        return false
      }

      abandonList()
      set({
        ...EMPTY_MAIL,
        connection: { connected: false, email: null, connectedAt: null },
        disconnecting: false,
        search: '',
        folder: 'inbox',
        error: null,
      })
      return true
    },

    openFolder: async (folder) => {
      if (get().folder === folder) return
      set({ folder, selectedId: null, detail: null })
      // A new folder always starts at the first page.
      await loadPage([null])
    },

    applySearch: async (search) => {
      set({ search, selectedId: null, detail: null })
      await loadPage([null])
    },

    /** Reloads the page currently on screen; a folder or search change starts over. */
    refresh: async () => {
      await loadPage(get().pageTokens.slice(0, get().pageIndex + 1))
    },

    nextPage: async () => {
      const { nextPageToken, listLoading, pageTokens, pageIndex } = get()
      if (!nextPageToken || listLoading) return

      set({ selectedId: null, detail: null })
      await loadPage([...pageTokens.slice(0, pageIndex + 1), nextPageToken])
    },

    previousPage: async () => {
      const { listLoading, pageTokens, pageIndex } = get()
      if (pageIndex === 0 || listLoading) return

      set({ selectedId: null, detail: null })
      await loadPage(pageTokens.slice(0, pageIndex))
    },

    selectMessage: async (id) => {
      if (get().selectedId === id) return

      set({ selectedId: id, detail: null, detailLoading: true, error: null })
      const res = await getMail(id)

      // A second click while this was in flight wins — drop the stale response.
      if (get().selectedId !== id) return

      if (!res.success || !res.data) {
        set({ detailLoading: false, error: res.message ?? 'Could not open the message' })
        return
      }

      set({ detail: res.data, detailLoading: false })

      // Opening a message clears its unread badge, exactly as Gmail behaves.
      if (res.data.unread) await get().toggleRead(id, false)
    },

    clearSelection: () => set({ selectedId: null, detail: null }),

    toggleRead: async (id, unread) => {
      // Optimistic: the badge flips immediately and rolls back only on failure.
      const previous = get().messages
      set({
        messages: previous.map((message) =>
          message.id === id ? { ...message, unread } : message,
        ),
      })

      const res = await setMailReadState(id, unread)
      if (!res.success) {
        set({ messages: previous, error: res.message ?? 'Could not update the message' })
      }
    },

    send: async (payload) => {
      set({ sending: true, error: null })
      const res = await sendMail(payload)

      if (!res.success) {
        set({ sending: false, error: res.message ?? 'Could not send the message' })
        return false
      }

      set({ sending: false })
      // Sent mail only shows up in the list when that is the folder being viewed.
      if (get().folder === 'sent') await get().refresh()
      return true
    },

    reset: () => {
      abandonList()
      set({
        ...EMPTY_MAIL,
        connection: null,
        initialized: false,
        folder: 'inbox',
        search: '',
        error: null,
      })
    },
  }
})
