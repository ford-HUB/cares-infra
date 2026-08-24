import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  MAILBOX_CALLBACK_MESSAGES,
  MAILBOX_CALLBACK_PARAM,
  MAILBOX_DISCONNECTED_TOAST,
  MAILBOX_DISCONNECT_CONFIRM,
} from '../constants/mailbox'
import { useMailboxStore } from '../store/mailbox-store'
import type { MailFolder } from '../types/mailbox'
import { useMailComposer } from './use-mail-composer'

/** Wires the mailbox store to the page: connection, folders, search and selection. */
export function useMailboxWorkspace() {
  const connection = useMailboxStore((s) => s.connection)
  const initialized = useMailboxStore((s) => s.initialized)
  const connectionLoading = useMailboxStore((s) => s.connectionLoading)
  const connecting = useMailboxStore((s) => s.connecting)
  const disconnecting = useMailboxStore((s) => s.disconnecting)
  const folder = useMailboxStore((s) => s.folder)
  const messages = useMailboxStore((s) => s.messages)
  const nextPageToken = useMailboxStore((s) => s.nextPageToken)
  const listLoading = useMailboxStore((s) => s.listLoading)
  const listInitialized = useMailboxStore((s) => s.listInitialized)
  const pageIndex = useMailboxStore((s) => s.pageIndex)
  const selectedId = useMailboxStore((s) => s.selectedId)
  const detail = useMailboxStore((s) => s.detail)
  const detailLoading = useMailboxStore((s) => s.detailLoading)
  const error = useMailboxStore((s) => s.error)

  const loadConnection = useMailboxStore((s) => s.loadConnection)
  const connect = useMailboxStore((s) => s.connect)
  const disconnect = useMailboxStore((s) => s.disconnect)
  const openFolder = useMailboxStore((s) => s.openFolder)
  const applySearch = useMailboxStore((s) => s.applySearch)
  const refresh = useMailboxStore((s) => s.refresh)
  const nextPage = useMailboxStore((s) => s.nextPage)
  const previousPage = useMailboxStore((s) => s.previousPage)
  const selectMessage = useMailboxStore((s) => s.selectMessage)
  const clearSelection = useMailboxStore((s) => s.clearSelection)
  const toggleRead = useMailboxStore((s) => s.toggleRead)

  const composer = useMailComposer()
  const [searchDraft, setSearchDraft] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  /**
   * Google redirects back here with a `?gmail=` flag. It is reported once and then
   * stripped, so a refresh does not replay the toast.
   */
  const callbackFlag = searchParams.get(MAILBOX_CALLBACK_PARAM)
  useEffect(() => {
    if (!callbackFlag) return

    const outcome =
      MAILBOX_CALLBACK_MESSAGES[callbackFlag] ?? MAILBOX_CALLBACK_MESSAGES.error
    if (outcome.type === 'success') toast.success(outcome.message)
    else toast.error(outcome.message)

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete(MAILBOX_CALLBACK_PARAM)
        return next
      },
      { replace: true },
    )
  }, [callbackFlag, setSearchParams])

  useEffect(() => {
    void loadConnection()
  }, [loadConnection])

  const handleConnect = async () => {
    const authorizeUrl = await connect()
    if (!authorizeUrl) {
      toast.error(useMailboxStore.getState().error ?? 'Could not start Google sign-in')
      return
    }
    // Full navigation, not a router push — consent happens on Google's own origin.
    window.location.assign(authorizeUrl)
  }

  const handleDisconnect = async () => {
    if (!window.confirm(MAILBOX_DISCONNECT_CONFIRM)) return

    const done = await disconnect()
    if (!done) {
      toast.error(useMailboxStore.getState().error ?? 'Could not disconnect')
      return
    }
    composer.close()
    setSearchDraft('')
    toast.success(MAILBOX_DISCONNECTED_TOAST)
  }

  const handleSearchSubmit = () => {
    void applySearch(searchDraft.trim())
  }

  const handleClearSearch = () => {
    setSearchDraft('')
    void applySearch('')
  }

  return {
    connected: Boolean(connection?.connected),
    connectedEmail: connection?.email ?? null,
    initialized,
    connectionLoading,
    connecting,
    disconnecting,

    folder,
    messages,
    listLoading,
    listInitialized,
    hasNextPage: Boolean(nextPageToken),
    hasPreviousPage: pageIndex > 0,
    searchDraft,
    setSearchDraft,

    selectedId,
    detail,
    detailLoading,
    error,
    composer,

    onConnect: () => void handleConnect(),
    onDisconnect: () => void handleDisconnect(),
    onSelectFolder: (next: MailFolder) => void openFolder(next),
    onSelectMessage: (id: string) => void selectMessage(id),
    onClearSelection: clearSelection,
    onMarkUnread: (id: string) => {
      void toggleRead(id, true)
      clearSelection()
    },
    onRefresh: () => void refresh(),
    onNextPage: () => void nextPage(),
    onPreviousPage: () => void previousPage(),
    onSearchSubmit: handleSearchSubmit,
    onClearSearch: handleClearSearch,
  }
}
