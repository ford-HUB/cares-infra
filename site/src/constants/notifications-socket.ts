export const NOTIFICATION_SOCKET_NAMESPACE = '/notifications'

/** Server → client event names; must match the gateway's constants. */
export const NOTIFICATION_SOCKET_EVENTS = {
  new: 'notification:new',
  unread: 'notification:unread',
} as const
