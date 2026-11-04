import { Navigate, useLocation } from 'react-router-dom'
import { landingSectionPath } from '../../constants/landing-bulletin'

/** Sends a former page URL to its section, so old links and bookmarks keep working. The
 *  query survives because a shared /programs?department=… link opens that program. */
export function LandingSectionRedirect({ sectionId }: { sectionId: string }) {
  const { search } = useLocation()
  const [pathname, hash] = landingSectionPath(sectionId).split('#')

  return <Navigate replace to={{ pathname, search, hash: `#${hash}` }} />
}
