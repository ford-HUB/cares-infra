import {
  BookOpen,
  Droplet,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { HOME_PATH } from './routes'
import alsCulmination from '../assets/landing_page/photos/als-culmination.jpg'
import alsFunRun from '../assets/landing_page/photos/als-fun-run.jpg'
import cteCleanUpDrive from '../assets/landing_page/photos/cte-clean-up-drive.jpg'
import bogoReliefTeam from '../assets/landing_page/photos/bogo-relief-team.jpg'
import maritimeCaresVdrc from '../assets/landing_page/photos/maritime-cares-vdrc.jpg'
import caresBannerVdrc from '../assets/landing_page/photos/cares-banner-vdrc.jpg'
import waterReliefDistribution from '../assets/landing_page/photos/water-relief-distribution.jpg'
import lnkLeadershipAssembly from '../assets/landing_page/photos/lnk-leadership-assembly.jpg'
import basicEdTutorial from '../assets/landing_page/photos/basic-ed-tutorial.jpg'
import computerLiteracy from '../assets/landing_page/photos/computer-literacy.jpg'
import heroBackground from '../assets/landing_page/photos/hero-background.jpg'
import caresMembers from '../assets/landing_page/photos/cares-members.jpg'
import loocReads from '../assets/landing_page/photos/looc-reads.jpg'
import mangrovePlanting from '../assets/landing_page/photos/mangrove-planting.jpg'
import tutorialProgram from '../assets/landing_page/photos/tutorial-program.jpg'

/** Static copy from the UCLM CARES Bulletin; the public page fetches nothing. */

export const LANDING_SERIF = "font-['Libre_Baskerville',_Georgia,_serif]"

export const LANDING_CONDENSED = "font-['Oswald',_'Arial_Narrow',_sans-serif]"

export const LANDING_BANNER_SERIF = "font-['Lora',_Georgia,_serif]"

export const LANDING_BRUSH_SERIF = "font-['Fraunces',_Georgia,_serif]"

export const LANDING_SLAB = "font-['Bitter',_Georgia,_serif]"

export const LANDING_DISPLAY_SERIF = "font-['Playfair_Display',_Georgia,_serif]"

export const LANDING_DISPLAY = "font-['Montserrat',_ui-sans-serif,_sans-serif]"
export const LANDING_SCRIPT = "font-['Dancing_Script',_cursive]"

export const LANDING_CONTAINER = 'mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12 xl:px-20'

/** Designed at `baseWidthPx`; wider windows zoom up to `max`, narrower stay at 1. */
export const LANDING_ZOOM = {
  baseWidthPx: 1536,
  max: 1.25,
  cssVar: '--landing-zoom',
} as const

export const LANDING_MINT_CHIP = 'bg-[#d8f1db] text-[var(--cares-primary)]'

export const LANDING_SECTION_IDS = {
  home: 'home',
  about: 'about',
  programs: 'programs',
  highlights: 'highlights',
  homeStats: 'at-a-glance',
  objectives: 'objectives',
  organization: 'organization',
} as const

export const landingSectionPath = (sectionId: string) => `${HOME_PATH}#${sectionId}`

/** Thin band 30% down the viewport marks the active section. */
export const LANDING_ACTIVE_SECTION_ROOT_MARGIN = '-30% 0px -69% 0px'

/** All motion also honours prefers-reduced-motion. */
export const LANDING_MOTION = {
  revealMs: 700,
  staggerMs: 70,
  orgStaggerMs: 80,
  highlightStaggerMs: 110,
  aboutStaggerMs: 120,
  badgeIconDropMs: 340,
  badgeRulesGrowMs: 380,
  wordBounceStartMs: 750,
  wordBounceStepMs: 110,
  letterStepMs: 50,
  bannerWordStepMs: 80,
  bannerAccentGapMs: 150,
  bannerLineAfterAccentMs: 200,
  bannerTextAfterAccentMs: 350,
  bannerShimmerAfterAccentMs: 500,
  /** Must match the 900ms unroll in index.css. */
  unfurlMs: 900,
  unfurlContentStartMs: 250,
  unfurlContentStepMs: 90,
  aboutTiltDeg: 2,
  aboutLiftPx: 4,
  processLiftPx: 5,
  countUpMs: 1600,
  heroStepMs: 120,
  headerShadowOffsetPx: 8,
  heroSlideMs: 3000,
  heroFadeMs: 1000,
  heroIntroFadeMs: 1400,
} as const

export const LANDING_HERO_HEADLINE: readonly string[] = [
  'One Mission,',
  'One Community,',
  'One Purpose.',
] as const
export const LANDING_HERO_TAGLINE = 'Together, UCLM CARES.'
export const LANDING_HERO_ACCENT = 'text-[#f3e5bf]'
export const LANDING_HERO_ACCENT_BG = 'bg-[#f3e5bf]'

export const LANDING_HERO_BACKGROUNDS: readonly string[] = [
  caresMembers,
  heroBackground,
  cteCleanUpDrive,
  computerLiteracy,
  bogoReliefTeam,
  basicEdTutorial,
  maritimeCaresVdrc,
  alsFunRun,
  waterReliefDistribution,
  caresBannerVdrc,
  lnkLeadershipAssembly,
] as const

export const LANDING_NAV_LINKS: readonly { label: string; to: string; sectionId: string }[] = [
  { label: 'Home', to: HOME_PATH, sectionId: LANDING_SECTION_IDS.home },
  {
    label: 'About',
    to: landingSectionPath(LANDING_SECTION_IDS.about),
    sectionId: LANDING_SECTION_IDS.about,
  },
  {
    label: 'Programs',
    to: landingSectionPath(LANDING_SECTION_IDS.programs),
    sectionId: LANDING_SECTION_IDS.programs,
  },
  {
    label: 'Highlights',
    to: landingSectionPath(LANDING_SECTION_IDS.highlights),
    sectionId: LANDING_SECTION_IDS.highlights,
  },
] as const

export const LANDING_BULLETIN = {
  // volume: 'Vol. 2, No. 1, 2025',
  // issn: 'ISSN 3082-5504',
  schoolYear: 'School Year 2024–2025',
} as const

export type LandingCollageSlot = 'feature' | 'top' | 'middle' | 'bottom' | 'corner'

export interface LandingCollagePhoto {
  src: string
  alt: string
  slot: LandingCollageSlot
}

export const LANDING_COLLAGE_PHOTOS: readonly LandingCollagePhoto[] = [
  {
    src: loocReads,
    alt: 'A volunteer reading with a pupil during Looc READS',
    slot: 'feature',
  },
  {
    src: alsFunRun,
    alt: 'ALS learners at the walkathon and fun run',
    slot: 'top',
  },
  {
    src: caresMembers,
    alt: 'CARES coordinators and volunteers gathered together',
    slot: 'middle',
  },
  {
    src: computerLiteracy,
    alt: 'Computer Literacy Program orientation in the auditorium',
    slot: 'bottom',
  },
  {
    src: tutorialProgram,
    alt: 'Student volunteers tutoring children from Barangay Looc',
    slot: 'corner',
  },
] as const

export interface LandingImpactStat {
  count: number
  suffix?: string
  label: string
  source: string
  icon: LucideIcon
}

export const LANDING_IMPACT: readonly LandingImpactStat[] = [
  {
    count: 4,
    label: 'adopted barangays',
    source: 'Looc, Opao, Umapad and Paknaan',
    icon: Users,
  },
  {
    count: 123,
    label: 'blood bags collected',
    source: 'Bloodletting with VSMMC, March 2025',
    icon: Droplet,
  },
  {
    count: 500,
    label: 'books donated',
    source: 'Lusong Elementary School, July 2024',
    icon: BookOpen,
  },
  {
    count: 150,
    suffix: '+',
    label: 'ALS learners reached',
    source: 'CTE walkathon & fun run, May 2025',
    icon: Users,
  },
] as const

export const LANDING_VISION =
  'Fosters a visible community extension program that gives hope and transforms lives.'

export const LANDING_MISSION =
  'Carry out integrated and sustainable extension programs responsive to social, economic and environmental needs.'

export type LandingProcessGlyph = 'people' | 'handshake' | 'sprout'

export interface LandingAboutCard {
  title: string
  glyph: LandingProcessGlyph
}

export interface LandingStatement {
  title: string
  text: string
}

export const LANDING_STATEMENTS: readonly LandingStatement[] = [
  { title: 'Our Vision', text: LANDING_VISION },
  { title: 'Our Mission', text: LANDING_MISSION },
] as const

export const LANDING_CORE_PROCESSES: readonly LandingAboutCard[] = [
  { title: 'Community Awareness', glyph: 'people' },
  { title: 'Community Relations', glyph: 'handshake' },
  { title: 'Community Extension Services', glyph: 'sprout' },
] as const

export const LANDING_OBJECTIVES: readonly string[] = [
  'Maintain harmonious relations with the partner and wider communities.',
  'Enhance instruction through research-based extension programs.',
  'Promote coherence of extension programs among the different campuses and sectors of the school and those of the partner communities through appropriate mobilization and sharing of resources.',
] as const

export const LANDING_OPPORTUNITIES_OBJECTIVE = 'Create opportunities in the service programs for:'

export const LANDING_OPPORTUNITIES: readonly string[] = [
  'Involvement of the faculty, students, support staff and alumni.',
  'Empowerment of people to take action on social, economic and environmental issues.',
  "Collaboration in community development programs and the promotion of people's welfare agenda.",
] as const

export interface LandingStory {
  title: string
  department: string
  summary: string
  image: string
  imageAlt: string
}

export const LANDING_STORIES: readonly LandingStory[] = [
  {
    title: 'Looc READS enters its fourth year',
    department: 'College of Teacher Education',
    summary:
      'The flagship reading program relaunched with 153 participants — 130 pupils, CMCES teachers and Barangay Looc stakeholders — turning non-readers into fluent readers.',
    image: loocReads,
    imageAlt: 'A volunteer guiding a pupil through a reading activity',
  },
  {
    title: 'ALS dreams in motion',
    department: 'College of Teacher Education',
    summary:
      'Over 150 Alternative Learning System learners, many of them out-of-school youth, joined the first-ever ALS Walkathon and Fun Run on the Annex 1 grounds.',
    image: alsFunRun,
    imageAlt: 'ALS learners smiling during the fun run',
  },
  {
    title: 'Computer literacy for students and parents',
    department: 'College of Computer Studies',
    summary:
      'CCS kicked off its Computer Literacy Program with an orientation for students and parents, followed by hands-on training in productivity tools.',
    image: computerLiteracy,
    imageAlt: 'Program participants gathered in the auditorium',
  },
  {
    title: 'Every child deserves to learn',
    department: 'Basic Education Department',
    summary:
      'From March 21 to April 22, teacher and student volunteers tutored children from Barangays Looc and Opao in Math, Science and English, ending with badges and certificates.',
    image: basicEdTutorial,
    imageAlt: 'Basic Education volunteers with the children they tutored',
  },
  {
    title: 'One mangrove at a time',
    department: 'Senior High School Department',
    summary:
      'SHS CARES, the Federation of Young Innovators and Maritime CARES planted mangrove seedlings along the shores of Lawis, Subabasbas, Lapu-Lapu City on April 26, 2025.',
    image: mangrovePlanting,
    imageAlt: 'Volunteers gathered on the shore after the mangrove planting',
  },
  {
    title: 'Celebrating ALS mentors and learners',
    department: 'College of Teacher Education',
    summary:
      'The two-day ALS culmination brought mentors, student volunteers and learners from the Lapu-Lapu and Mandaue divisions together for a walkathon, fun run and Zumba session.',
    image: alsCulmination,
    imageAlt: 'ALS mentors and learners during the culmination program',
  },
] as const

export interface LandingUpdate {
  date: string
  title: string
  detail: string
}

export const LANDING_UPDATES: readonly LandingUpdate[] = [
  {
    date: 'Jul 31, 2024',
    title: '500 books for Lusong Elementary School',
    detail: 'A donation to grow the school’s reading resources.',
  },
  {
    date: 'Sep 21, 2024',
    title: 'World Clean Up Day',
    detail: 'Faculty, staff, students and alumni cleaned Looc, Opao and Umapad.',
  },
  {
    date: 'Sep 26, 2024',
    title: 'Barangay Umapad adopted',
    detail: 'Programs presented to purok leaders and sectoral representatives.',
  },
  {
    date: 'Dec 7, 2024',
    title: 'Christmas gift-giving',
    detail: 'Children and families from four partner barangays at Annex 2.',
  },
  {
    date: 'Jan 31, 2025',
    title: 'Fire relief with Pilipinas Shell Foundation',
    detail: 'Food packs and hygiene kits for families in Looc and Opao.',
  },
  {
    date: 'Mar 1, 2025',
    title: 'Medical mission & bloodletting',
    detail: '123 bags of blood collected with VSMMC and UC School of Medicine.',
  },
  {
    date: 'May 30, 2025',
    title: '3rd CARES Exemplar Award',
    detail: 'Honouring volunteers, coordinators, partners and barangays.',
  },
  {
    date: 'Jun 24, 2025',
    title: 'Recognised by VSMMC',
    detail: 'For outstanding contribution to mobile blood donation drives.',
  },
] as const

export const LANDING_CONTACT = {
  email: 'cares.lm@uc.edu.ph',
  phone: '(032) 345-6666 loc. 6217',
  address: 'A.C. Cortes Avenue, Looc, Mandaue City, 6014 Cebu',
} as const
