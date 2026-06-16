import { useAuth } from '@/context/AuthContext';
import { ADMIN_ROLE_LABELS } from '@/types/auth';
import styles from './DashboardPages.module.css';

const SUPER_ADMIN_STATS = [
  { label: 'Total Users', value: '1,248', change: '+12 this week' },
  { label: 'Active Events', value: '18', change: '5 upcoming' },
  { label: 'Donation Campaigns', value: '9', change: '₱284k raised' },
  { label: 'Registrations', value: '432', change: '86% attendance' },
];

const COORDINATOR_STATS = [
  { label: 'Your Events', value: '6', change: '2 draft' },
  { label: 'Registrations', value: '156', change: '32 pending check-in' },
  { label: 'Donation Campaigns', value: '4', change: '1 ending soon' },
  { label: 'Total Raised', value: '₱92k', change: '61% of goal' },
];

export function DashboardOverviewPage() {
  const { session } = useAuth();
  const isSuperAdmin = session!.user.role === 'super_admin';
  const stats = isSuperAdmin ? SUPER_ADMIN_STATS : COORDINATOR_STATS;

  return (
    <div>
      <div className={styles.welcomeBanner}>
        <div>
          <p className={styles.welcomeEyebrow}>Step 3 · Dashboard Access</p>
          <h2 className={styles.welcomeTitle}>
            Welcome, {session!.user.firstName}
          </h2>
          <p className={styles.welcomeText}>
            You are signed in as{' '}
            <strong>{ADMIN_ROLE_LABELS[session!.user.role]}</strong>. Content
            you manage here appears in the CARES mobile application.
          </p>
        </div>
        <div className={styles.roleBadge}>
          {ADMIN_ROLE_LABELS[session!.user.role]}
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue}>{stat.value}</p>
            <p className={styles.statChange}>{stat.change}</p>
          </div>
        ))}
      </div>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Your access scope</h3>
          {isSuperAdmin ? (
            <ul className={styles.list}>
              <li>Full system access across all mobile content</li>
              <li>Manage users, roles, and verification status</li>
              <li>Create, edit, and publish events & donation campaigns</li>
              <li>View registrations, reports, and analytics</li>
            </ul>
          ) : (
            <ul className={styles.list}>
              <li>Create and manage volunteer events</li>
              <li>View and export event registrations</li>
              <li>Create and manage donation campaigns</li>
              <li>Monitor campaign progress shown in the mobile app</li>
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>CMS quick actions</h3>
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn}>
              + New Event
            </button>
            <button type="button" className={styles.actionBtn}>
              + Donation Campaign
            </button>
            {isSuperAdmin && (
              <button type="button" className={styles.actionBtnSecondary}>
                Review user verifications
              </button>
            )}
          </div>
          <p className={styles.panelNote}>
            Module screens (events, donations, users) are scaffolded in the
            sidebar. Connect to the NestJS API when backend CMS endpoints are
            ready.
          </p>
        </section>
      </div>
    </div>
  );
}

interface SectionPageProps {
  title: string;
  description: string;
}

export function SectionPlaceholderPage({ title, description }: SectionPageProps) {
  return (
    <div className={styles.placeholder}>
      <h2 className={styles.placeholderTitle}>{title}</h2>
      <p className={styles.placeholderText}>{description}</p>
      <div className={styles.placeholderBox}>
        Content management UI for this module will be implemented in the next
        phase. Role-based access is already enforced in navigation.
      </div>
    </div>
  );
}

export function EventsPage() {
  return (
    <SectionPlaceholderPage
      title="Events"
      description="Create and manage volunteer events displayed on the mobile Home and Events tabs."
    />
  );
}

export function DonationsPage() {
  return (
    <SectionPlaceholderPage
      title="Donation Campaigns"
      description="Manage featured donations and campaigns shown when users switch to Donor mode."
    />
  );
}

export function RegistrationsPage() {
  return (
    <SectionPlaceholderPage
      title="Event Registrations"
      description="View registrations, attendance check-ins, and capacity for each event."
    />
  );
}

export function UsersPage() {
  return (
    <SectionPlaceholderPage
      title="User Management"
      description="Super Admin only — manage students, beneficiaries, staff, and verification status."
    />
  );
}

export function ReportsPage() {
  return (
    <SectionPlaceholderPage
      title="Reports"
      description="Super Admin only — export participation, donation, and impact reports."
    />
  );
}

export function AnalyticsPage() {
  return (
    <SectionPlaceholderPage
      title="Analytics"
      description="Super Admin only — dashboard metrics synced with mobile app activity."
    />
  );
}

export function UnauthorizedPage() {
  return (
    <div className={styles.placeholder}>
      <h2 className={styles.placeholderTitle}>Access denied</h2>
      <p className={styles.placeholderText}>
        Your role does not have permission to view this section.
      </p>
    </div>
  );
}
