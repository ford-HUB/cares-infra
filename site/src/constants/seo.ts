import {
  ABOUT_PATH,
  ADMIN_BASE_PATH,
  DATA_DELETION_PATH,
  HIGHLIGHTS_PATH,
  HOME_PATH,
  LOGIN_PATH,
  PRIVACY_POLICY_PATH,
  PROGRAMS_PATH,
  REGISTRATION_STATUS_PATH,
  REQUEST_ACCESS_PATH,
  TERMS_OF_SERVICE_PATH,
} from './routes'

/** Canonical origin; keep in sync with index.html, public/robots.txt and public/sitemap.xml. */
export const SITE_URL = 'https://cares-online.com'

export const SITE_NAME = 'UCLM CARES'

export const SEO_DEFAULT_TITLE =
  'UCLM CARES | Community Awareness, Relations, and Extension Services'

export const SEO_DEFAULT_DESCRIPTION =
  'UCLM CARES is the University of Cebu Lapu-Lapu and Mandaue’s arm for community engagement — need-based, sustainable extension programs in literacy, disaster relief, health and the environment across Mandaue and Lapu-Lapu City.'

export const SEO_PORTAL_TITLE = 'CARES Administrator'

export type RouteSeo = {
  title: string
  description: string
  canonicalPath: string
  index: boolean
}

const HOME_SEO: RouteSeo = {
  title: SEO_DEFAULT_TITLE,
  description: SEO_DEFAULT_DESCRIPTION,
  canonicalPath: HOME_PATH,
  index: true,
}

/** Old section paths share the one-page canonical. */
const PUBLIC_SEO: Record<string, RouteSeo> = {
  [HOME_PATH]: HOME_SEO,
  [ABOUT_PATH]: HOME_SEO,
  [PROGRAMS_PATH]: HOME_SEO,
  [HIGHLIGHTS_PATH]: HOME_SEO,
  [LOGIN_PATH]: { ...HOME_SEO, title: `Sign in | ${SITE_NAME}`, index: false },
  [REQUEST_ACCESS_PATH]: { ...HOME_SEO, title: `Request access | ${SITE_NAME}`, index: false },
  [REGISTRATION_STATUS_PATH]: {
    title: `Registration status | ${SITE_NAME}`,
    description: 'Check the review status of your UCLM CARES volunteer or beneficiary registration.',
    canonicalPath: REGISTRATION_STATUS_PATH,
    index: false,
  },
  [PRIVACY_POLICY_PATH]: {
    title: `Privacy Policy | ${SITE_NAME}`,
    description:
      'How UCLM CARES collects, uses, shares and protects personal data under the Data Privacy Act of 2012, and the rights you have over it.',
    canonicalPath: PRIVACY_POLICY_PATH,
    index: true,
  },
  [TERMS_OF_SERVICE_PATH]: {
    title: `Terms of Service | ${SITE_NAME}`,
    description:
      'The terms for using the UCLM CARES website, staff portal and mobile app as a volunteer, donor, beneficiary or staff member.',
    canonicalPath: TERMS_OF_SERVICE_PATH,
    index: true,
  },
  [DATA_DELETION_PATH]: {
    title: `Data Deletion | ${SITE_NAME}`,
    description:
      'How to request deletion of your UCLM CARES account and personal data, what is removed, and which records the law requires us to keep.',
    canonicalPath: DATA_DELETION_PATH,
    index: true,
  },
}

const BULLETIN_PREFIX = `${PROGRAMS_PATH}/bulletin/`

export function routeSeo(pathname: string): RouteSeo {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const exact = PUBLIC_SEO[path]
  if (exact) return exact

  if (path.startsWith(BULLETIN_PREFIX)) {
    const page = decodeURIComponent(path.slice(BULLETIN_PREFIX.length))
    return {
      title: `CARES Bulletin, page ${page} | ${SITE_NAME}`,
      description: `Page ${page} of the UCLM CARES Bulletin: community extension programs, outreach and partnerships.`,
      canonicalPath: path,
      index: true,
    }
  }

  const isPortal = path === ADMIN_BASE_PATH || path.startsWith(`${ADMIN_BASE_PATH}/`)
  return {
    title: isPortal ? SEO_PORTAL_TITLE : SEO_DEFAULT_TITLE,
    description: SEO_DEFAULT_DESCRIPTION,
    canonicalPath: isPortal ? path : HOME_PATH,
    index: false,
  }
}
