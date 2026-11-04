import { RequestAccessPanel } from '../../components/auth/request-access-panel'

interface RequestAccessProps {
  onSignIn: () => void
}

export function RequestAccess({ onSignIn }: RequestAccessProps) {
  return <RequestAccessPanel onSignIn={onSignIn} />
}
