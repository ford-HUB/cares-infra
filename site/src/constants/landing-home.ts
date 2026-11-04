import { BookOpenText, CalendarHeart, Network, type LucideIcon } from 'lucide-react'
import { ABOUT_PATH, HIGHLIGHTS_PATH, PROGRAMS_PATH } from './routes'
import caresAssembly from '../assets/landing_page/photos/cares-assembly.jpg'
import caresLeadersFormal from '../assets/landing_page/photos/cares-leaders-formal.jpg'
import partnershipAwards from '../assets/landing_page/photos/partnership-awards.jpg'
import ccsGiftGiving from '../assets/landing_page/photos/ccs-gift-giving.jpg'
import programAppreciation from '../assets/landing_page/photos/program-appreciation.jpg'
import heroBackground from '../assets/landing_page/photos/hero-background.jpg'
import visayasDisasterCenter from '../assets/landing_page/photos/visayas-disaster-center.jpg'

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

/** Home-page video. Leave `src` empty to show the "coming soon" frame; set it to a
 *  video URL (served from the public S3 bucket) to show the player. */
export const LANDING_VIDEO = {
  src: 'https://amzn-s3-cares-storage-dev.s3.ap-southeast-2.amazonaws.com/videos/UCLM+CARES+AVP.mp4',
  poster: heroBackground,
  title: 'UCLM CARES video',
  /** Share of the video that must be on screen before it plays. */
  visibleRatio: 0.5,
  heading: { before: 'Watch', accent: 'CARES', after: 'in Action' },
  description: 'Discover stories, programs, and real moments of impact from our communities.',
  placeholder: 'Video coming soon',
} as const

/** Home-page partners. Logos are cleaned, transparent copies of the originals in
 *  `public/partners/`, kept in its `logos/` folder. */
export interface LandingPartner {
  name: string
  logo: string
}

export const LANDING_PARTNERS_COPY = {
  eyebrow: 'Partners',
  title: { before: 'Our', accent: 'Partners' },
  description: 'Working with communities and organizations to create meaningful impact.',
  /** Names the partner grid for screen readers, now that it has no visible group titles. */
  listLabel: 'Partner barangays and organizations',
} as const

export const LANDING_PARTNER_BARANGAYS: readonly LandingPartner[] = [
  { name: 'Barangay Looc', logo: '/partners/logos/barangay-looc.png' },
  { name: 'Barangay Opao', logo: '/partners/logos/barangay-opao.png' },
  { name: 'Barangay Umapad', logo: '/partners/logos/barangay-umapad.png' },
  { name: 'Barangay Paknaan', logo: '/partners/logos/barangay-paknaan.png' },
] as const

export const LANDING_PARTNER_ORGANIZATIONS: readonly LandingPartner[] = [
  { name: 'Bidlisiw Foundation Inc.', logo: '/partners/logos/bidlisiw-foundation.png' },
  { name: 'Waku Work', logo: '/partners/logos/waku-work.png' },
  {
    name: 'Asia Pacific Alliance for Disaster Management Philippines',
    logo: '/partners/logos/apad-philippines.png',
  },
  {
    name: 'Technical Education and Skills Development Authority',
    logo: '/partners/logos/tesda.png',
  },
  { name: 'Department of Education', logo: '/partners/logos/deped.png' },
  { name: 'Mandaue City Jail', logo: '/partners/logos/mandaue-city-jail.png' },
  {
    name: 'Department of Environment and Natural Resources',
    logo: '/partners/logos/denr.png',
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
    description: 'Our vision, mission and objectives, and the people who run the office.',
    to: ABOUT_PATH,
    icon: Network,
  },
  {
    title: 'Departmental programs',
    description: 'Twelve colleges and units, and the extension work each one documented.',
    to: PROGRAMS_PATH,
    icon: BookOpenText,
  },
  {
    title: 'Highlights',
    description: 'Our achievements, year by year, from the CARES Bulletin.',
    to: HIGHLIGHTS_PATH,
    icon: CalendarHeart,
  },
] as const

/** Banner copy for each section after Home. The title reads `title accent`, with the
 *  accent in gold italic. */
export const LANDING_PAGE_HEADERS = {
  about: {
    title: 'Community Awareness, Relations and',
    accent: 'Extension Services',
    description:
      'Discover the vision, mission, and dedicated people behind UCLM CARES and its commitment to meaningful community service.',
    photos: { left: caresAssembly, right: visayasDisasterCenter },
  },
  programs: {
    title: 'Departmental',
    accent: 'Programs',
    description: 'Community awareness, relations and extension services across UCLM.',
    photos: { left: programAppreciation, right: ccsGiftGiving },
    /** The programs grid sits on mint, so the hills end in mint. */
    waveFill: 'mint',
  },
  highlights: {
    title: 'Our Achievements,',
    accent: 'Year by Year',
    description: 'A journey through the years of meaningful programs, community service, and achievements.',
    photos: {
      left: caresLeadersFormal,
      right: partnershipAwards,
      /** Crop the portrait from higher up so all three faces stay in the strip. */
      leftPosition: '50% 22%',
    },
    /** The year list below sits on white, so the hills end in white. */
    waveFill: 'white',
  },
} as const

export const LANDING_NUMBER_FORMAT = new Intl.NumberFormat('en-PH')
export const LANDING_PERCENT_FORMAT = new Intl.NumberFormat('en-PH', {
  style: 'percent',
  maximumFractionDigits: 0,
})
