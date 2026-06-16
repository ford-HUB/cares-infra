import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_ROLE_LABELS } from '@/types/auth';
import type { AdminPermission } from '@/types/auth';
import styles from './AdminLayout.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  permission?: AdminPermission;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: '◉' },
  { to: '/dashboard/events', label: 'Events', icon: '◫', permission: 'manage_events' },
  {
    to: '/dashboard/donations',
    label: 'Donations',
    icon: '♥',
    permission: 'manage_donations',
  },
  {
    to: '/dashboard/registrations',
    label: 'Registrations',
    icon: '☰',
    permission: 'view_registrations',
  },
  { to: '/dashboard/users', label: 'Users', icon: '◎', permission: 'manage_users' },
  {
    to: '/dashboard/reports',
    label: 'Reports',
    icon: '▤',
    permission: 'view_reports',
  },
  {
    to: '/dashboard/analytics',
    label: 'Analytics',
    icon: '↗',
    permission: 'view_analytics',
  },
];

export function AdminLayout() {
  const { session, logout, can } = useAuth();
  const navigate = useNavigate();
  const user = session!.user;

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.permission || can(item.permission),
  );

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>C</div>
          <div>
            <p className={styles.brandTitle}>CARES</p>
            <p className={styles.brandSubtitle}>Admin Portal</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </div>
            <div className={styles.userMeta}>
              <p className={styles.userName}>
                {user.firstName} {user.lastName}
              </p>
              <p className={styles.userRole}>{ADMIN_ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.topbarEyebrow}>Content Management System</p>
            <h1 className={styles.topbarTitle}>Mobile App Administration</h1>
          </div>

        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
