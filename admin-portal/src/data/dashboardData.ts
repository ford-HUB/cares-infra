export type ActivityType =
  | 'event_created'
  | 'donation_updated'
  | 'user_registered'
  | 'announcement_published';

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  change: string;
  icon: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  timeAgo: string;
}

export interface DashboardMetrics {
  stats: DashboardStat[];
  activities: ActivityItem[];
}

const SUPER_ADMIN_STATS: DashboardStat[] = [
  {
    id: 'users',
    label: 'Total Users',
    value: '1,248',
    change: '+12 this week',
    icon: '◎',
  },
  {
    id: 'events',
    label: 'Upcoming Events',
    value: '18',
    change: '5 starting within 7 days',
    icon: '◫',
  },
  {
    id: 'campaigns',
    label: 'Active Donation Campaigns',
    value: '9',
    change: '3 ending this month',
    icon: '♥',
  },
  {
    id: 'donations',
    label: 'Total Donations Received',
    value: '₱284,500',
    change: '+₱18.2k this week',
    icon: '₱',
  },
  {
    id: 'registrations',
    label: 'Event Registrations',
    value: '432',
    change: '86% attendance rate',
    icon: '☰',
  },
];

const COORDINATOR_STATS: DashboardStat[] = [
  {
    id: 'users',
    label: 'Total Users',
    value: '—',
    change: 'View-only for coordinators',
    icon: '◎',
  },
  {
    id: 'events',
    label: 'Upcoming Events',
    value: '6',
    change: '2 drafts · 4 published',
    icon: '◫',
  },
  {
    id: 'campaigns',
    label: 'Active Donation Campaigns',
    value: '4',
    change: '1 ending within 7 days',
    icon: '♥',
  },
  {
    id: 'donations',
    label: 'Total Donations Received',
    value: '₱92,400',
    change: 'Across your campaigns',
    icon: '₱',
  },
  {
    id: 'registrations',
    label: 'Event Registrations',
    value: '156',
    change: '32 pending check-in',
    icon: '☰',
  },
];

const RECENT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'event_created',
    title: 'New event created',
    detail: 'Coastal Cleanup Drive — Jun 10, 2026 · Mactan Island',
    timeAgo: '12 min ago',
  },
  {
    id: 'act-2',
    type: 'donation_updated',
    title: 'Donation campaign updated',
    detail: 'Tree Planting Fund goal raised to ₱15,000',
    timeAgo: '45 min ago',
  },
  {
    id: 'act-3',
    type: 'user_registered',
    title: 'User registration completed',
    detail: 'Maria Santos · Student · USC Talamban',
    timeAgo: '1 hr ago',
  },
  {
    id: 'act-4',
    type: 'announcement_published',
    title: 'Announcement published',
    detail: 'Volunteer orientation schedule for June 2026',
    timeAgo: '2 hrs ago',
  },
  {
    id: 'act-5',
    type: 'event_created',
    title: 'New event created',
    detail: 'Community Health Fair — Jun 21, 2026 · Talisay City',
    timeAgo: 'Yesterday',
  },
  {
    id: 'act-6',
    type: 'user_registered',
    title: 'User registration completed',
    detail: 'Juan Reyes · Beneficiary · Cebu City',
    timeAgo: 'Yesterday',
  },
];

export function getDashboardMetrics(role: 'super_admin' | 'event_coordinator'): DashboardMetrics {
  return {
    stats: role === 'super_admin' ? SUPER_ADMIN_STATS : COORDINATOR_STATS,
    activities: RECENT_ACTIVITIES,
  };
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  event_created: 'Event',
  donation_updated: 'Donation',
  user_registered: 'User',
  announcement_published: 'Announcement',
};
