/** Highlights stories, drawn from the UCLM CARES Bulletin (Vol. 1 2024 and Vol. 2 2025).
 *  Static content — the public page fetches nothing. Photos live in public/timeline/{year}/,
 *  not public/highlights/: a folder named like the route would shadow it on static hosts. */

/** The topic tag on each story's photo, chosen from what the story is about. */
export type LandingHighlightCategory =
  | 'Academic Engagement'
  | 'Community Outreach'
  | 'Community Partnership'
  | 'Community Safety'
  | 'Education & Literacy'
  | 'Environment & Resilience'
  | 'Good Governance'
  | 'Health & Wellness'
  | 'Humanitarian Response'
  | 'Livelihood & Skills'
  | 'Recognition & Awards'
  | 'Youth & Leadership'

export interface LandingHighlightStory {
  /** As printed in the bulletin; just the year when the article gives no date. */
  date: string
  summary: string
  category: LandingHighlightCategory
  /** A year's three top stories fill its opening row: `lead` in the wide centre column,
   *  with `left` and `right` beside it. Every other story follows in rows of three. */
  feature?: 'lead' | 'left' | 'right'
  /** A short paragraph under the headline. */
  detail?: string
  /** Only where the bulletin names a venue or place. */
  location?: string
  image: string
  imageAlt: string
  /** Shown whole rather than cropped to 4:3: award slides (cropping would cut their
   *  text) and wide group photos (it would cut the people at the edges). */
  fit?: 'contain'
  /** Keeps faces in frame when a tall photo is cropped to the card. */
  focus?: 'top'
}

export interface LandingHighlightYear {
  year: number
  stories: readonly LandingHighlightStory[]
}

/** Unique per story because the photo paths are: `highlight-2024-savings-seminar`. */
export const landingHighlightStoryId = ({ image }: Pick<LandingHighlightStory, 'image'>) =>
  `highlight-${image.split('/').slice(-2).join('-').replace('.jpg', '')}`

const photo = (year: number, slug: string) => `/timeline/${year}/${slug}.jpg`

/** Written in calendar order, as the bulletins report them. Articles with no printed
 *  date sit at the end of their year. */
