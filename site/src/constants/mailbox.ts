import dayjs from 'dayjs'
import {
  Inbox,
  Send,
  ShieldAlert,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import type { MailFolder } from '../types/mailbox'

export const MAILBOX_PAGE_SIZE = 25

/** Sidebar order — `drafts` is intentionally absent; the portal never saves drafts. */
export const MAILBOX_FOLDERS: {
  value: MailFolder
  label: string
  icon: LucideIcon
}[] = [
  { value: 'inbox', label: 'Inbox', icon: Inbox },
  { value: 'starred', label: 'Starred', icon: Star },
  { value: 'sent', label: 'Sent', icon: Send },
  { value: 'spam', label: 'Spam', icon: ShieldAlert },
  { value: 'trash', label: 'Trash', icon: Trash2 },
]

/** Rows drawn by the list skeleton — matches a typical first page above the fold. */
export const MAILBOX_SKELETON_ROWS = 8

export const MAILBOX_SEARCH_PLACEHOLDER = 'Search mail'
export const MAILBOX_COMPOSER_PLACEHOLDER = 'Write your message…'

export const MAILBOX_CONNECT_TITLE = 'Connect your Google account'
export const MAILBOX_CONNECT_BODY =
  'Sign in with Google to read and reply to mail without leaving the portal. CARES only ever reads the mailbox of the account you connect, and you can disconnect it at any time.'

export const MAILBOX_EMPTY_TITLE = 'Nothing here'
export const MAILBOX_EMPTY_BODY = 'No messages match this folder or search.'

export const MAILBOX_NO_SELECTION_TITLE = 'Select a message'
export const MAILBOX_NO_SELECTION_BODY =
  'Pick a message from the list to read it and reply.'

/**
 * `?gmail=` flags set by the server after Google redirects the browser back. Anything
 * unrecognised is treated as a generic failure.
 */
export const MAILBOX_CALLBACK_MESSAGES: Record<
  string,
  { type: 'success' | 'error'; message: string }
> = {
  connected: { type: 'success', message: 'Google account connected' },
  denied: {
    type: 'error',
    message: 'Google sign-in was cancelled, so no mailbox was connected.',
  },
  expired: {
    type: 'error',
    message: 'That sign-in link expired. Please try connecting again.',
  },
  error: {
    type: 'error',
    message: 'Google sign-in could not be completed. Please try again.',
  },
}

export const MAILBOX_CALLBACK_PARAM = 'gmail'

export const MAILBOX_DISCONNECT_CONFIRM =
  'Disconnect this Google account? CARES will stop showing its mail until you connect again.'

export const MAILBOX_SENT_TOAST = 'Message sent'
export const MAILBOX_DISCONNECTED_TOAST = 'Google account disconnected'

const REPLY_PREFIX = 'Re: '

/** Mail clients only stack one `Re:`, however deep the thread runs. */
export function replySubject(subject: string): string {
  return subject.toLowerCase().startsWith(REPLY_PREFIX.toLowerCase())
    ? subject
    : `${REPLY_PREFIX}${subject}`
}

/** Today shows a clock, this year a date, anything older the year too. */
export function formatMailTimestamp(iso: string): string {
  const value = dayjs(iso)
  if (!value.isValid()) return ''

  const now = dayjs()
  if (value.isSame(now, 'day')) return value.format('h:mm A')
  if (value.isSame(now, 'year')) return value.format('MMM D')
  return value.format('MMM D, YYYY')
}

export function formatMailFullTimestamp(iso: string): string {
  const value = dayjs(iso)
  return value.isValid() ? value.format('MMM D, YYYY [at] h:mm A') : ''
}

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB']

export function formatAttachmentSize(bytes: number): string {
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < FILE_SIZE_UNITS.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size < 10 && unit > 0 ? size.toFixed(1) : Math.round(size)} ${FILE_SIZE_UNITS[unit]}`
}
