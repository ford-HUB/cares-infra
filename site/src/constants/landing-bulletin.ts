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

/** Public landing copy drawn from the UCLM CARES Bulletin (Vol. 1 2023–2024 and
 *  Vol. 2 2024–2025). Static content — the public page fetches nothing. */

/** Serif display face echoing the bulletin's headings (loaded in index.css). */
export const LANDING_SERIF = "font-['Libre_Baskerville',_Georgia,_serif]"

/** Condensed sans for poster-style uppercase headlines. */
export const LANDING_CONDENSED = "font-['Oswald',_'Arial_Narrow',_sans-serif]"

/** Bold book serif for the section banners, whose last words take a gold italic. */
export const LANDING_BANNER_SERIF = "font-['Lora',_Georgia,_serif]"

/** Soft, heavy display serif for headings set over a lime brush stroke. */
export const LANDING_BRUSH_SERIF = "font-['Fraunces',_Georgia,_serif]"

/** Heavy slab serif for section headings with an italic accent word. */
export const LANDING_SLAB = "font-['Bitter',_Georgia,_serif]"

/** Formal display serif for short, emphasised statements. */
export const LANDING_DISPLAY_SERIF = "font-['Playfair_Display',_Georgia,_serif]"

/** Hero headline: a heavy geometric sans, with a handwritten accent line beneath. */
export const LANDING_DISPLAY = "font-['Montserrat',_ui-sans-serif,_sans-serif]"
export const LANDING_SCRIPT = "font-['Dancing_Script',_cursive]"

/** Shared content width for every landing section: wide, with even edge gaps
 *  (about 80px each side on a desktop browser) so text lines up with the header. */
export const LANDING_CONTAINER = 'mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12 xl:px-20'

/** Desktop scale for the public site. The layout is designed at `baseWidthPx` of CSS
 *  width; wider windows zoom it up (up to `max`, i.e. 125%) so a 1920px screen at 100%
 *  browser zoom looks like the 1536px-wide design. Narrower windows stay at 1 and fall
 *  back to the normal responsive breakpoints. */
export const LANDING_ZOOM = {
  baseWidthPx: 1536,
  max: 1.25,
  cssVar: '--landing-zoom',
} as const

/** The pale-green icon chip from the Home page's partners. */
export const LANDING_MINT_CHIP = 'bg-[#d8f1db] text-[var(--cares-primary)]'

/** In-page anchors. Home through Highlights are the sections of the one-page public site. */
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

/** A thin line 30% down the viewport: the section crossing it is the one being read. */
export const LANDING_ACTIVE_SECTION_ROOT_MARGIN = '-30% 0px -69% 0px'

/** Landing-page motion timings. Every animation also honours prefers-reduced-motion. */
export const LANDING_MOTION = {
  revealMs: 700,
  staggerMs: 70,
  /** Org chart: a gentler cascade between its cards on entry. */
  orgStaggerMs: 80,
  /** Highlights: the beat between stories as each row fades up. */
  highlightStaggerMs: 110,
  /** About cards: the beat between cards on entry, the poster tilt cap and hover lift. */
  aboutStaggerMs: 120,
  /** "Watch CARES in Action" play badge: after the frame starts falling, when the play
   *  triangle drops in and when the side rules start spreading out from it. */
  badgeIconDropMs: 340,
  badgeRulesGrowMs: 380,
  /** "Watch CARES in Action": wait before the first word bounces in (after the badge
   *  above it has assembled), then the gap between words. */
  wordBounceStartMs: 750,
  wordBounceStepMs: 110,
  /** Letter-by-letter heading reveal: the gap between one letter and the next. */
  letterStepMs: 50,
  /** Section banner titles: the gap between white words rising, then the pauses before
   *  the gold words, the underline, the description, and the shimmer (after the gold). */
  bannerWordStepMs: 80,
  bannerAccentGapMs: 150,
  bannerLineAfterAccentMs: 200,
  bannerTextAfterAccentMs: 350,
  bannerShimmerAfterAccentMs: 500,
  /** Director's scroll: how long it takes to unroll (matching the 900ms in index.css),
   *  when its contents start fading up, and the beat between them. */
  unfurlMs: 900,
  unfurlContentStartMs: 250,
  unfurlContentStepMs: 90,
  aboutTiltDeg: 2,
  aboutLiftPx: 4,
  /** Core Processes cards lift a little further on hover. */
  processLiftPx: 5,
  countUpMs: 1600,
  heroStepMs: 120,
  headerShadowOffsetPx: 8,
  /** Hero background: how long each photo holds, and how long the crossfade takes. */
  heroSlideMs: 3000,
  heroFadeMs: 1000,
  /** Hero background fade-in from the solid colour when the page first loads. */
  heroIntroFadeMs: 1400,
} as const

/** Hero headline, one line per phrase, and the script line beneath it. */
export const LANDING_HERO_HEADLINE: readonly string[] = [
  'One Mission,',
  'One Community,',
  'One Purpose.',
] as const
export const LANDING_HERO_TAGLINE = 'Together, UCLM CARES.'
/** Warm cream for the key word of each headline phrase ("Mission", "Community", "Purpose"). */
export const LANDING_HERO_ACCENT = 'text-[#f3e5bf]'
/** The same cream as a fill, for the tagline ribbon's first trailing stripe. */
export const LANDING_HERO_ACCENT_BG = 'bg-[#f3e5bf]'

/** Photos the hero background crossfades between, under the CARES tint. */
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

/** Public site navigation — one section of the single page per entry. */
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

/** Shapes in the hero's leaf collage (see landing-leaf-collage). */
export type LandingCollageSlot = 'feature' | 'top' | 'middle' | 'bottom' | 'corner'

export interface LandingCollagePhoto {
  src: string
  alt: string
  slot: LandingCollageSlot
}

/** One large feature leaf on the left, four smaller ones clustered to its right. */
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

/** A core-process card on the About page: an icon above its title. */
/** Which solid icon a core process shows (drawn in landing-process-glyphs.tsx). */
export type LandingProcessGlyph = 'people' | 'handshake' | 'sprout'

export interface LandingAboutCard {
  title: string
  glyph: LandingProcessGlyph
}

/** A poster-style statement: a condensed headline above its text. */
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

/** The text card that opens the Objectives grid; `highlight` gets a marker underlay. */
export const LANDING_OBJECTIVES: readonly string[] = [
  'Maintain harmonious relations with the partner and wider communities.',
  'Enhance instruction through research-based extension programs.',
  'Promote coherence of extension programs among the different campuses and sectors of the school and those of the partner communities through appropriate mobilization and sharing of resources.',
] as const

/** The fourth objective, which the source breaks into lettered points. */
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
