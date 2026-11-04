/** Programs page content, taken from the UCLM CARES Bulletin, Vol. 2, No. 1 (2025).
 *  Static content — the public page fetches nothing. Dates are kept as published,
 *  including those outside the cover's school-year range. */

/** Not /programs: a public folder named like the route would shadow it on static hosts. */
const PROGRAMS_ASSETS = '/program-assets'

const programPhoto = (slug: string) => `${PROGRAMS_ASSETS}/photos/${slug}.jpg`
const programLogo = (slug: string) => `${PROGRAMS_ASSETS}/logos/${slug}.png`

/** The scanned bulletin page an activity was reported on. */
export const bulletinPagePhoto = (page: number) =>
  `${PROGRAMS_ASSETS}/pages/page-${String(page).padStart(2, '0')}.jpg`

export const bulletinPageAlt = (page: number) => `Scanned UCLM CARES bulletin page ${page}`

/** Shown for a unit with no `logo` set. Every unit currently has one (cut from the
 *  department logo sheet); Basic Education uses the UC seal itself.
 *  To change one, replace its file in public/program-assets/logos/. */
export const LANDING_PROGRAM_FALLBACK_LOGO = programLogo('university-of-cebu')

export const LANDING_PROGRAMS_COPY = {
  eyebrow: 'Our Programs',
  title: { before: 'Extending Knowledge,', accent: 'Serving Communities' },
  description:
    'Discover the departmental programs and community extension activities led by UCLM CARES.',
  searchPlaceholder: 'Search programs and activities...',
  empty: 'No matching department or activity found.',
  noActivities:
    "The bulletin lists this unit's Environmental Stewardship Program components on page 5, but it does not provide a dedicated activity article under this unit in the departmental-updates section. No additional activities have been assumed.",
  noPhoto: 'Official Program Components · Bulletin page 5',
  fullDisplay: 'Full display',
} as const

/** Query param holding the department whose dialog is open on the Programs page. */
export const LANDING_PROGRAM_DEPARTMENT_PARAM = 'department'

/** Colour of a card's program label. */
/** Pill text colour, matched to the dominant colour of each unit's logo. */
export const LANDING_PROGRAM_TONES = {
  navy: 'text-blue-950',
  blue: 'text-blue-800',
  green: 'text-green-800',
  violet: 'text-violet-800',
  red: 'text-red-800',
  orange: 'text-orange-700',
  yellow: 'text-yellow-800',
  black: 'text-neutral-900',
} as const

export type LandingProgramTone = keyof typeof LANDING_PROGRAM_TONES

export interface LandingProgramActivity {
  title: string
  /** As printed: a single page, or a range like '15–17'. */
  pages: string
  /** First page of `pages`, the one shown when the activity card is clicked. */
  sourcePage: number
  /** Left out where the bulletin article gives no date. */
  date?: string
  summary: string
}

export interface LandingDepartmentProgram {
  id: string
  department: string
  program: string
  /** Left out where the department has no tagline of its own. */
  tagline?: string
  /** Left out to show LANDING_PROGRAM_FALLBACK_LOGO. */
  logo?: string
  tone: LandingProgramTone
  photo?: string
  photoPage?: number
  /** The bulletin names this program, rather than only labelling the department. */
  namedInBulletin: boolean
  highlights: readonly string[]
  components: readonly string[]
  activities: readonly LandingProgramActivity[]
}

