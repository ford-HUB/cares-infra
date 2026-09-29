import {
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  MapPinned,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** Static landing-page copy. Nothing here is fetched — the public page never
 *  talks to the API, so every figure below is illustrative sample content. */

export interface LandingRole {
  name: string
  icon: LucideIcon
  summary: string
  scope: string
}

export const LANDING_ROLES: readonly LandingRole[] = [
  {
    name: 'Admin',
    icon: ShieldCheck,
    summary: 'Owns the system',
    scope: 'Accounts, access control, security policy, audit logs, maintenance.',
  },
  {
    name: 'Director',
    icon: UserCog,
    summary: 'Owns the programs',
    scope: 'Approvals, certificate templates, monthly reports, system notices.',
  },
  {
    name: 'Coordinator',
    icon: ClipboardCheck,
    summary: 'Runs the events',
    scope: 'Event setup, volunteer rosters, live attendance, on-site reporting.',
  },
] as const

export interface LandingCapability {
  title: string
  icon: LucideIcon
  description: string
}

export const LANDING_CAPABILITIES: readonly LandingCapability[] = [
  {
    title: 'Events & deployment',
    icon: CalendarDays,
    description: 'Plan an outreach, publish it to the mobile app, and staff it from one calendar.',
  },
  {
    title: 'Geofenced attendance',
    icon: MapPinned,
    description: 'Volunteers check in on site; the portal shows who is in area, in real time.',
  },
  {
    title: 'Volunteer records',
    icon: Users,
    description: 'One verified profile per volunteer, with service hours carried across events.',
  },
  {
    title: 'Certificates',
    icon: Award,
    description: 'Design a template once, then issue it to an entire roster in a single pass.',
  },
  {
    title: 'Reports',
    icon: BarChart3,
    description: 'Monthly extension reporting assembled from the events already on record.',
  },
  {
    title: 'Notices & support',
    icon: Bell,
    description: 'Reach every volunteer with a notice, and track the tickets that come back.',
  },
] as const

/** Sample figures for the hero preview card. Illustrative only — never fetched. */
export const LANDING_PREVIEW = {
  eventName: 'Barangay Pusok Feeding Drive',
  roster: 13,
  segments: [
    { label: 'In area', count: 6, barClass: 'bg-emerald-500', dotClass: 'bg-emerald-500' },
    { label: 'Outside area', count: 2, barClass: 'bg-amber-400', dotClass: 'bg-amber-400' },
    { label: 'Not yet in', count: 5, barClass: 'bg-gray-200', dotClass: 'bg-gray-300' },
  ],
} as const

export const LANDING_TRUST_POINTS: readonly string[] = [
  'Administrator accounts are approved before first sign-in',
  'Every action is written to the audit log',
  'Sign-in hours and allowlists are set by policy',
] as const
