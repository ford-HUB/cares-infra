import { AuthModal } from '../../components/auth/ui/auth-modal'
import { useAuthModalRoute } from '../../hooks/use-auth-modal-route'
import { Login } from './Login'
import { RequestAccess } from './RequestAccess'

/** Opens the sign-in or request-access modal over the landing page when the URL is
 *  /login or /request-access, and returns to the page when it closes. */
export function AuthModalHost() {
  const { open, view, close, switchTo } = useAuthModalRoute()
  const isLogin = view === 'login'

  return (
    <AuthModal
      open={open}
      onClose={close}
      contentKey={view}
      className={isLogin ? 'max-w-[26rem]' : 'max-w-md'}
      preventOutsideClose={!isLogin}
    >
      {isLogin ? (
        <Login onRequestAccess={() => switchTo('request-access')} />
      ) : (
        <RequestAccess onSignIn={() => switchTo('login')} />
      )}
    </AuthModal>
  )
}
