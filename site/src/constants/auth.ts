import type { PortalRole } from '../types/portal-roles'

export const PORTAL_ROLES: PortalRole[] = ['admin', 'director', 'coordinator']

/**
 * Routes only the system operator may reach. Deciding what a role or a person is
 * allowed to do is an admin concern — the server enforces the same narrowing, this
 * just keeps a director from landing on a page that would only 403.
 */
export const ADMIN_ONLY_ROLES: PortalRole[] = ['admin']
