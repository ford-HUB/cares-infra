import { CalendarDays, HandCoins, LifeBuoy, UserCheck, Users } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { isEventInDepartment } from '../constants/event'
import {
  ADMIN_DONATION_TRACKING_PATH,
  ADMIN_EVENT_ATTENDEES_PATH,
  ADMIN_EVENT_LIST_PATH,
  ADMIN_MANAGE_USERS_PATH,
  ADMIN_SUPPORT_TICKETS_PATH,
} from '../constants/routes'
import { useAttendeeStore } from '../store/attendee-store'
import { useAuthStore } from '../store/auth-store'
import { useEventStore } from '../store/event-store'
import { useInternalDonationStore } from '../store/internal-donation-store'
import { useManageUsersStore } from '../store/manage-users-store'
import { useProfileStore } from '../store/profile-store'
import { useSupportTicketStore } from '../store/support-ticket-store'
import type { PortalSearchEntry } from '../types/portal-search'

/** Module name shown beside a record ("Bea Cruz in Manage Users"). */
const MODULE_LABELS = {
  [ADMIN_MANAGE_USERS_PATH]: 'Manage Users',
  [ADMIN_EVENT_ATTENDEES_PATH]: 'Attendees',
  [ADMIN_EVENT_LIST_PATH]: 'Events',
  [ADMIN_SUPPORT_TICKETS_PATH]: 'Support Tickets',
  [ADMIN_DONATION_TRACKING_PATH]: 'Donations',
} as const

const fullName = (first: string, last: string) => `${first} ${last}`.trim()

/** One row per distinct key — an attendee on five events is one person to find. */
function distinctBy<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const k = key(row).toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * The records the header search can find: people, events, tickets and donors from
 * the lists the portal already loads for each module — no endpoint of its own.
 *
 * A module only contributes when the account may open it (`allowedRoutes` comes
 * from the same gate as the sidebar), and a coordinator's attendees and events are
 * cut to their department exactly as those screens cut them, so search never shows
 * a name the module itself would hide.
 */
