import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  ACTIVITY_LABELS,
  getDashboardMetrics,
  type ActivityType,
} from '@/data/dashboardData';
import { ADMIN_ROLE_LABELS } from '@/types/auth';
import styles from './DashboardPages.module.css';

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  event_created: '◫',
  donation_updated: '♥',
  user_registered: '◎',
  announcement_published: '📢',
};

export function DashboardOverviewPage() {
  const { session, can } = useAuth();
  const user = session!.user;
  const isSuperAdmin = user.role === 'super_admin';
  const { stats, activities } = getDashboardMetrics(user.role);
  const canPublishAnnouncement = can('manage_content');

  return (
    <div>
      <div className={styles.welcomeBanner}>
        <div>
          <p className={styles.welcomeEyebrow}>Dashboard</p>
          <h2 className={styles.welcomeTitle}>Welcome, {user.firstName}</h2>
          <p className={styles.welcomeText}>
            Manage mobile app content as{' '}
            <strong>{ADMIN_ROLE_LABELS[user.role]}</strong>. Updates here sync
            to the CARES mobile application.
          </p>
        </div>
        <div className={styles.roleBadge}>{ADMIN_ROLE_LABELS[user.role]}</div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Quick Statistics</h3>
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.id} className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <p className={styles.statLabel}>{stat.label}</p>
              </div>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statChange}>{stat.change}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Recent Activity</h3>
            <span className={styles.panelBadge}>Live feed</span>
          </div>
          <ul className={styles.activityList}>
            {activities.map((item) => (
              <li key={item.id} className={styles.activityItem}>
                <div
                  className={`${styles.activityIcon} ${styles[`activity_${item.type}`]}`}
                >
                  {ACTIVITY_ICONS[item.type]}
                </div>
                <div className={styles.activityBody}>
                  <p className={styles.activityTitle}>{item.title}</p>
                  <p className={styles.activityDetail}>{item.detail}</p>
                  <div className={styles.activityMeta}>
                    <span className={styles.activityTag}>
                      {ACTIVITY_LABELS[item.type]}
                    </span>
                    <span className={styles.activityTime}>{item.timeAgo}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Quick Actions</h3>
          <p className={styles.panelIntro}>
            Create and publish content that appears in the mobile app.
          </p>
          <div className={styles.quickActions}>
            <Link to="/dashboard/events" className={styles.quickActionPrimary}>
              <span className={styles.quickActionIcon}>+</span>
              <span>
                <strong>Create Event</strong>
                <small>Add a volunteer event to the mobile app</small>
              </span>
            </Link>

            <Link to="/dashboard/donations" className={styles.quickActionPrimary}>
              <span className={styles.quickActionIcon}>+</span>
              <span>
                <strong>Create Donation Campaign</strong>
                <small>Launch a fundraising campaign for donors</small>
              </span>
            </Link>

            {canPublishAnnouncement ? (
              <button type="button" className={styles.quickActionSecondary}>
                <span className={styles.quickActionIconSecondary}>📢</span>
                <span>
                  <strong>Publish Announcement</strong>
                  <small>Notify all mobile app users</small>
                </span>
              </button>
            ) : (
              <div className={styles.quickActionDisabled}>
                <span className={styles.quickActionIconSecondary}>📢</span>
                <span>
                  <strong>Publish Announcement</strong>
                  <small>Super Admin access required</small>
                </span>
              </div>
            )}
          </div>

          {!isSuperAdmin && (
            <p className={styles.panelNote}>
              As an Event Coordinator, you can manage events, donation campaigns,
              and view registrations for your assigned content.
            </p>
          )}
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
