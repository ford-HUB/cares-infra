import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session?.verified2fa) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { session } = useAuth();

  if (session?.verified2fa) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
