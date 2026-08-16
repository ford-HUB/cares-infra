import {
  PermissionKey,
  RoleType,
} from '../../infastructures/prisma/common/client';

/**
 * The portal renders permissions grouped by module, so the grouping and the copy
 * live here rather than being hardcoded in the React app — a new PermissionKey then
 * only has to be described once, and the client picks it up from the catalog endpoint.
 */
export interface PermissionDescriptor {
  key: PermissionKey;
  module: string;
  label: string;
  description: string;
  /** Marks an action worth a confirmation prompt before it is handed out. */
  sensitive: boolean;
}

export const PERMISSION_CATALOG: readonly PermissionDescriptor[] = [
  {
    key: PermissionKey.USERS_VIEW,
    module: 'Users',
    label: 'View accounts',
    description: 'Open the user master list and account details.',
    sensitive: false,
  },
  {
    key: PermissionKey.USERS_RESTRICT,
    module: 'Users',
    label: 'Restrict accounts',
    description:
      'Suspend an account from signing in, and lift that restriction.',
    sensitive: true,
  },
  {
    key: PermissionKey.USERS_BLOCK_IP,
    module: 'Users',
    label: 'Block IP addresses',
    description: 'Block and unblock the addresses an account signs in from.',
    sensitive: true,
  },
  {
    key: PermissionKey.USERS_EXPORT,
    module: 'Users',
    label: 'Export accounts',
    description: 'Download the account list as CSV.',
    sensitive: false,
  },
  {
    key: PermissionKey.ACCESS_CONTROL_VIEW,
    module: 'Access Control',
    label: 'View rights',
    description: 'See what each account is allowed to do.',
    sensitive: false,
  },
  {
    key: PermissionKey.ACCESS_CONTROL_MANAGE,
    module: 'Access Control',
    label: 'Manage rights',
    description:
      'Change role baselines, grant or revoke per-account rights, and suspend actions.',
    sensitive: true,
  },
  {
    key: PermissionKey.EVENTS_VIEW,
    module: 'Events',
    label: 'View events',
    description: 'Browse the event list, calendar, and participants.',
    sensitive: false,
  },
  {
    key: PermissionKey.EVENTS_CREATE,
    module: 'Events',
    label: 'Create events',
    description: 'Draft new events.',
    sensitive: false,
  },
  {
    key: PermissionKey.EVENTS_UPDATE,
    module: 'Events',
    label: 'Edit events',
    description: 'Change the details of an existing event.',
    sensitive: false,
  },
  {
    key: PermissionKey.EVENTS_DELETE,
    module: 'Events',
    label: 'Delete events',
    description: 'Remove an event and its associations.',
    sensitive: true,
  },
  {
    key: PermissionKey.EVENTS_PUBLISH,
    module: 'Events',
    label: 'Publish events',
    description: 'Make an event visible to volunteers in the app.',
    sensitive: true,
  },
  {
    key: PermissionKey.ATTENDANCE_VIEW,
    module: 'Attendance',
    label: 'View attendance',
    description: 'Read attendance logs for any event.',
    sensitive: false,
  },
  {
    key: PermissionKey.ATTENDANCE_RECORD,
    module: 'Attendance',
    label: 'Record attendance',
    description: 'Scan and register volunteer attendance.',
    sensitive: false,
  },
  {
    key: PermissionKey.ATTENDANCE_EXPORT,
    module: 'Attendance',
    label: 'Export attendance',
    description: 'Download attendance records.',
    sensitive: false,
  },
  {
    key: PermissionKey.CERTIFICATES_VIEW,
    module: 'Certificates',
    label: 'View certificates',
    description: 'Browse templates and issued certificates.',
    sensitive: false,
  },
  {
    key: PermissionKey.CERTIFICATES_TEMPLATE_MANAGE,
    module: 'Certificates',
    label: 'Manage templates',
    description: 'Create, edit, and deploy certificate templates.',
    sensitive: false,
  },
  {
    key: PermissionKey.CERTIFICATES_ISSUE,
    module: 'Certificates',
    label: 'Issue certificates',
    description: 'Generate and release certificates to volunteers.',
    sensitive: true,
  },
  {
    key: PermissionKey.DONATIONS_VIEW,
    module: 'Donations',
    label: 'View donations',
    description: 'Read internal donation tracking.',
    sensitive: false,
  },
  {
    key: PermissionKey.DONATIONS_RECORD,
    module: 'Donations',
    label: 'Record donations',
    description: 'Log incoming funds and goods.',
    sensitive: true,
  },
  {
    key: PermissionKey.REPORTS_VIEW,
    module: 'Reports',
    label: 'View reports',
    description: 'Read monthly and program reports.',
    sensitive: false,
  },
  {
    key: PermissionKey.REPORTS_PUBLISH,
    module: 'Reports',
    label: 'Publish reports',
    description: 'Post monthly reporting requirements.',
    sensitive: false,
  },
  {
    key: PermissionKey.SECURITY_AUDIT_VIEW,
    module: 'Security',
    label: 'View audit logs',
    description: 'Read the trail of privileged actions and sign-in activity.',
    sensitive: false,
  },
  {
    key: PermissionKey.SECURITY_SESSION_REVOKE,
    module: 'Security',
    label: 'Revoke sessions',
    description: 'Sign other accounts out of their active devices.',
    sensitive: true,
  },
  {
    key: PermissionKey.SECURITY_POLICY_MANAGE,
    module: 'Security',
    label: 'Manage security policies',
    description: 'Change password rules, MFA, and session timeouts.',
    sensitive: true,
  },
  {
    key: PermissionKey.SYSTEM_PERFORMANCE_VIEW,
    module: 'System',
    label: 'View performance',
    description: 'Read server and application performance metrics.',
    sensitive: false,
  },
  {
    key: PermissionKey.SYSTEM_NOTICE_MANAGE,
    module: 'System',
    label: 'Manage notices',
    description: 'Publish portal-wide announcements.',
    sensitive: false,
  },
  {
    key: PermissionKey.SYSTEM_SERVICE_MANAGE,
    module: 'System',
    label: 'Manage services',
    description: 'Start, stop, and inspect CARES backend services.',
    sensitive: true,
  },
  {
    key: PermissionKey.SYSTEM_MAINTENANCE_MANAGE,
    module: 'System',
    label: 'Manage maintenance',
    description: 'Put the portal into maintenance mode and run housekeeping.',
    sensitive: true,
  },
  {
    key: PermissionKey.CHAT_ACCESS,
    module: 'Communication',
    label: 'Use chat',
    description: 'Message volunteers, coordinators, and staff.',
    sensitive: false,
  },
  {
    key: PermissionKey.MAIL_ACCESS,
    module: 'Communication',
    label: 'Use mail inbox',
    description: 'Read and send portal email.',
    sensitive: false,
  },
  {
    key: PermissionKey.SUPPORT_TICKET_MANAGE,
    module: 'Communication',
    label: 'Manage support tickets',
    description: 'Triage and resolve portal support requests.',
    sensitive: false,
  },
];