export const LANDING_DEPARTMENT_PROGRAMS: readonly LandingDepartmentProgram[] = [
  {
    id: 'basic-education',
    department: 'BASIC EDUCATION',
    program: 'Basic Education CARES',
    logo: programLogo('university-of-cebu'),
    tone: 'navy',
    photo: programPhoto('basic-education'),
    photoPage: 7,
    namedInBulletin: false,
    highlights: ['Tutorial program', 'Seedling giveaway', 'Agricultural seminar', 'Gift-giving'],
    components: [],
    activities: [
      {
        title: 'Basic Education CARES Tutorial Program — Every Child Deserves to Learn',
        pages: '7',
        sourcePage: 7,
        date: 'March 21–April 22, 2025',
        summary:
          'Children from Barangays Looc and Opao received tutorials, including Math, Science, and English.',
      },
      {
        title: 'CARES Completes Seedling Giveaway and Garden Visit for Environmental Awareness',
        pages: '8',
        sourcePage: 8,
        date: 'September 28 and October 3, 2024',
        summary:
          'Seedlings were distributed to Barangays Looc and Opao; Grades 7–10 students participated in garden visits.',
      },
      {
        title:
          '2-Day Agricultural Seminar: Gardening: Planting, Plowing, Seeding and Giving of Seeds',
        pages: '9',
        sourcePage: 9,
        date: 'October 8 and 25, 2024',
        summary:
          'Gardening seminar with demonstrations and seed distribution supported by the Department of Agriculture.',
      },
      {
        title:
          "Spreading Joy and School Supplies: Basic Ed. CARES Brings Christmas Cheer to UCLM's Adopted Barangays",
        pages: '10',
        sourcePage: 10,
        summary:
          'Christmas activities and school-supply giving for children in Looc, Opao, Umapad, and Paknaan.',
      },
    ],
  },
  {
    id: 'senior-high-school',
    department: 'SENIOR HIGH SCHOOL',
    program: 'UCLM SHS CARES',
    tagline: 'Activities reported by the Senior High School Department',
    logo: programLogo('senior-high-school'),
    tone: 'blue',
    photo: programPhoto('senior-high-school'),
    photoPage: 12,
    namedInBulletin: false,
    highlights: [
      'Kaangpingan',
      'Medical mission and bloodletting',
      'Mangrove planting',
      'Project Happiness',
    ],
    components: [],
    activities: [
      {
        title: 'Kaang Pingan — Recall Seminar',
        pages: '11',
        sourcePage: 11,
        date: 'September 28, 2024',
        summary:
          'Recall seminar for the Kaangpingan campaign promoting plant care and campus sustainability.',
      },
      {
        title: 'Medical Mission and Bloodletting Program',
        pages: '12',
        sourcePage: 12,
        date: 'March 1, 2025',
        summary:
          'Free consultations and community health services delivered with UCLM CARES and partner institutions.',
      },
      {
        title: 'Mangrove Planting w/ FYI',
        pages: '13',
        sourcePage: 13,
        date: 'April 26, 2025',
        summary:
          'Mangrove planting in Lawis, Subabasbas, Lapu-Lapu City with FYI, Maritime CARES, and residents.',
      },
      {
        title: 'Project Happiness w/ SHS Department Organizations and Sub-Organizations',
        pages: '14',
        sourcePage: 14,
        date: 'December 12, 2024',
        summary:
          'Appreciation event with performances and gift-giving for campus security guards, janitorial staff, and support personnel.',
      },
    ],
  },
  {
    id: 'teacher-education',
    department: 'TEACHER EDUCATION',
    program: 'CTE CARES',
    tagline: 'Alternative Learning System, literacy, and relief initiatives reported by CTE',
    logo: programLogo('teacher-education'),
    tone: 'blue',
    photo: programPhoto('teacher-education'),
    photoPage: 18,
    namedInBulletin: false,
    highlights: ['ALS walkathon and fun run', 'Looc R-E-A-D-S', 'Earthquake and typhoon relief'],
    components: [],
    activities: [
      {
        title:
          'CTE ALS Walkathon & Fun Run 2025: Lakaw Ta Kuyog, Dagan Ta’g Kusog: ALS Damgo Nagalihok',
        pages: '15–17',
        sourcePage: 15,
        date: 'May 2–3, 2025',
        summary:
          'Two-day ALS culmination with walkathon, fun run, and Zumba, involving ALS learners and volunteers.',
      },
      {
        title: 'Looc R-E-A-D-S Year 4 Kicks Off: CTE Brings Excellence (ARETE) to Young Learners',
        pages: '18–19',
        sourcePage: 18,
        date: 'September 24, 2025',
        summary:
          'Reading Engagement and Development Service activities combined reading with traditional Filipino games.',
      },
      {
        title: 'CTE CARES: On the Ground for Earthquake and Typhoon Relief',
        pages: '20–21',
        sourcePage: 20,
        date: 'October–November 2025',
        summary:
          'CTE CARES held a donation drive, repacked relief goods, and delivered assistance to affected communities.',
      },
    ],
  },
  {
    id: 'business-accountancy',
    department: 'BUSINESS & ACCOUNTANCY',
    program: 'CBA CARES',
    tagline: 'Activities reported by the College of Business and Accountancy',
    logo: programLogo('business-accountancy'),
    tone: 'green',
    photo: programPhoto('business-accountancy'),
    photoPage: 22,
    namedInBulletin: false,
    highlights: [
      'General orientation',
      'Savings and investment',
      'World Clean-Up Day',
      'Christmas gift-giving',
    ],
    components: [],
    activities: [
      {
        title: 'CBA CARES General Orientation',
        pages: '22',
        sourcePage: 22,
        date: 'September 25, 2024',
        summary: 'Orientation themed “Empower. Engage. Evolve: A Journey with CBA-CARES.”',
      },
      {
        title: 'Smart Choices, Bright Future: The Essentials of Savings and Investment',
        pages: '23',
        sourcePage: 23,
        date: 'October 22, 2024',
        summary:
          'Financial literacy seminar for residents, local vendors, and small business owners in Barangay Paknaan.',
      },
      {
        title: 'CBA CARES Joins the World Clean-Up Day',
        pages: '24',
        sourcePage: 24,
        summary: 'Students joined the UCLM CARES World Clean-Up Day activity in Barangay Umapad.',
      },
      {
        title: 'CBA CARES Spotted Sharing Smile',
        pages: '25',
        sourcePage: 25,
        date: 'December 2024',
        summary:
          'CBA CARES volunteers joined the UCLM CARES Christmas Gift Giving Activity for children from four adopted barangays.',
      },
    ],
  },
  {
    id: 'customs-administration',
    department: 'CUSTOMS ADMINISTRATION',
    program: 'GLOBE',
    tagline: 'Guiding Local Opportunities to Business Expansion',
    logo: programLogo('customs-administration'),
    tone: 'navy',
    photo: programPhoto('customs-administration'),
    photoPage: 26,
    namedInBulletin: true,
    highlights: [
      'Customs broker seminar',
      'World Clean-Up Day',
      'Donation packing and distribution',
    ],
    components: [],
    activities: [
      {
        title:
          'Empowering SMEs: Understanding the Customs Broker Profession and the Basics of Import/Export for Business Expansion',
        pages: '26',
        sourcePage: 26,
        date: 'March 2, 2025',
        summary:
          'GLOBE seminar explaining customs brokerage and import/export procedures to support small and medium enterprises.',
      },
      {
        title: 'World Clean-Up Day with CCA CARES',
        pages: '27',
        sourcePage: 27,
        date: 'September 21, 2024',
        summary: 'CCA CARES joined the clean-up effort in Barangays Looc, Opao, and Umapad.',
      },
      {
        title: 'Donation Packing & Distribution',
        pages: '28',
        sourcePage: 28,
        date: 'April 2, 2025',
        summary:
          'CCA CARES joined the packing and distribution of relief goods for fire victims in Barangay Paknaan.',
      },
    ],
  },
  {
    id: 'computer-studies',
    department: 'COMPUTER STUDIES',
    program: 'CLiP',
    tagline: 'Computer Literacy Program',
    logo: programLogo('computer-studies'),
    tone: 'violet',
    photo: programPhoto('computer-studies'),
    photoPage: 29,
    namedInBulletin: true,
    highlights: [
      'MS Office applications',
      'Google productivity tools',
      'Computer & internet basics',
      'Graphic design',
      'CLiP immersion',
    ],
    components: [
      'Computer Literacy Training in MS Office Applications',
      'Computer Literacy Training in Google Productivity Tools',
      'Computer and Internet Basics Literacy Training',
      'Graphic Design',
      'CLiP Immersion',
    ],
    activities: [
      {
        title:
          'Empowering Communities: CCS Kicks Off Computer Literacy Program with Students and Parents Orientation',
        pages: '29',
        sourcePage: 29,
        date: 'August 17 and 24, 2024',
        summary:
          'Program orientation covering Microsoft Office, internet navigation, email, and Google Drive.',
      },
      {
        title: 'CCS Listens: Shaping Community Programs Together',
        pages: '30',
        sourcePage: 30,
        date: 'October 25–31, 2024',
        summary:
          'Needs assessment identifying digital literacy, technology access, and economic opportunity concerns.',
      },
      {
        title: 'CCS Volunteers at Work: Building a Culture of Compassion and Service',
        pages: '31',
        sourcePage: 31,
        summary:
          'CCS volunteers joined World Clean-Up Day and relief donation drives, and organized a Christmas gift-giving drive.',
      },
      {
        title: 'Computer Literacy Program — DIGITECH (Empowering Digital Technology)',
        pages: '32',
        sourcePage: 32,
        date: 'July 8–22, 2024',
        summary:
          'Eight days of computer literacy training covering Microsoft Office, internet navigation, email, and cloud collaboration.',
      },
      {
        title: 'Computer Literacy Program Culmination',
        pages: '33',
        sourcePage: 33,
        date: 'July 29, 2024',
        summary:
          'Program culmination recognizing participants’ computer literacy training and new digital skills.',
      },
    ],
  },
  {
    id: 'criminology',
    department: 'CRIMINOLOGY',
    program: 'SELF CARE',
    tagline:
      'Social Empowerment and Lawful Fulfillment through Community Awareness, Resilience and Engagement',
    logo: programLogo('criminology'),
    tone: 'navy',
    photo: programPhoto('criminology'),
    photoPage: 36,
    namedInBulletin: true,
    highlights: ['BPSO training', 'Seminar', 'Awareness'],
    components: ['Training for Barangay Police Security Officer', 'Seminar', 'Awareness'],
    activities: [
      {
        title: 'CARES Orientation & Leadership Training 2024',
        pages: '34',
        sourcePage: 34,
        date: 'October 19, 2024',
        summary:
          'Orientation highlighted community awareness, relations, and extension services and leadership.',
      },
      {
        title:
          'Building Bridges: Criminology Interns Completed Needs Assessment in Newly Adopted Barangay Paknaan',
        pages: '35',
        sourcePage: 35,
        date: 'October 31, 2024',
        summary: 'Criminology interns conducted a needs assessment in Barangay Paknaan.',
      },
      {
        title:
          'Strengthening Connections: Criminology Interns Visit Barangay Umapad under UCLM CARES',
        pages: '35',
        sourcePage: 35,
        date: 'November 2, 2024',
        summary: 'Criminology interns visited Barangay Umapad and conducted a needs assessment.',
      },
      {
        title: 'A Seminar on Public Accountability',
        pages: '36',
        sourcePage: 36,
        date: 'January 25, 2025',
        summary:
          'Seminar on Republic Act No. 6713 for Barangay Public Safety Officers from Looc and Opao.',
      },
      {
        title:
          'Criminology CARES Equips Students with Life-Saving Skills in Intensive BLS Training',
        pages: '37',
        sourcePage: 37,
        date: 'March 29, 2025',
        summary:
          'Hands-on Basic Life Support training with BDRRMO facilitators covering CPR, FBAO, and bandaging.',
      },
      {
        title: 'Community Safety Workshop',
        pages: '38',
        sourcePage: 38,
        summary:
          'Workshop on search and arrest techniques for Barangay Public Safety Officers from Opao and Umapad.',
      },
      {
        title: 'Mental Health & Psychosocial Support Training',
        pages: '39',
        sourcePage: 39,
        date: 'April 26, 2024',
        summary:
          'Criminology CARES participated in A-PAD Philippines training covering psychosocial first aid.',
      },
    ],
  },
  {
    id: 'engineering',
    department: 'ENGINEERING',
    program: 'LIGHT',
    tagline: 'Learning Innovation through Guided Hands-on Training',
    logo: programLogo('engineering'),
    tone: 'red',
    photo: programPhoto('engineering'),
    photoPage: 40,
    namedInBulletin: true,
    highlights: [
      'Welding training',
      'Computer maintenance & repair',
      'Electrical installation',
      'Consumer electronics',
    ],
    components: [
      'Welding Training',
      'Computer Maintenance and Repair Program',
      'Electrical Installation Program',
      'Consumer Electronics',
    ],
    activities: [
      {
        title:
          'Empowering Through Welding: Engineering CARES Completes SMAW Training for Bidlisiw Beneficiaries',
        pages: '40',
        sourcePage: 40,
        date: 'July 18, 2024',
        summary:
          'Fifteen-day Shielded Metal Arc Welding training with practical exercises for Bidlisiw beneficiaries.',
      },
      {
        title: 'DIGITECH: Empowering Communities Through Computer Hardware Training',
        pages: '41',
        sourcePage: 41,
        summary:
          'Hands-on computer hardware installation, maintenance, troubleshooting, and system assembly.',
      },
      {
        title:
          'Engineering Minds at Work: College of Engineering Holds Programming and Physics Tutorial for Senior High STEM Students',
        pages: '42',
        sourcePage: 42,
        summary: 'Programming and Physics tutorials for Senior High School STEM students.',
      },
    ],
  },
  {
    id: 'hospitality-tourism',
    department: 'HOSPITALITY & TOURISM MANAGEMENT',
    program: 'SALT',
    tagline: 'Skills and Livelihood Training Program',
    logo: programLogo('hospitality-tourism'),
    tone: 'orange',
    photo: programPhoto('hospitality-tourism'),
    photoPage: 44,
    namedInBulletin: true,
    highlights: [
      'Housekeeping leading to NC II',
      'Public area cleaning',
      'Food & beverage services',
      'Cookery NC II',
    ],
    components: [
      'Housekeeping leading to NC II',
      'Public Area Cleaning',
      'Food and Beverage Services',
      'Cookery NC II',
    ],
    activities: [
      {
        title: 'CHTM Empowers Through Training — Housekeeping Services Training',
        pages: '43',
        sourcePage: 43,
        date: 'June 2–July 7, 2025',
        summary:
          'Housekeeping services training with Bidlisiw Foundation, including guest services, laundry, room preparation, and public-area cleaning.',
      },
      {
        title: 'A Chance of a Lifetime: UCLM–CHTM CARES Cookery Program',
        pages: '44',
        sourcePage: 44,
        summary:
          'Cookery training with Bidlisiw Foundation, followed by NC II assessment and on-the-job training.',
      },
      {
        title:
          'A Culture of Care — Comprehensive Food Safety Session for the Ati Tribe, Naga Cebu City',
        pages: '45',
        sourcePage: 45,
        summary:
          'Food handling, sanitation, and safe storage session with the Ati community in Naga, Cebu.',
      },
      {
        title: '50 Years & Beyond',
        pages: '46',
        sourcePage: 46,
        date: 'December 18, 2024',
        summary:
          'Community-centered celebration organized by MICE and Catering Services students with CHTM CARES.',
      },
      {
        title: 'CHTM-CARES Joined UCLM CARES Annual Gift Giving Program',
        pages: '47',
        sourcePage: 47,
        date: 'December 7, 2024',
        summary: 'CHTM CARES supported the UCLM CARES Annual Gift Giving Program.',
      },
    ],
  },
  {
    id: 'nursing',
    department: 'NURSING',
    program: 'HELP',
    tagline: 'Health Education and Literacy Program',
    logo: programLogo('nursing'),
    tone: 'yellow',
    photo: programPhoto('nursing'),
    photoPage: 50,
    namedInBulletin: true,
    highlights: [
      'Diabetes Society',
      'Hypertension Society',
      'Disaster Nursing',
      'Renal Society',
      'Healthy Lung Club',
      'Mental Health Society',
    ],
    components: [
      'Diabetes Society',
      'Hypertension Society',
      'Disaster Nursing',
      'Renal Society',
      'Healthy Lung Club',
      'Mental Health Society',
    ],
    activities: [
      {
        title: 'Glimpse of Service / Bringing Sight and Service Closer to the Community',
        pages: '48–49',
        sourcePage: 48,
        date: 'June 10–13, 2025',
        summary:
          'Nursing volunteers participated in eye-care outreach offering cataract and pterygium surgeries and eye check-ups in Liloan.',
      },
      {
        title: 'Medical-Dental Caravan 2025 — Healing Beyond Borders',
        pages: '50–51',
        sourcePage: 50,
        date: 'June 27, 2025',
        summary:
          'Medical-dental caravan with consultations, health education, blood-sugar tests, visual-acuity tests, and other services.',
      },
      {
        title: 'National Women’s Month 2025',
        pages: '52',
        sourcePage: 52,
        date: 'April 6, 2025',
        summary:
          'Community celebration including a family planning seminar and breast self-examination demonstration.',
      },
      {
        title: 'Breast Care Matters',
        pages: '53',
        sourcePage: 53,
        summary:
          'Breast health awareness and consultations in collaboration with the Gender and Development Office.',
      },
    ],
  },
  {
    id: 'marine-engineering',
    department: 'MARINE ENGINEERING',
    program: 'SAILOR',
    tagline:
      'Seafarers Alternate Information, Learning and Providing Opportunities through sharing of Resources',
    logo: programLogo('marine-engineering'),
    tone: 'black',
    photo: programPhoto('marine-engineering'),
    photoPage: 55,
    namedInBulletin: true,
    highlights: [
      'Basic pump boat engine literacy',
      'Coastal clean-up and mangrove planting',
      'Welding training',
    ],
    components: [
      'Basic Pump Boat Engine Literacy',
      'Coastal Clean Up Drive and Mangrove Planting',
      'Welding Training',
    ],
    activities: [
      {
        title: 'Hands-On Learnings: Beneficiaries Excel in SMAW Training and Project Creation',
        pages: '54',
        sourcePage: 54,
        summary:
          'Hands-on Shielded Metal Arc Welding training and fabrication of practical metalwork projects.',
      },
      {
        title: 'Community United: Repacking Relief for Fire Victims',
        pages: '55',
        sourcePage: 55,
        summary: 'Marine Engineering students repacked food items for people affected by fire.',
      },
    ],
  },
  {
    id: 'maritime-transportation',
    department: 'MARITIME TRANSPORTATION',
    program: 'SAILOR',
    tagline:
      'Seafarers Alternate Information, Learning and Providing Opportunities through sharing of Resources',
    logo: programLogo('maritime-transportation'),
    tone: 'blue',
    photo: programPhoto('maritime-transportation'),
    photoPage: 59,
    namedInBulletin: true,
    highlights: [
      'Basic seamanship',
      'Navigation & collision regulation literacy',
      'Coastal clean-up and mangrove planting',
    ],
    components: [
      'Basic Seamanship',
      'Navigation & Collision Regulation Literacy',
      'Coastal Clean Up Drive and Mangrove Planting',
    ],
    activities: [
      {
        title: 'World Clean Up Day',
        pages: '56',
        sourcePage: 56,
        date: 'September 21, 2024',
        summary:
          'College of Marine Transportation volunteers took part in a coastal clean-up and maritime awareness drive.',
      },
      {
        title: 'MANA Mo 2024 — Maritime and Archipelagic Nation Awareness',
        pages: '57',
        sourcePage: 57,
        date: 'September 21, 2024',
        summary:
          'Maritime and Archipelagic Nation Awareness and proper waste disposal seminar for youth in Looc, Opao, and Umapad.',
      },
      {
        title: 'We Spark Hope Together',
        pages: '58',
        sourcePage: 58,
        date: 'April 2, 2025',
        summary:
          'Maritime students and MT CARES extended donations to fire victims in Barangay Paknaan.',
      },
      {
        title: 'Mangrove Tree Planting in Brgy. Suba Basbas',
        pages: '59',
        sourcePage: 59,
        date: 'April 26, 2025',
        summary:
          'Mangrove planting with Maritime CARES, SHS, environmental offices, and Barangay Suba Basbas.',
      },
    ],
  },
] as const

/** Only pages an activity cites are published in public/program-assets/pages/. */
export const isBulletinSourcePage = (page: number) =>
  LANDING_DEPARTMENT_PROGRAMS.some((program) =>
    program.activities.some((activity) => activity.sourcePage === page),
  )
