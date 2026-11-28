import { Navigate, useLocation } from 'react-router-dom'
import { landingSectionPath } from '../../constants/landing-bulletin'

/** Keeps old page URLs working; the query survives so `/programs?department=…` opens that program. */
export function LandingSectionRedirect({ sectionId }: { sectionId: string }) {
  const { search } = useLocation()
  const [pathname, hash] = landingSectionPath(sectionId).split('#')

  return <Navigate replace to={{ pathname, search, hash: `#${hash}` }} />
}
