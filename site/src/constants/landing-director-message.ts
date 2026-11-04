import directorPortrait from '../assets/landing_page/org/montebon-director-message.jpg'
import { LANDING_ORG_CARES_DIRECTOR } from './landing-org'

/** The director's message that closes the About section, set on a glass scroll. The
 *  name comes from the org chart's entry, so the two never drift apart; the portrait is
 *  the message's own formal photo. */
export const LANDING_DIRECTOR_MESSAGE = {
  /** Section heading above the scroll, in the "Our Partners" style. */
  section: {
    title: { before: 'Leading with', accent: 'Purpose' },
    description:
      'A message of commitment to community service, meaningful partnerships, and sustainable development.',
  },
  heading: { lead: 'A Message from the', title: 'Director', office: 'UCLM CARES' },
  greeting: 'Greetings from UCLM CARES!',
  salutation:
    'Warm greetings to the UCLM community, our partner institutions, and the communities we serve!',
  paragraphs: [
    'UCLM CARES (Community Awareness, Relations, and Extension Services) is the university’s arm for community engagement and social responsibility. Rooted in the institution’s mission of service, UCLM CARES bridges the academe and the community through collaborative, need-based, and sustainable extension programs.',
    'Through the combined expertise and commitment of our faculty, students, staff, and alumni, we design and implement programs that respond to the real needs of our partner communities. Our initiatives cover a wide range of areas, including education and literacy, health and wellness, livelihood and skills development, environmental protection, and community relations.',
    'More than projects, these are meaningful engagements that promote active citizenship, empower individuals and families, and contribute to inclusive and lasting community development.',
    'UCLM CARES also values strong partnerships with local government units, barangays, industry partners, and other organizations, as we believe that lasting change is achieved through shared responsibility and a united effort for the common good.',
    'As we move forward, we remain committed to living out the spirit of service—extending knowledge, sharing resources, building relationships, and creating opportunities for brighter and more resilient communities.',
  ],
  closing: [
    'Together, let us continue to embody the values of UCLM CARES:',
    'service, collaboration, and genuine care for the people.',
  ],
  name: LANDING_ORG_CARES_DIRECTOR.name,
  photo: directorPortrait,
  signatureRole: 'Director, UCLM CARES',
} as const
