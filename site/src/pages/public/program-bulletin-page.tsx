import { Navigate, useParams } from 'react-router-dom'
import { LandingBulletinPageViewer } from '../../components/public/landing-bulletin-page-viewer'
import { isBulletinSourcePage } from '../../constants/landing-programs'
import { PROGRAMS_PATH } from '../../constants/routes'

export default function ProgramBulletinPage() {
  const page = Number(useParams().page)

  if (!isBulletinSourcePage(page)) return <Navigate to={PROGRAMS_PATH} replace />

  return <LandingBulletinPageViewer page={page} />
}
