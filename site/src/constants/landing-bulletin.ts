import { BookOpen, Droplets, GraduationCap, HeartHandshake, type LucideIcon } from 'lucide-react'
import { ABOUT_PATH, HIGHLIGHTS_PATH, HOME_PATH, PROGRAMS_PATH, STAFF_PORTAL_PATH } from './routes'
import alsCulmination from '../assets/landing_page/photos/als-culmination.jpg'
import alsFunRun from '../assets/landing_page/photos/als-fun-run.jpg'
import basicEdTutorial from '../assets/landing_page/photos/basic-ed-tutorial.jpg'
import computerLiteracy from '../assets/landing_page/photos/computer-literacy.jpg'
import heroBackground from '../assets/landing_page/photos/hero-background.jpg'
import loocReads from '../assets/landing_page/photos/looc-reads.jpg'
import mangrovePlanting from '../assets/landing_page/photos/mangrove-planting.jpg'
import tutorialProgram from '../assets/landing_page/photos/tutorial-program.jpg'

/** Public landing copy drawn from the UCLM CARES Bulletin (Vol. 1 2023–2024 and
 *  Vol. 2 2024–2025). Static content — the public page fetches nothing. */

/** Serif display face echoing the bulletin's headings (loaded in index.css). */
export const LANDING_SERIF = "font-['Libre_Baskerville',_Georgia,_serif]"

/** In-page anchors that remain once the landing site is split into pages. */
export const LANDING_SECTION_IDS = {
  homeStats: 'at-a-glance',
  goals: 'goals',
  organization: 'organization',
} as const

/** Landing-page motion timings. Every animation also honours prefers-reduced-motion. */
export const LANDING_MOTION = {
  revealMs: 700,
  staggerMs: 70,
  countUpMs: 1600,
  heroStepMs: 120,
  headerShadowOffsetPx: 8,
  /** Hero background: how long each photo holds, and how long the crossfade takes. */
  heroSlideMs: 6500,
  heroFadeMs: 1500,
  /** Hero background fade-in from the solid colour when the page first loads. */
  heroIntroFadeMs: 1400,
} as const

/** Photos the hero background crossfades between, under the CARES tint. */
export const LANDING_HERO_BACKGROUNDS: readonly string[] = [
  heroBackground,
  computerLiteracy,
  basicEdTutorial,
  alsFunRun,
] as const

/** Public site navigation — one page per entry. `end` keeps Home from matching
 *  every child path. */
export const LANDING_NAV_LINKS: readonly { label: string; to: string; end?: boolean }[] = [
  { label: 'Home', to: HOME_PATH, end: true },
  { label: 'About', to: ABOUT_PATH },
  { label: 'Programs', to: PROGRAMS_PATH },
  { label: 'Highlights', to: HIGHLIGHTS_PATH },
  { label: 'Portal', to: STAFF_PORTAL_PATH },
] as const

export const LANDING_BULLETIN = {
  // volume: 'Vol. 2, No. 1, 2025',
  // issn: 'ISSN 3082-5504',
  schoolYear: 'School Year 2024–2025',
} as const

export interface LandingHexPhoto {
  src: string
  alt: string
  /** Honeycomb slot: x in hex widths, y in rows (see landing-hex-mosaic). */
  x: number
  y: number
}

/** Seven-cell honeycomb, centre cell (x 1, y 1) holds the CARES seal. */
export const LANDING_HEX_PHOTOS: readonly LandingHexPhoto[] = [
  {
    src: loocReads,
    alt: 'A volunteer reading with a pupil during Looc READS',
    x: 0.5,
    y: 0,
  },
  {
    src: alsFunRun,
    alt: 'ALS learners at the walkathon and fun run',
    x: 1.5,
    y: 0,
  },
  {
    src: basicEdTutorial,
    alt: 'Basic Education tutorial program volunteers and pupils',
    x: 0,
    y: 1,
  },
  {
    src: computerLiteracy,
    alt: 'Computer Literacy Program orientation in the auditorium',
    x: 2,
    y: 1,
  },
  {
    src: tutorialProgram,
    alt: 'Student volunteers tutoring children from Barangay Looc',
    x: 0.5,
    y: 2,
  },
  {
    src: alsCulmination,
    alt: 'ALS mentors and learners at the culmination program',
    x: 1.5,
    y: 2,
  },
] as const

export interface LandingImpactStat {
  /** Animated from 0 when the strip scrolls into view. */
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
    icon: HeartHandshake,
  },
  {
    count: 123,
    label: 'blood bags collected',
    source: 'Bloodletting with VSMMC, March 2025',
    icon: Droplets,
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
    icon: GraduationCap,
  },
] as const

export const LANDING_VISION =
  'Fosters a visible community extension program that gives hope and transforms lives.'

