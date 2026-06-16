import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authenticateAdmin } from '@/data/mockAdmins';
import type { AdminUser, AuthSession } from '@/types/auth';
import { hasPermission, type AdminPermission } from '@/types/auth';

const SESSION_KEY = 'cares_admin_session';
const PENDING_2FA_KEY = 'cares_admin_pending_2fa';

interface AuthContextValue {
  session: AuthSession | null;
  pendingUser: AdminUser | null;
  login: (email: string, password: string) => Promise<'dashboard' | '2fa' | 'error'>;
  verify2fa: (code: string) => Promise<boolean>;
  resend2fa: () => void;
  logout: () => void;
  can: (permission: AdminPermission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function loadPendingUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(PENDING_2FA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(loadPendingUser);

  const completeLogin = useCallback((user: AdminUser) => {
    const next: AuthSession = {
      user,
      token: `demo-token-${user.id}`,
      verified2fa: true,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    localStorage.removeItem(PENDING_2FA_KEY);
    setSession(next);
    setPendingUser(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await new Promise((r) => setTimeout(r, 400));
      const user = authenticateAdmin(email, password);
      if (!user) return 'error';

      if (user.requires2fa) {
        localStorage.setItem(PENDING_2FA_KEY, JSON.stringify(user));
        setPendingUser(user);
        return '2fa';
      }

      completeLogin(user);
      return 'dashboard';
    },
    [completeLogin],
  );

  const verify2fa = useCallback(
    async (code: string) => {
      await new Promise((r) => setTimeout(r, 350));
      if (!pendingUser) return false;
      if (code.trim() !== '123456') return false;
      completeLogin(pendingUser);
      return true;
    },
    [pendingUser, completeLogin],
  );

  const resend2fa = useCallback(() => {
    // Static prototype — no real email dispatch.
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PENDING_2FA_KEY);
    setSession(null);
    setPendingUser(null);
  }, []);

  const can = useCallback(
    (permission: AdminPermission) => {
      if (!session?.user) return false;
      return hasPermission(session.user.role, permission);
    },
    [session],
  );

  const value = useMemo(
    () => ({
      session,
      pendingUser,
      login,
      verify2fa,
      resend2fa,
      logout,
      can,
    }),
    [session, pendingUser, login, verify2fa, resend2fa, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