export function usePortalRecords(allowedRoutes: ReadonlySet<string>) {
  const isCoordinator = useAuthStore((s) => s.user?.role) === 'coordinator'
  const department = useProfileStore((s) => s.profile?.department)
  const users = useManageUsersStore((s) => s.users)
  const attendees = useAttendeeStore((s) => s.attendees)
  const events = useEventStore((s) => s.events)
  const tickets = useSupportTicketStore((s) => s.tickets)
  const donations = useInternalDonationStore((s) => s.donations)
  const loadingUsers = useManageUsersStore((s) => s.loading)
  const loadingAttendees = useAttendeeStore((s) => s.loading)
  const loadingEvents = useEventStore((s) => s.loading)
  const loadingTickets = useSupportTicketStore((s) => s.loading)
  const loadingDonations = useInternalDonationStore((s) => s.loading)

  /** A permitted list is still on its way, so "no matches" may not be final yet. */
  const loading =
    (loadingUsers && allowedRoutes.has(ADMIN_MANAGE_USERS_PATH)) ||
    (loadingAttendees && allowedRoutes.has(ADMIN_EVENT_ATTENDEES_PATH)) ||
    (loadingEvents && allowedRoutes.has(ADMIN_EVENT_LIST_PATH)) ||
    (loadingTickets && allowedRoutes.has(ADMIN_SUPPORT_TICKETS_PATH)) ||
    (loadingDonations && allowedRoutes.has(ADMIN_DONATION_TRACKING_PATH))

  const records = useMemo<PortalSearchEntry[]>(() => {
    const out: PortalSearchEntry[] = []
    const allows = (to: string) => allowedRoutes.has(to)
    const record = (
      to: keyof typeof MODULE_LABELS,
      id: string,
      fields: Pick<PortalSearchEntry, 'label' | 'description' | 'keywords' | 'icon'>,
    ): PortalSearchEntry => ({
      id: `record:${to}:${id}`,
      kind: 'record',
      trail: MODULE_LABELS[to],
      to,
      find: true,
      ...fields,
    })

    if (allows(ADMIN_MANAGE_USERS_PATH)) {
      for (const u of users) {
        out.push(
          record(ADMIN_MANAGE_USERS_PATH, u.id, {
            label: fullName(u.firstName, u.lastName) || u.email,
            description: [u.email, u.role].filter(Boolean).join(' · '),
            keywords: [u.email, u.department ?? ''],
            icon: Users,
          }),
        )
      }
    }

    if (allows(ADMIN_EVENT_ATTENDEES_PATH)) {
      const scoped = isCoordinator
        ? attendees.filter((a) => a.eventDepartment === department)
        : attendees
      for (const a of distinctBy(scoped, (a) => a.email || fullName(a.firstName, a.lastName))) {
        out.push(
          record(ADMIN_EVENT_ATTENDEES_PATH, a.id, {
            label: fullName(a.firstName, a.lastName),
            description: [a.email, a.department].filter(Boolean).join(' · '),
            keywords: [a.email, a.eventTitle],
            icon: UserCheck,
          }),
        )
      }
    }

    if (allows(ADMIN_EVENT_LIST_PATH)) {
      const scoped = isCoordinator
        ? events.filter((e) => isEventInDepartment(e.department, department ?? ''))
        : events
      for (const e of scoped) {
        out.push(
          record(ADMIN_EVENT_LIST_PATH, String(e.event_id), {
            label: e.title,
            description: [e.organizer_name, e.department, e.location].filter(Boolean).join(' · '),
            keywords: [e.organizer_name, e.location],
            icon: CalendarDays,
          }),
        )
      }
    }

    if (allows(ADMIN_SUPPORT_TICKETS_PATH)) {
      for (const t of tickets) {
        out.push(
          record(ADMIN_SUPPORT_TICKETS_PATH, t.id, {
            label: t.subject,
            description: `${t.reference} · ${t.requester.name}`,
            keywords: [t.requester.name, t.requester.email, t.reference],
            icon: LifeBuoy,
          }),
        )
      }
    }

    if (allows(ADMIN_DONATION_TRACKING_PATH)) {
      for (const d of distinctBy(donations, (d) => d.donor.email || d.donor.name)) {
        out.push(
          record(ADMIN_DONATION_TRACKING_PATH, d.id, {
            label: d.donor.name,
            description: [d.donor.type, d.donor.email].filter(Boolean).join(' · '),
            keywords: [d.donor.email, d.reference],
            icon: HandCoins,
          }),
        )
      }
    }

    return out
  }, [allowedRoutes, isCoordinator, department, users, attendees, events, tickets, donations])

  /**
   * Loads each permitted module's list the first time someone searches. A list a
   * screen has already loaded (or is loading) is reused, never fetched twice.
   */
  const ensureLoaded = useCallback(() => {
    const load = (to: string, store: { initialized: boolean; loading: boolean }, fetch: () => Promise<void>) => {
      if (allowedRoutes.has(to) && !store.initialized && !store.loading) void fetch()
    }
    const u = useManageUsersStore.getState()
    load(ADMIN_MANAGE_USERS_PATH, u, () => u.fetchUsers())
    const a = useAttendeeStore.getState()
    load(ADMIN_EVENT_ATTENDEES_PATH, a, a.fetchAttendees)
    const e = useEventStore.getState()
    load(ADMIN_EVENT_LIST_PATH, e, e.fetchEvents)
    const t = useSupportTicketStore.getState()
    load(ADMIN_SUPPORT_TICKETS_PATH, t, t.fetchTickets)
    const d = useInternalDonationStore.getState()
    load(ADMIN_DONATION_TRACKING_PATH, d, d.fetchDonations)
  }, [allowedRoutes])

  return { records, loading, ensureLoaded }
}