/** Module order for the portal — the catalog array order, deduplicated. */
export const PERMISSION_MODULES: readonly string[] = [
  ...new Set(PERMISSION_CATALOG.map((entry) => entry.module)),
];

const ALL_PERMISSIONS = PERMISSION_CATALOG.map((entry) => entry.key);

/**
 * Baseline rights per role, applied by the access-control seeder and used as the
 * fallback when a role has no rows yet. Roles absent from this map (the app-side
 * roles — volunteer, donor, beneficiary) hold no portal rights at all.
 */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<
  Partial<Record<RoleType, readonly PermissionKey[]>>
> = {
  [RoleType.ADMIN]: ALL_PERMISSIONS,
  [RoleType.DIRECTOR]: [
    PermissionKey.USERS_VIEW,
    PermissionKey.USERS_RESTRICT,
    PermissionKey.USERS_EXPORT,
    PermissionKey.ACCESS_CONTROL_VIEW,
    PermissionKey.EVENTS_VIEW,
    PermissionKey.EVENTS_CREATE,
    PermissionKey.EVENTS_UPDATE,
    PermissionKey.EVENTS_DELETE,
    PermissionKey.EVENTS_PUBLISH,
    PermissionKey.ATTENDANCE_VIEW,
    PermissionKey.ATTENDANCE_RECORD,
    PermissionKey.ATTENDANCE_EXPORT,
    PermissionKey.CERTIFICATES_VIEW,
    PermissionKey.CERTIFICATES_TEMPLATE_MANAGE,
    PermissionKey.CERTIFICATES_ISSUE,
    PermissionKey.DONATIONS_VIEW,
    PermissionKey.DONATIONS_RECORD,
    PermissionKey.REPORTS_VIEW,
    PermissionKey.REPORTS_PUBLISH,
    PermissionKey.SECURITY_AUDIT_VIEW,
    PermissionKey.CHAT_ACCESS,
    PermissionKey.MAIL_ACCESS,
    PermissionKey.SUPPORT_TICKET_MANAGE,
  ],
  [RoleType.COORDINATOR]: [
    PermissionKey.EVENTS_VIEW,
    PermissionKey.EVENTS_CREATE,
    PermissionKey.EVENTS_UPDATE,
    PermissionKey.ATTENDANCE_VIEW,
    PermissionKey.ATTENDANCE_RECORD,
    PermissionKey.CERTIFICATES_VIEW,
    PermissionKey.CERTIFICATES_ISSUE,
    PermissionKey.DONATIONS_VIEW,
    PermissionKey.REPORTS_VIEW,
    PermissionKey.CHAT_ACCESS,
    PermissionKey.MAIL_ACCESS,
  ],
};

export function defaultPermissionsFor(
  role: RoleType,
): readonly PermissionKey[] {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}