const YEARS_IN_CALENDAR_ORDER: readonly LandingHighlightYear[] = [
  {
    year: 2023,
    stories: [
      {
        date: 'Jul 29, 2023',
        summary: 'Barangay officers from Looc, Opao and Umapad trained in safe gun handling.',
        category: 'Community Safety',
        location: 'UCLM Indoor Firing Range',
        feature: 'left',
        detail:
          'Under its SELF CARE program, the College of Criminology ran a hands-on seminar with a live-fire component for barangay officers and its own instructors.',
        image: photo(2023, 'gun-handling-seminar'),
        imageAlt: 'Barangay officers and instructors in a group photo at the firing range',
      },
      {
        date: 'Sep–Dec 2023',
        summary: 'CCA CARES held a clean-up and a fundraising booth, and gave trash bins to CBE rooms.',
        category: 'Environment & Resilience',
        detail:
          'From September to December, CCA CARES volunteers cleaned up their surroundings, ran a fundraising booth and turned over new trash bins for CBE classrooms.',
        feature: 'right',
        image: photo(2023, 'cca-service-drives'),
        imageAlt: 'CCA CARES volunteers with new trash bins and at a clean-up site',
      },
      {
        date: '2023',
        summary: 'CTE won Most Outstanding Community Extension Program at the first Exemplar Awards.',
        category: 'Recognition & Awards',
        feature: 'lead',
        detail:
          'The CARES Office held its first-ever Exemplars Awarding and Culminating Ceremony to recognize the students, faculty, staff and alumni behind its extension work.',
        image: photo(2023, 'first-exemplar-awards'),
        imageAlt: 'Award slide naming the College of Teacher Education',
        fit: 'contain',
      },
    ],
  },
  {
    year: 2024,
    stories: [
      {
        date: 'Feb 3, 2024',
        summary: 'Barangay officers from Looc, Opao and Umapad learned self-defense and de-escalation.',
        category: 'Community Safety',
        location: 'Dojo',
        detail:
          'Instructors from DEFTACT and the college covered de-escalation, non-violent strategies and practical self-defense maneuvers through hands-on exercises.',
        image: photo(2024, 'self-defense-seminar'),
        imageAlt: 'Barangay officers with karate instructors in the dojo',
      },
      {
        date: 'Apr 26, 2024',
        summary: 'A-PAD Philippines trained Criminology CARES in mental health and psychological first aid.',
        category: 'Health & Wellness',
        location: 'Golden Prince Hotel',
        detail:
          'The training centered on Psychological First Aid and its principles of Prepare, Look, Listen and Link, with group activities and discussions led by DOH guest speakers.',
        /* Cropped above the printed logo, caption and footer bar; shown whole so the
           people at either edge stay in frame. */
        image: photo(2024, 'psychosocial-support-training-clean'),
        imageAlt: 'Training participants in a group photo at the hotel venue',
        fit: 'contain',
      },
      {
        date: 'May 17, 2024',
        summary: 'CTE volunteers prepared gift bags for ALS learners in jail.',
        category: 'Community Outreach',
        location: 'Lapu-Lapu City Jail Female Dormitory',
        detail:
          'Through the ALS Assistantship Program, CTE also supports learners at the Lapu-Lapu and Mandaue City Jails, with gifts such as hygiene kits and snacks.',
        image: photo(2024, 'als-learner-gifts'),
        imageAlt: 'Volunteers arranging gift bags on a table at the jail dormitory',
      },
      {
        date: 'Jun 3, 2024',
        summary: 'All housekeeping trainees passed NC II after 455 free training hours.',
        category: 'Livelihood & Skills',
        feature: 'left',
        detail:
          'The free CHTM CARES program opens its doors to out-of-school youth and others lacking formal education. Many of its graduates have since found jobs in the housekeeping field.',
        image: photo(2024, 'housekeeping-nc2'),
        imageAlt: 'Housekeeping trainees in white shirts giving a thumbs up',
      },
      {
        date: 'Jul 8–29, 2024',
        summary: 'CCS ran eight days of hands-on computer training in its DigiTech program.',
        category: 'Livelihood & Skills',
        detail:
          'Participants worked through Microsoft Office, internet search, Gmail, Google Drive, and internet safety and ethics, then showed their new skills at a culminating activity on July 29.',
        image: photo(2024, 'digitech-computer-literacy'),
        imageAlt: 'Participants gathered around computers in the laboratory',
      },
      {
        date: 'Jul 18, 2024',
        summary: 'Bidlisiw beneficiaries completed 15 days of hands-on welding training.',
        category: 'Livelihood & Skills',
        detail:
          'Licensed instructors from Engineering and Marine Engineering taught welding techniques, safety procedures and equipment handling over three weeks, to improve participants’ employability and livelihoods.',
        image: photo(2024, 'smaw-welding-training'),
        imageAlt: 'A trainee in orange coveralls welding in the workshop',
      },
      {
        date: 'Jul 31, 2024',
        summary: 'UCLM CARES donated 500 books to grow the school’s reading resources.',
        category: 'Education & Literacy',
        location: 'Lusong Elementary School',
        feature: 'lead',
        detail:
          'The books aim to foster a love of reading among the school’s pupils, part of CARES’ ongoing support for the communities it serves.',
        image: photo(2024, 'lusong-book-donation'),
        imageAlt: 'CARES staff and school representatives behind stacks of donated books',
      },
      {
        date: 'Sep 21, 2024',
        summary: 'Volunteers cleaned three barangays on World Clean Up Day, 654 of them from CCA.',
        category: 'Environment & Resilience',
        detail:
          'On World Clean Up Day, student volunteers swept the streets of Barangays Looc, Opao and Umapad, with the College of Customs Administration sending 654 of them.',
        location: 'Barangays Looc, Opao and Umapad',
        feature: 'right',
        image: photo(2024, 'world-clean-up-day'),
        imageAlt: 'Student volunteers on a barangay street during the clean-up',
      },
      {
        date: 'Sep 26, 2024',
        summary: 'CARES presented its programs to the leaders of a newly adopted barangay.',
        category: 'Community Partnership',
        location: 'Barangay Umapad, Mandaue City',
        detail:
          'The visit had the support of the barangay captain and council, and highlighted programs aimed at the community’s specific needs and sustainable development.',
        image: photo(2024, 'umapad-adoption'),
        imageAlt: 'CARES staff presenting to barangay leaders in Umapad',
      },
      {
        date: 'Sep 28–Oct 25, 2024',
        summary: 'Seedlings went to two barangays, and students learned gardening with the DA.',
        category: 'Environment & Resilience',
        location: 'Barangays Looc and Opao',
        detail:
          'Grades 7 to 10 also tended the school garden, and a two-day seminar with the Department of Agriculture taught soil preparation, plowing and seeding.',
        image: photo(2024, 'seedlings-and-gardening'),
        imageAlt: 'Basic Education CARES members in a group photo at the school garden',
      },
      {
        date: 'Oct 22, 2024',
        summary: 'Residents and small business owners learned to save and invest wisely.',
        category: 'Livelihood & Skills',
        location: 'Multi-Purpose Building, Paknaan, Mandaue City',
        detail:
          'Speakers broke down budgeting, financial planning and investment basics into lessons participants could apply in everyday life.',
        image: photo(2024, 'savings-seminar'),
        imageAlt: 'Seminar participants holding certificates in Paknaan',
      },
      {
        date: 'Oct 25–31, 2024',
        summary: 'CCS volunteers ran a needs assessment in two newly adopted barangays.',
        category: 'Community Partnership',
        location: 'Umapad and Paknaan, Mandaue City',
        detail:
          'Aligned with SDGs 8 and 9, the survey identified gaps in digital literacy, access to technology and economic opportunities to guide future community programs.',
        image: photo(2024, 'needs-assessment'),
        imageAlt: 'A student volunteer interviewing a resident',
        focus: 'top',
      },
      {
        date: 'Nov 23, 2024',
        summary: 'SHS CARES and allied organizations held the Igniting Leaders of Tomorrow forum.',
        category: 'Youth & Leadership',
        location: 'Sebastien Hotel Mactan',
        detail:
          'The SK Chairman of Barangay Opao, a UCLM alumnus, gave an inspiring talk, while student volunteers from ABLAZE prepared food for all participants.',
        image: photo(2024, 'leadership-forum'),
        imageAlt: 'Student leaders speaking on a panel at the Leadership Forum',
      },
      {
        date: 'Dec 7, 2024',
        summary: 'Children from four adopted barangays received Christmas gifts and school supplies.',
        category: 'Community Outreach',
        location: 'UCLM Annex 2 Social Hall',
        detail:
          'Games and a packed lunch filled the day, with support from departmental coordinators, volunteers and sponsors including Waterfront Hotels & Casino and Dundee’s Bakeshop.',
        image: photo(2024, 'christmas-gift-giving'),
        imageAlt: 'Children in Santa hats seated at the Annex 2 Social Hall',
      },
      {
        date: 'Dec 18, 2024',
        summary: 'CHTM students staged a golden wedding anniversary for a partner-community couple.',
        category: 'Community Partnership',
        location: 'UCLM Annex 2 Social Hall',
        detail:
          'The MICE students’ first-ever real-life event honored a couple from a partner community, with support from Bidlisiw Foundation and Barangays Opao and Looc.',
        image: photo(2024, 'fifty-years-and-beyond'),
        imageAlt: 'The couple sharing a kiss on the forehead at their anniversary',
        focus: 'top',
      },
      {
        date: '2024',
        summary: 'With A-PAD PH, CARES supported water-filter buckets for Typhoon Kristine survivors.',
        category: 'Humanitarian Response',
        location: 'Albay and Camarines Sur',
        detail:
          'The buckets gave families, especially in remote areas, clean and safe drinking water during recovery, and remain useful for long-term disaster preparedness.',
        image: photo(2024, 'typhoon-kristine-water-filters'),
        imageAlt: 'Responders unloading a water-filter bucket from a truck',
      },
      {
        date: '2024',
        summary: 'The Medical-Dental Caravan offered free health services to 150 invited beneficiaries.',
        category: 'Health & Wellness',
        detail:
          'Beneficiaries came from Opao and Looc. Nursing students, volunteers and medical technologists from UC-Banilad worked together, and volunteers exceeded expectations despite last-minute venue changes.',
        image: photo(2024, 'medical-dental-caravan'),
        imageAlt: 'Organizers cutting the ribbon to open the caravan',
      },
      {
        date: '2024',
        summary: 'After two years of Looc READS, there were fewer non-readers and stronger fluency.',
        category: 'Education & Literacy',
        detail:
          'Two years into the reading program at Cesar M. Cabahug Elementary School, volunteers saw fewer pupils left as non-readers and stronger fluency among those they tutored.',
        location: 'Cesar M. Cabahug Elementary School',
        image: photo(2024, 'looc-reads-year-3'),
        imageAlt: 'Pupils and volunteers smiling together during Looc READS',
      },
      {
        date: '2024',
        summary: 'Looc READS and ALS Assistantship won Most Implemented CARES Program of the Year.',
        category: 'Recognition & Awards',
        detail:
          'The CARES Office named Looc READS and the ALS Assistantship its Most Implemented CARES Program of the Year, recognizing the two programs carried out most across the year.',
        image: photo(2024, 'second-exemplar-awards'),
        imageAlt: 'Award slide for the Most Implemented CARES Program of the Year',
        fit: 'contain',
      },
    ],
  },
  {
    year: 2025,
    stories: [
      {
        date: 'Jan 25, 2025',
        summary: 'Barangay officers from Looc and Opao studied RA 6713, the code for public officials.',
        category: 'Good Governance',
        location: 'Room A22, UCLM Annex Building',
        detail:
          'The speaker stressed accountability and responsibility, and participants received a pack of rice and a vest as a gesture of appreciation.',
        image: photo(2025, 'public-accountability-seminar'),
        imageAlt: 'Barangay officers in vests holding the rice packs they received',
      },
      {
        date: 'Jan 31, 2025',
        summary: 'With Pilipinas Shell Foundation, CARES gave food packs and hygiene kits to fire victims.',
        category: 'Humanitarian Response',
        location: 'Looc and Opao, Mandaue City',
        detail:
          'Volunteers from UCLM and Shell Philippines reached families hit by the fire in Sitio Pokang in Looc and two puroks in Opao, helping them recover and rebuild.',
        image: photo(2025, 'fire-relief-shell'),
        imageAlt: 'Families and volunteers with relief packs in a covered hall',
      },
      {
        date: 'Feb 26, 2025',
        summary: 'Caritas Germany–Cambodia visited to strengthen training for Bidlisiw beneficiaries.',
        category: 'Livelihood & Skills',
        detail:
          'Visitors from Caritas Germany–Cambodia came to UCLM to see the training given to Bidlisiw Foundation beneficiaries and to help strengthen it.',
        location: 'UCLM',
        image: photo(2025, 'caritas-visit'),
        imageAlt: 'Visitors and UCLM staff in a group photo at the training facility',
      },
      {
        date: 'Mar 1, 2025',
        summary: 'A medical mission and bloodletting drive collected 123 bags of blood.',
        category: 'Health & Wellness',
        location: 'UCLM',
        feature: 'left',
        detail:
          'With VSMMC, the UC School of Medicine and student volunteers, the university offered free check-ups and consultations while students and other donors gave blood.',
        image: photo(2025, 'medical-mission-bloodletting'),
        imageAlt: 'Blood donors and medical staff at stations across the hall',
      },
      {
        date: 'Mar 2, 2025',
        summary: 'A CCA seminar covered import and export basics and the customs broker’s role.',
        category: 'Academic Engagement',
        location: 'CCA Review Room, CBE Building',
        detail:
          'The seminar is part of the GLOBE flagship, which helps small and medium enterprises in Barangay Paknaan and other adopted barangays expand into foreign markets.',
        image: photo(2025, 'empowering-smes'),
        imageAlt: 'Seminar speakers and attendees in a group photo',
      },
      {
        date: 'Mar 21–Apr 22, 2025',
        summary: 'Children from Looc and Opao were tutored in Math, Science and English.',
        category: 'Education & Literacy',
        detail:
          'Held after the children’s morning classes, the program opened with a diagnostic test and closed with awards, certificates and a badge for every completer.',
        image: photo(2025, 'basic-ed-tutorial'),
        imageAlt: 'Tutored children and volunteers gathered in their classroom',
      },
      {
        date: 'Mar 29, 2025',
        summary: 'Criminology CARES practised CPR, airway obstruction response and bandaging.',
        category: 'Health & Wellness',
        detail:
          'In the Dojo Room of the UCLM Annex 2 Building, Criminology CARES volunteers trained in CPR, airway obstruction response and bandaging, ready to give first aid when it is needed.',
        location: 'Dojo Room, UCLM Annex 2 Building',
        image: photo(2025, 'basic-life-support'),
        imageAlt: 'Volunteers seated on the dojo mat during the training',
      },
      {
        date: 'Apr 2, 2025',
        summary: 'Volunteers packed and gave out pails, food, hygiene supplies and water to fire victims.',
        category: 'Humanitarian Response',
        location: 'Barangay Paknaan, Mandaue City',
        detail:
          'Student volunteers and officers from across the departments joined UCLM CARES in both packing and distribution, giving out supplies for as long as they lasted.',
        image: photo(2025, 'paknaan-fire-aid'),
        imageAlt: 'Maritime volunteers beside the pails of donated goods',
      },
      {
        date: 'Apr 6, 2025',
        summary: 'Women’s Month brought a family planning seminar and a breast self-exam demonstration.',
        category: 'Health & Wellness',
        location: 'Opao Barangay Hall',
        detail:
          'Held under the sub-theme “Babae sa Lahat ng Sektor, Aangat ang Bukas sa Bagong Pilipinas,” the afternoon also featured a group yell competition and a raffle.',
        image: photo(2025, 'womens-month'),
        imageAlt: 'A speaker addressing women in pink shirts at the barangay hall',
      },
      {
        date: 'Apr 26, 2025',
        summary: 'SHS and Maritime CARES planted mangroves to help protect the coast.',
        category: 'Environment & Resilience',
        detail:
          'Senior High School and Maritime CARES volunteers waded into the shallows at Lawis, Subabasbas, Lapu-Lapu City to plant mangroves that help shield the shoreline.',
        location: 'Lawis, Subabasbas, Lapu-Lapu City',
        feature: 'right',
        image: photo(2025, 'mangrove-planting'),
        imageAlt: 'Volunteers standing in the shallows after planting mangroves',
      },
      {
        date: 'May 2–3, 2025',
        summary: 'Over 150 learners joined the first-ever ALS Walkathon and Fun Run.',
        category: 'Education & Literacy',
        location: 'UCLM Annex 1 Grounds',
        feature: 'lead',
        detail:
          'Many of the learners are out-of-school youth. The two-day culmination brought them together with mentors and student volunteers from the Mandaue and Lapu-Lapu divisions for a walkathon, fun run and Zumba session.',
        image: photo(2025, 'als-walkathon'),
        imageAlt: 'ALS learners laughing as they run together',
      },
      {
        date: 'May 30, 2025',
        summary: 'The third Exemplar Awards honoured volunteers, coordinators, partners and barangays.',
        category: 'Recognition & Awards',
        detail:
          'At the BE Auditorium, the CARES Office held its third Exemplar Awards, recognizing the volunteers, coordinators, partners and barangays behind the year’s extension work.',
        location: 'BE Auditorium, UCLM',
        image: photo(2025, 'third-exemplar-awards'),
        imageAlt: 'Award slides showing the 2025 Exemplar awardees',
        fit: 'contain',
      },
      {
        date: 'Jun 2–Jul 7, 2025',
        summary: 'CHTM and Bidlisiw Foundation trained participants in housekeeping services.',
        category: 'Livelihood & Skills',
        detail:
          'Faculty led lectures, demonstrations and practical sessions on guest services, room preparation, laundry and public area cleaning, assisted by student volunteers.',
        image: photo(2025, 'housekeeping-bidlisiw'),
        imageAlt: 'Trainees and faculty in a group photo',
      },
      {
        date: 'Jun 10–13, 2025',
        summary: 'Nursing volunteers assisted in free cataract and pterygium surgeries.',
        category: 'Health & Wellness',
        location: 'San Fernando El Rey Parish Church, Liloan, Cebu',
        detail:
          'Organized with EyeHear Foundation Inc. and RaiseMeUp Group, the four-day mission also offered optical check-ups to underserved residents and restored sight to many.',
        image: photo(2025, 'liloan-eye-mission'),
        imageAlt: 'A surgical team operating during the eye mission',
      },
      {
        date: 'Jun 24, 2025',
        summary: 'VSMMC honoured UCLM CARES for organizing mobile blood donation drives.',
        category: 'Recognition & Awards',
        detail:
          'At the Waterfront Cebu City Hotel, Vicente Sotto Memorial Medical Center recognized UCLM CARES for organizing mobile blood donation drives for the hospital.',
        location: 'Waterfront Cebu City Hotel',
        image: photo(2025, 'vsmmc-recognition'),
        imageAlt: 'UCLM CARES representatives receiving the award on stage',
      },
      {
        date: 'Jun 27, 2025',
        summary: 'The Medical-Dental Caravan reached 56 adults and 43 children from four barangays.',
        category: 'Health & Wellness',
        detail:
          'Besides doctor consultations, the caravan offered blood sugar and urine testing, visual acuity tests, family planning services and breast examinations, with help from UCMED Medical Technology students.',
        image: photo(2025, 'medical-dental-caravan'),
        imageAlt: 'Caravan volunteers and health workers in a large group photo',
      },
      {
        date: 'Sep 24, 2025',
        summary: 'Looc READS began its fourth year with 153 participants and Filipino reading games.',
        category: 'Education & Literacy',
        location: 'BE Quadrangle and Auditorium, UCLM',
        detail:
          'Under the theme “Looc READS ARETE,” volunteers ran booths that merged games like Piko and Patintero with reading challenges, reaffirming CTE’s five-year partnership with Cesar M. Cabahug Elementary School.',
        image: photo(2025, 'looc-reads-year-4'),
        imageAlt: 'Faculty and partners holding certificates at the launch',
      },
      {
        date: 'Oct 2–3, 2025',
        summary: 'CTE CARES joined A-PAD PH and the DSWD in repacking aid after the earthquake.',
        category: 'Humanitarian Response',
        detail:
          'At the Visayas Disaster Resource Center in Mandaue City, CTE CARES volunteers worked with A-PAD PH and the DSWD to repack relief goods for areas hit by the earthquake.',
        location: 'Visayas Disaster Resource Center, Mandaue City',
        image: photo(2025, 'earthquake-relief'),
        imageAlt: 'Volunteers at the Visayas Disaster Resource Center',
      },
      {
        date: 'Nov 7–8, 2025',
        summary: 'CTE CARES teams brought aid to the homes of students hit by the typhoon.',
        category: 'Humanitarian Response',
        location: 'Danao City',
        detail:
          'Travelling from Mandaue, teams visited homes in person, as part of a relief and donation drive the college launched for earthquake and typhoon damage.',
        image: photo(2025, 'typhoon-aid-danao'),
        imageAlt: 'CTE CARES volunteers beside their vehicle during the visit',
      },
      {
        date: 'Dec 11–15, 2025',
        summary: 'CARES presented its research at the 1st PAEPI International Extension Conference.',
        category: 'Academic Engagement',
        location: 'Maejo University, Chiang Mai, Thailand',
        detail:
          'Presented by the CARES Director and two coordinators at Maejo University, the study joined a dialogue among educators, researchers and extension practitioners from around the globe.',
        image: photo(2025, 'paepi-conference'),
        imageAlt: 'UCLM delegates at the PAEPI conference backdrop in Chiang Mai',
      },
    ],
  },
]

const hasPrintedDate = ({ date }: LandingHighlightStory) => !/^\d{4}$/.test(date)

/** Latest first; a story with no printed date can't be placed, so it stays at the end. */
const newestFirst = (stories: readonly LandingHighlightStory[]) => [
  ...stories.filter(hasPrintedDate).reverse(),
  ...stories.filter((story) => !hasPrintedDate(story)),
]

/** What the page shows: newest year at the top, oldest last. */
export const LANDING_HIGHLIGHT_YEARS: readonly LandingHighlightYear[] = [
  ...YEARS_IN_CALENDAR_ORDER,
]
  .reverse()
  .map((highlight) => ({ ...highlight, stories: newestFirst(highlight.stories) }))