export const LANDING_MISSION =
  'Carry out integrated and sustainable extension programs responsive to social, economic and environmental needs.'

/** The bulletin calls these its objectives; the public site presents them as goals. */
export const LANDING_GOALS: readonly string[] = [
  'Maintain harmonious relations with the partner and wider communities.',
  'Enhance instruction through research-based extension programs.',
  'Promote coherence of extension programs among the campuses, sectors of the school and partner communities through the mobilization and sharing of resources.',
] as const

export const LANDING_OPPORTUNITIES: readonly string[] = [
  'Involvement of the faculty, students, support staff and alumni.',
  'Empowerment of people to act on social, economic and environmental issues.',
  "Collaboration in community development and the promotion of people's welfare.",
] as const

export interface LandingProgram {
  acronym: string
  name: string
  department: string
  activities: readonly string[]
}

export const LANDING_PROGRAMS: readonly LandingProgram[] = [
  {
    acronym: 'GATE',
    name: 'Greening and Academic Tutorial Enrichment',
    department: 'Basic Education',
    activities: ['Seedling giveaways', 'School gardening', 'Academic tutorial for literacy'],
  },
  {
    acronym: 'Youth SMILE',
    name: 'Supporting Mental-health and Improving Literacy for Empowerment',
    department: 'Senior High School',
    activities: ['Peer academic tutorial', 'Youth empowerment webinars', 'Be Job Ready workshop'],
  },
  {
    acronym: 'Adopt a Learner',
    name: 'CTE CARES literacy and ALS assistance',
    department: 'Teacher Education',
    activities: ['Looc READS reading tutorial', 'ALS assistance, Lapu-Lapu & Mandaue'],
  },
  {
    acronym: 'BUILD',
    name: 'Business Upliftment through Innovation, Literacy and Development',
    department: 'Business and Accountancy',
    activities: ['Basic business seminar', 'Bookkeeping', 'Product costing'],
  },
  {
    acronym: 'GLOBE',
    name: 'Guiding Local Opportunities into Business Expansion',
    department: 'Customs Administration',
    activities: ['SME seminars', 'Awareness campaigns'],
  },
  {
    acronym: 'CLiP',
    name: 'Computer Literacy Program',
    department: 'Computer Studies',
    activities: ['MS Office applications', 'Google productivity tools', 'Graphic design'],
  },
  {
    acronym: 'SELF CARE',
    name: 'Social Empowerment and Lawful Fulfillment through Community Awareness, Resilience and Engagement',
    department: 'Criminology',
    activities: ['Barangay Public Safety Officer training', 'Seminars', 'Awareness'],
  },
  {
    acronym: 'LIGHT',
    name: 'Learning Innovation through Guided Hands-on Training',
    department: 'Engineering',
    activities: ['Welding', 'Computer maintenance & repair', 'Electrical installation'],
  },
  {
    acronym: 'SALT',
    name: 'Skills and Livelihood Training Program',
    department: 'Hospitality & Tourism Management',
    activities: ['Housekeeping NC II', 'Cookery NC II', 'Food & beverage services'],
  },
  {
    acronym: 'HELP',
    name: 'Health Education and Literacy Program',
    department: 'Nursing',
    activities: ['Diabetes & hypertension societies', 'Disaster nursing', 'Mental health society'],
  },
  {
    acronym: 'SAILOR',
    name: 'Seafarers Alternate Information, Learning and Providing Opportunities through sharing of Resources',
    department: 'Marine Engineering & Transportation',
    activities: ['Pump boat engine literacy', 'Basic seamanship', 'Coastal clean-up & mangroves'],
  },
  {
    acronym: 'Stewardship',
    name: 'Environmental Stewardship Program',
    department: 'Non-teaching staff',
    activities: ['Tree in a Pot', 'Donation drives', 'Butuanon River water quality'],
  },
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

export const LANDING_BARANGAYS: readonly { name: string; city: string }[] = [
  { name: 'Looc', city: 'Mandaue City' },
  { name: 'Opao', city: 'Mandaue City' },
  { name: 'Umapad', city: 'Mandaue City' },
  { name: 'Paknaan', city: 'Mandaue City' },
] as const

export const LANDING_PARTNERS: readonly string[] = [
  'Vicente Sotto Memorial Medical Center',
  'Pilipinas Shell Foundation',
  'A-PAD Philippines',
  'Bidlisiw Foundation',
  'Caritas Germany–Cambodia',
  'Department of Agriculture',
  'Waterfront Hotels & Casino',
  'Dugong Alay, Dugtong Buhay',
] as const

export const LANDING_CONTACT = {
  email: 'cares.lm@uc.edu.ph',
  phone: '(032) 345-6666 loc. 6217',
  address: 'A.C. Cortes Avenue, Looc, Mandaue City, 6014 Cebu',
} as const
