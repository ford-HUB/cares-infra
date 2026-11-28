export const NOTIFICATION_SOCKET_NAMESPACE = '/notifications'

/** Must match the server gateway's constants. */
export const NOTIFICATION_SOCKET_EVENTS = {
  new: 'notification:new',
  unread: 'notification:unread',
} as const
