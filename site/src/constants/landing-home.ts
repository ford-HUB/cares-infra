import { BookOpenText, CalendarHeart, Network, type LucideIcon } from 'lucide-react'
import { ABOUT_PATH, HIGHLIGHTS_PATH, PROGRAMS_PATH } from './routes'

/** Home-page "at a glance" figures.
 *
 *  MOCK DATA: the public site fetches nothing, so these are sample figures shaped
 *  like the event-evaluation and attendance records the portal already keeps.
 *  Swap them for a public summary endpoint when one exists. */

// export const LANDING_STATS_NOTE =
//   'Sample figures for SY 2024–2025 — live values will come from event evaluations and attendance records.'

export interface LandingRatingBucket {
  stars: 1 | 2 | 3 | 4 | 5
  count: number
}

/** Volunteer and beneficiary evaluation responses, by star rating. */
export const LANDING_RATING_BUCKETS: readonly LandingRatingBucket[] = [
  { stars: 5, count: 1012 },
  { stars: 4, count: 186 },
  { stars: 3, count: 38 },
  { stars: 2, count: 9 },
  { stars: 1, count: 3 },
] as const

export const LANDING_RATING_MAX = 5

export interface LandingBeneficiaryGroup {
  label: string
  count: number
  /** One step of a single-hue ramp: these are parts of one total, not states. */
  barClass: string
  dotClass: string
}

/** Beneficiaries served, by community. Sums to the headline total. */
export const LANDING_BENEFICIARY_GROUPS: readonly LandingBeneficiaryGroup[] = [
  { label: 'Barangay Looc', count: 1420, barClass: 'bg-emerald-800', dotClass: 'bg-emerald-800' },
  { label: 'Barangay Opao', count: 1180, barClass: 'bg-emerald-600', dotClass: 'bg-emerald-600' },
  { label: 'Barangay Paknaan', count: 860, barClass: 'bg-emerald-400', dotClass: 'bg-emerald-400' },
  { label: 'Barangay Umapad', count: 640, barClass: 'bg-emerald-300', dotClass: 'bg-emerald-300' },
  {
    label: 'Other partner communities',
    count: 900,
    barClass: 'bg-emerald-100',
    dotClass: 'bg-emerald-200',
  },
] as const

export interface LandingExploreLink {
  title: string
  description: string
  to: string
  icon: LucideIcon
}

export const LANDING_EXPLORE_LINKS: readonly LandingExploreLink[] = [
  {
    title: 'About CARES',
    description: 'Our vision, mission and goals, and the people who run the office.',
    to: ABOUT_PATH,
    icon: Network,
  },
  {
    title: 'Departmental programs',
    description: 'Twelve extension programs, one for every college and unit.',
    to: PROGRAMS_PATH,
    icon: BookOpenText,
  },
  {
    title: 'Highlights',
    description: 'Stories and updates from the 2024–2025 CARES Bulletin.',
    to: HIGHLIGHTS_PATH,
    icon: CalendarHeart,
  },
] as const

/** Banner copy for each inner page. */
export const LANDING_PAGE_HEADERS = {
  about: {
    title: 'Community Awareness, Relations and Extension Services',
    description:
      'The extension office of the University of Cebu Lapu-Lapu and Mandaue — what we stand for and who carries the work.',
  },
  programs: {
    title: 'Departmental programs',
    description:
      'Every college and unit runs its own extension program in the partner communities.',
  },
  highlights: {
    title: 'Highlights of School Year 2024–2025',
    description: 'Stories and updates reported in the UCLM CARES',
  },
  portal: {
    title: 'The portal behind every program',
    description:
      'Directors, coordinators and administrators share one sign-in to plan events, deploy volunteers and issue certificates.',
  },
} as const

export const LANDING_NUMBER_FORMAT = new Intl.NumberFormat('en-PH')
export const LANDING_PERCENT_FORMAT = new Intl.NumberFormat('en-PH', {
  style: 'percent',
  maximumFractionDigits: 0,
})
