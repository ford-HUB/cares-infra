import {
  ABOUT_PATH,
  ADMIN_BASE_PATH,
  HIGHLIGHTS_PATH,
  HOME_PATH,
  LOGIN_PATH,
  PROGRAMS_PATH,
  REGISTRATION_STATUS_PATH,
  REQUEST_ACCESS_PATH,
} from './routes'

/** The canonical public origin. Search engines index this host only; the Vercel
 *  subdomain and preview deployments point their canonical here. Keep in step with
 *  index.html, public/robots.txt and public/sitemap.xml, which can't import it. */
export const SITE_URL = 'https://cares-online.com'

export const SITE_NAME = 'UCLM CARES'

export const SEO_DEFAULT_TITLE =
  'UCLM CARES | Community Awareness, Relations, and Extension Services'

export const SEO_DEFAULT_DESCRIPTION =
  'UCLM CARES is the University of Cebu Lapu-Lapu and Mandaue’s arm for community engagement — need-based, sustainable extension programs in literacy, disaster relief, health and the environment across Mandaue and Lapu-Lapu City.'

/** Title shown on every staff portal screen. Never indexed. */
export const SEO_PORTAL_TITLE = 'CARES Administrator'

export type RouteSeo = {
  title: string
  description: string
  /** Path the page's canonical URL points at. */
  canonicalPath: string
  index: boolean
}

const HOME_SEO: RouteSeo = {
  title: SEO_DEFAULT_TITLE,
  description: SEO_DEFAULT_DESCRIPTION,
  canonicalPath: HOME_PATH,
  index: true,
}

/** Exact public paths. The old section paths redirect into the one-page site, so they
 *  share its canonical; the auth modals and status page sit over it but aren't content. */
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
}

const BULLETIN_PREFIX = `${PROGRAMS_PATH}/bulletin/`

/** Meta for any path: exact public pages, bulletin scans, then the portal (noindex). */
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
