import type { ManagedUser, ManagedUserVerificationStatus } from '../types/manage-users'
import { LANDING_PARTNER_BARANGAYS } from './landing-home'

export const USER_ROW_HEIGHT_PX = 44
export const USER_HEADER_HEIGHT_PX = 36

/** Table paginates client-side; service fetches up to this ceiling. */
export const MANAGE_USERS_PAGE_SIZE = 100
export const MANAGE_USERS_MAX_LOADED = 2000

export const USER_ROLE_FILTER_ALL = 'all'
export const USER_STATUS_FILTER_ALL = 'all'

export type UserStatusFilter = ManagedUser['status'] | typeof USER_STATUS_FILTER_ALL

export const USER_STATUS_FILTERS: { value: UserStatusFilter; label: string }[] = [
  { value: USER_STATUS_FILTER_ALL, label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'expired', label: 'Expired' },
]

/** App-side account; the actual role comes from its type. */
export const REGULAR_USER_ROLE = 'REGULAR'

export const PROVISIONABLE_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'COORDINATOR', label: 'Coordinator' },
  { value: REGULAR_USER_ROLE, label: 'Regular User' },
] as const

export const PARTNER_BARANGAY_USER_TYPE = 'VOLUNTEER_PARTNER_BARANGAY'

/** All `VOLUNTEER` role, told apart by `volunteerType` (matches mobile `VolunteerType`). */
export const REGULAR_USER_TYPES = [
  {
    value: 'VOLUNTEER_STUDENT',
    label: 'Student',
    group: 'Volunteer',
    roleType: 'VOLUNTEER',
    volunteerType: 'STUDENT',
  },
  {
    value: 'VOLUNTEER_STAFF',
    label: 'Staff',
    group: 'Volunteer',
    roleType: 'VOLUNTEER',
    volunteerType: 'STAFF',
  },
  {
    value: 'VOLUNTEER_ALUMNI',
    label: 'Alumni',
    group: 'Volunteer',
    roleType: 'VOLUNTEER',
    volunteerType: 'ALUMNI',
  },
  {
    value: PARTNER_BARANGAY_USER_TYPE,
    label: 'Partner Barangay',
    group: 'Volunteer',
    roleType: 'VOLUNTEER',
    volunteerType: 'PARTNER_BARANGAY',
  },
  {
    value: 'DONOR',
    label: 'Donor',
    group: null,
    roleType: 'DONOR',
    volunteerType: null,
  },
  {
    value: 'BENEFICIARY',
    label: 'Beneficiary',
    group: null,
    roleType: 'BENEFICIARY',
    volunteerType: null,
  },
] as const

export type RegularUserType = (typeof REGULAR_USER_TYPES)[number]['value']

/** Mirrors mobile `UclmDepartments.names`; the full name is stored on the profile. */
export const PROVISIONABLE_DEPARTMENTS = [
  'College of Maritime Engineering',
  'College of Teacher Education (BSED)',
  'College of Maritime Transportation',
  'College of Nursing',
  'Senior High School Department',
  'College of Teacher Education (BEED)',
  'College of Business and Accountancy',
  'College of Computer Studies',
  'College of Criminology',
  'College of Customs Administration',
  'College of Engineering',
  'College of Hospitality and Tourism Management',
  'Basic Education (Junior High School)',
  'Basic Education (Elementary)',
  'Non-Teaching Personnel',
].map((name) => ({ value: name, label: name }))

/** Mirrors server `PARTNER_BARANGAYS` and mobile `PartnerBarangays.names`; server accepts only these. */
export const PROVISIONABLE_PARTNER_BARANGAYS = LANDING_PARTNER_BARANGAYS.map(
  (partner) => ({ value: partner.name, label: partner.name }),
)

/** Mirrors server CREDENTIAL_MIN_HOURS/MAX_HOURS; out of range is a 400. */
export const CREDENTIAL_MIN_HOURS = 1
export const CREDENTIAL_MAX_HOURS = 24 * 90
export const CREDENTIAL_DEFAULT_HOURS = 72

export const CREDENTIAL_LIFETIME_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 48, label: '2 days' },
  { value: CREDENTIAL_DEFAULT_HOURS, label: '3 days' },
  { value: 24 * 7, label: '7 days' },
  { value: 24 * 14, label: '14 days' },
  { value: 24 * 30, label: '30 days' },
] as const

export const USER_COLUMNS = [
  { key: 'name', label: 'Full Name', width: 'w-[24%]' },
  { key: 'email', label: 'Email', width: 'w-[24%]' },
  { key: 'role', label: 'Role', width: 'w-[14%]' },
  { key: 'department', label: 'Department', width: 'w-[16%]' },
  { key: 'lastLoginIp', label: 'Last IP', width: 'w-[14%]' },
  { key: 'status', label: 'Status', width: 'w-[12%]' },
  { key: 'actions', label: '', width: 'w-14' },
] as const

/** Shared with the loading skeleton so row heights can't drift. */
export const USER_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const USER_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const USER_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'

export const PORTAL_ROLE_VALUES = ['admin', 'director', 'coordinator']

export const VERIFICATION_STATUS_LABELS: Record<ManagedUserVerificationStatus, string> = {
  N: 'Pending',
  F: 'Failed',
  V: 'Verified',
}
