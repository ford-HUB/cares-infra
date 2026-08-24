import dayjs, { type Dayjs } from 'dayjs'
import type { AuditLogActor, AuditLogEntry } from '../types/audit-log'
import type { CalendarEvent } from '../types/calendar'
import type { EventCategory, EventStatus } from '../types/event'
import type {
  AttendanceStatus,
  EventAttendee,
  GeoValidationMethod,
} from '../types/attendee'
import type {
  LiveAttendanceSnapshot,
  LiveAttendanceState,
} from '../types/attendance'
import type { NotificationFeed } from '../types/notification'
import { formatTicketReference } from '../constants/support-tickets'
import type { SupportTicket } from '../types/support-ticket'

export const mockNotifications: NotificationFeed = {
  summary: { total: 5, unread: 2, read: 3 },
  items: [
    {
      id: 'n1',
      title: 'Volunteer verification needed',
      description: 'A new volunteer registration requires your review before they can join upcoming events.',
      category: 'volunteer',
      read: false,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
    {
      id: 'n2',
      title: 'Monthly report deadline',
      description: 'Submit your department monthly report before the end of this week.',
      category: 'reminder',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n3',
      title: 'System maintenance scheduled',
      description: 'The portal will undergo maintenance on Saturday from 1:00 AM to 3:00 AM.',
      category: 'system',
      read: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n4',
      title: 'New event published',
      description: 'Community Clean-Up Drive has been published and is open for volunteer registration.',
      category: 'event',
      read: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n5',
      title: 'Attendance log updated',
      description: 'Attendance records for Barangay Outreach Program were updated successfully.',
      category: 'system',
      read: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}

export const mockAdminOverview = {
  stats: {
    totalVolunteers: 128,
    totalStudents: 450,
    totalEvents: 56,
    upcomingEvents: 4,
    ongoingEvents: 2,
    completedEvents: 50,
    totalBeneficiaries: 320,
    totalParticipants: 890,
    recentRegistrations: 24,
    totalAttendance: 1200,
    recentAttendance: 89,
  },
  recentActivities: [
    { id: 'a1', label: 'Event registration approved', time: '2 hours ago' },
    { id: 'a2', label: 'Document submitted for review', time: '5 hours ago' },
    { id: 'a3', label: 'New volunteer joined', time: '1 day ago' },
  ],
}

/** Minutes/hours/days ago, as an ISO string — keeps the fixture feed looking fresh. */
const agoIso = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString()

const HOUR = 60
const DAY = 24 * HOUR

export const mockSupportTickets: SupportTicket[] = [
  {
    id: 't11',
    reference: formatTicketReference(11),
    subject: 'Request: dark mode for the volunteer app',
    description:
      'Most of our outreach briefings happen at night. A dark theme in the mobile app would be much easier on the eyes during those.',
    type: 'feature_request',
    status: 'open',
    priority: 'low',
    requester: {
      name: 'Nicole Baguio',
      email: 'nicole.baguio@uclm.edu.ph',
      role: 'volunteer',
    },
    source: 'Mobile app',
    createdAt: agoIso(12),
    updatedAt: agoIso(12),
    replies: [],
  },
  {
    id: 't1',
    reference: formatTicketReference(10),
    subject: 'Cannot log in — "invalid credentials" with the correct password',
    description:
      'I have been trying to sign in to the volunteer app since this morning. My password works on the portal but the app keeps saying invalid credentials. I already reset it twice.',
    type: 'login',
    status: 'open',
    priority: 'high',
    requester: {
      name: 'Marites Delgado',
      email: 'marites.delgado@uclm.edu.ph',
      role: 'volunteer',
    },
    source: 'Mobile app',
    createdAt: agoIso(35),
    updatedAt: agoIso(35),
    replies: [],
  },
  {
    id: 't2',
    reference: formatTicketReference(9),
    subject: 'Face scan fails at the last step of registration',
    description:
      'The camera opens and detects my face but the registration stops at "verifying" and returns to the previous step. Tried on two different phones.',
    type: 'verification',
    status: 'in_progress',
    priority: 'high',
    requester: {
      name: 'Jomar Villanueva',
      email: 'jomar.villanueva@uclm.edu.ph',
      role: 'volunteer',
    },
    assignee: 'Admin Support',
    source: 'Mobile app',
    createdAt: agoIso(5 * HOUR),
    updatedAt: agoIso(90),
    replies: [
      {
        id: 't2-r1',
        author: 'Admin Support',
        authorType: 'staff',
        body: 'Thanks for reporting. Could you tell us the phone model and whether you were indoors or outdoors when scanning?',
        createdAt: agoIso(3 * HOUR),
      },
      {
        id: 't2-r2',
        author: 'Jomar Villanueva',
        authorType: 'requester',
        body: 'Redmi Note 12, indoors with the ceiling light on. Same result outside.',
        createdAt: agoIso(90),
      },
    ],
  },
  {
    id: 't3',
    reference: formatTicketReference(8),
    subject: 'Event attendance not recorded after scanning QR',
    description:
      'Twelve volunteers were scanned at the Talamban outreach but only nine appear in the attendance log. The rest show no record at all.',
    type: 'bug',
    status: 'in_progress',
    priority: 'high',
    requester: {
      name: 'Rhea Mae Sarmiento',
      email: 'rhea.sarmiento@uclm.edu.ph',
      role: 'coordinator',
    },
    assignee: 'Admin Support',
    source: 'Staff portal',
    createdAt: agoIso(DAY),
    updatedAt: agoIso(4 * HOUR),
    replies: [
      {
        id: 't3-r1',
        author: 'Admin Support',
        authorType: 'staff',
        body: 'We are checking the attendance sync logs for that event window. Please keep the paper backup for now.',
        createdAt: agoIso(4 * HOUR),
      },
    ],
  },
  {
    id: 't4',
    reference: formatTicketReference(7),
    subject: 'Wrong department showing on my profile',
    description:
      'My profile says College of Engineering but I am from the College of Nursing. I cannot change it from the app.',
    type: 'account',
    status: 'open',
    priority: 'medium',
    requester: {
      name: 'Angela Fuentes',
      email: 'angela.fuentes@uclm.edu.ph',
      role: 'volunteer',
    },
    source: 'Mobile app',
    createdAt: agoIso(DAY + 3 * HOUR),
    updatedAt: agoIso(DAY + 3 * HOUR),
    replies: [],
  },
  {
    id: 't5',
    reference: formatTicketReference(6),
    subject: 'Request: export attendance to Excel',
    description:
      'It would help a lot if the attendance log had an export button so we can attach the sheet to our monthly report.',
    type: 'feature_request',
    status: 'open',
    priority: 'low',
    requester: {
      name: 'Dennis Cabrera',
      email: 'dennis.cabrera@uclm.edu.ph',
      role: 'director',
    },
    source: 'Staff portal',
    createdAt: agoIso(2 * DAY),
    updatedAt: agoIso(2 * DAY),
    replies: [],
  },
  {
    id: 't6',
    reference: formatTicketReference(5),
    subject: 'App crashes when opening the events tab',
    description:
      'Every time I tap Events the app closes immediately. Reinstalling did not fix it. Android 13.',
    type: 'mobile_app',
    status: 'resolved',
    priority: 'high',
    requester: {
      name: 'Kyle Andrada',
      email: 'kyle.andrada@uclm.edu.ph',
      role: 'volunteer',
    },
    assignee: 'Admin Support',
    source: 'Mobile app',
    createdAt: agoIso(3 * DAY),
    updatedAt: agoIso(DAY + 6 * HOUR),
    replies: [
      {
        id: 't6-r1',
        author: 'Admin Support',
        authorType: 'staff',
        body: 'A fix shipped in build 1.4.2. Please update from the Play Store and let us know if it still crashes.',
        createdAt: agoIso(DAY + 6 * HOUR),
      },
    ],
  },
  {
    id: 't7',
    reference: formatTicketReference(4),
    subject: 'Cannot register for the Mananga clean-up drive',
    description:
      'The join button is greyed out even though the slots say 20 remaining and registration closes next week.',
    type: 'event',
    status: 'resolved',
    priority: 'medium',
    requester: {
      name: 'Princess Lariosa',
      email: 'princess.lariosa@uclm.edu.ph',
      role: 'volunteer',
    },
    assignee: 'Admin Support',
    source: 'Mobile app',
    createdAt: agoIso(4 * DAY),
    updatedAt: agoIso(2 * DAY + 5 * HOUR),
    replies: [
      {
        id: 't7-r1',
        author: 'Admin Support',
        authorType: 'staff',
        body: 'The event was still in draft on our side. It is published now — you should be able to join.',
        createdAt: agoIso(2 * DAY + 5 * HOUR),
      },
    ],
  },
  {
    id: 't8',
    reference: formatTicketReference(3),
    subject: 'Verification email never arrives',
    description:
      'I signed up three days ago and the verification code has not arrived. Checked spam already.',
    type: 'account',
    status: 'closed',
    priority: 'high',
    requester: {
      name: 'Mark Genaro Tan',
      email: 'mark.tan@uclm.edu.ph',
      role: 'volunteer',
    },
    assignee: 'Admin Support',
    source: 'Mobile app',
    createdAt: agoIso(6 * DAY),
    updatedAt: agoIso(5 * DAY),
    replies: [
      {
        id: 't8-r1',
        author: 'Admin Support',
        authorType: 'staff',
        body: 'The address had a typo (.ph missing). We corrected it and resent the code.',
        createdAt: agoIso(5 * DAY + HOUR),
      },
      {
        id: 't8-r2',
        author: 'Mark Genaro Tan',
        authorType: 'requester',
        body: 'Received it, thank you. I am in.',
        createdAt: agoIso(5 * DAY),
      },
    ],
  },
  {
    id: 't9',
    reference: formatTicketReference(2),
    subject: 'Certificate shows the wrong event date',
    description:
      'My certificate for the feeding program says March 4 but the event was held on March 11.',
    type: 'bug',
    status: 'open',
    priority: 'high',
    requester: {
      name: 'Shane Alcantara',
      email: 'shane.alcantara@uclm.edu.ph',
      role: 'volunteer',
    },
    source: 'Mobile app',
    createdAt: agoIso(7 * DAY),
    updatedAt: agoIso(7 * DAY),
    replies: [],
  },
  {
    id: 't10',
    reference: formatTicketReference(1),
    subject: 'Portal loads very slowly during peak hours',
    description:
      'Between 4 and 6 PM the volunteer list takes almost a minute to open. Other pages are fine.',
    type: 'other',
    status: 'in_progress',
    priority: 'medium',
    requester: {
      name: 'Ivan Pacaldo',
      email: 'ivan.pacaldo@uclm.edu.ph',
      role: 'coordinator',
    },
    assignee: 'Admin Support',
    source: 'Staff portal',
    createdAt: agoIso(9 * DAY),
    updatedAt: agoIso(3 * DAY),
    replies: [],
  },
]

/**
 * Actors are denormalised onto every audit entry — the real trail copies the name,
 * email, and role held at write time so a later rename cannot rewrite history.
 */
const auditActors = {
  admin: {
    id: 'usr-1001',
    name: 'Ma. Elena Rosales',
    email: 'elena.rosales@uclm.edu.ph',
    role: 'admin',
  },
  director: {
    id: 'usr-1044',
    name: 'Rogelio Villanueva',
    email: 'r.villanueva@uclm.edu.ph',
    role: 'director',
  },
  coordinator: {
    id: 'usr-1132',
    name: 'Katrina Bautista',
    email: 'k.bautista@uclm.edu.ph',
    role: 'coordinator',
  },
  volunteer: {
    id: 'usr-2287',
    name: 'Jomar Estrada',
    email: 'jomar.estrada@uclm.edu.ph',
    role: 'volunteer',
  },
  system: {
    id: 'svc-scheduler',
    name: 'CARES Scheduler',
    email: 'system@cares.uclm.edu.ph',
    role: 'system',
  },
} satisfies Record<string, AuditLogActor>

const AUDIT_AGENTS = {
  chrome: 'Chrome 141 on Windows 11',
  edge: 'Edge 140 on Windows 11',
  safari: 'Safari 18 on macOS 15',
  android: 'CARES Mobile 1.4.0 on Android 14',
  ios: 'CARES Mobile 1.4.0 on iOS 18',
  job: 'cares-server/worker',
} as const

type AuditSeed = Omit<
  AuditLogEntry,
  'id' | 'createdAt' | 'requestId' | 'changes' | 'metadata'
> &
  Partial<Pick<AuditLogEntry, 'changes' | 'metadata'>>

/** Ids and request ids are derived from the seed order so the fixture stays stable. */
const auditEntry = (minutesAgo: number, seed: AuditSeed, index: number): AuditLogEntry => ({
  id: `alog-${String(index + 1).padStart(4, '0')}`,
  createdAt: agoIso(minutesAgo),
  requestId: `req-${(0x8f2c41 + index * 977).toString(16)}`,
  changes: [],
  metadata: {},
  ...seed,
})

const auditSeeds: [number, AuditSeed][] = [
  [
    6,
    {
      action: 'auth.session.started',
      description: 'Signed in to the admin portal',
      category: 'authentication',
      severity: 'info',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'session', label: 'Admin portal session', id: 'ses-91f2' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      metadata: { method: 'password', mfa: 'not enrolled' },
    },
  ],
  [
    18,
    {
      action: 'auth.login.failed',
      description: 'Three failed sign-in attempts for k.bautista@uclm.edu.ph',
      category: 'authentication',
      severity: 'warning',
      outcome: 'failure',
      actor: auditActors.coordinator,
      target: { type: 'user', label: 'Katrina Bautista', id: 'usr-1132' },
      ipAddress: '203.177.12.90',
      userAgent: AUDIT_AGENTS.edge,
      source: 'portal',
      metadata: { attempts: '3', reason: 'invalid password' },
    },
  ],
  [
    17,
    {
      action: 'auth.account.locked',
      description: 'Account temporarily locked after repeated failed sign-ins',
      category: 'authentication',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.system,
      target: { type: 'user', label: 'Katrina Bautista', id: 'usr-1132' },
      ipAddress: '10.0.0.14',
      userAgent: AUDIT_AGENTS.job,
      source: 'system',
      metadata: { lockDuration: '15 minutes', policy: 'lockout-after-3' },
    },
  ],
  [
    41,
    {
      action: 'access-control.permission.revoked',
      description: 'Revoked event publishing rights from Rogelio Villanueva',
      category: 'access-control',
      severity: 'warning',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'user', label: 'Rogelio Villanueva', id: 'usr-1044' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      reason: 'Moving publishing approval back to the admin desk this term.',
      changes: [
        { field: 'permissions.event.publish', before: 'granted', after: 'revoked' },
        { field: 'permissions.event.update', before: 'granted', after: 'granted' },
      ],
    },
  ],
  [
    2 * HOUR,
    {
      action: 'access-control.role-baseline.updated',
      description: 'Updated the coordinator role baseline',
      category: 'access-control',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'role', label: 'coordinator' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      changes: [
        { field: 'baseline.certificate.issue', before: 'off', after: 'on' },
        { field: 'baseline.user.restrict', before: 'on', after: 'off' },
      ],
      metadata: { affectedAccounts: '12' },
    },
  ],
  [
    3 * HOUR,
    {
      action: 'access-control.permission.suspended',
      description: 'Suspended mailbox access for Katrina Bautista for 7 days',
      category: 'access-control',
      severity: 'warning',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'user', label: 'Katrina Bautista', id: 'usr-1132' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      reason: 'Pending review of an outbound mail complaint.',
      metadata: { permission: 'mailbox.read', expiresIn: '7 days' },
    },
  ],
  [
    4 * HOUR,
    {
      action: 'access-control.portal.denied',
      description: 'Blocked attempt to open Access Control without admin rights',
      category: 'access-control',
      severity: 'warning',
      outcome: 'denied',
      actor: auditActors.coordinator,
      target: { type: 'route', label: '/admin/access-control' },
      ipAddress: '203.177.12.90',
      userAgent: AUDIT_AGENTS.edge,
      source: 'portal',
      metadata: { requiredRole: 'admin', heldRole: 'coordinator' },
    },
  ],
  [
    5 * HOUR,
    {
      action: 'user.restricted',
      description: 'Restricted volunteer account Jomar Estrada',
      category: 'user-management',
      severity: 'warning',
      outcome: 'success',
      actor: auditActors.director,
      target: { type: 'user', label: 'Jomar Estrada', id: 'usr-2287' },
      ipAddress: '175.176.20.33',
      userAgent: AUDIT_AGENTS.safari,
      source: 'portal',
      reason: 'Repeated no-shows on confirmed event slots.',
      changes: [{ field: 'status', before: 'active', after: 'restricted' }],
    },
  ],
  [
    6 * HOUR,
    {
      action: 'user.ip.blocked',
      description: 'Blocked 45.12.9.201 for the account of Jomar Estrada',
      category: 'user-management',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'user', label: 'Jomar Estrada', id: 'usr-2287' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      reason: 'Sign-in from an address flagged by two failed device checks.',
      metadata: { blockedIp: '45.12.9.201', geo: 'unknown' },
    },
  ],
  [
    8 * HOUR,
    {
      action: 'user.role.changed',
      description: 'Changed the role of Katrina Bautista from staff to coordinator',
      category: 'user-management',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'user', label: 'Katrina Bautista', id: 'usr-1132' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      changes: [{ field: 'role', before: 'staff', after: 'coordinator' }],
      metadata: { department: 'College of Engineering' },
    },
  ],
  [
    10 * HOUR,
    {
      action: 'user.unrestricted',
      description: 'Lifted the restriction on Alyssa Mendoza',
      category: 'user-management',
      severity: 'notice',
      outcome: 'success',
      actor: auditActors.director,
      target: { type: 'user', label: 'Alyssa Mendoza', id: 'usr-2190' },
      ipAddress: '175.176.20.33',
      userAgent: AUDIT_AGENTS.safari,
      source: 'portal',
      changes: [{ field: 'status', before: 'restricted', after: 'active' }],
    },
  ],
  [
    12 * HOUR,
    {
      action: 'user.access-request.approved',
      description: 'Approved a portal access request for the Nursing department',
      category: 'user-management',
      severity: 'notice',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'access-request', label: 'm.delacruz@uclm.edu.ph', id: 'req-3391' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      metadata: { grantedRole: 'staff', department: 'Nursing' },
    },
  ],
  [
    50,
    {
      action: 'verification.ocr.reviewed',
      description: 'Confirmed OCR-extracted school ID details during registration',
      category: 'verification',
      severity: 'info',
      outcome: 'success',
      actor: auditActors.volunteer,
      target: { type: 'registration', label: 'Jomar Estrada', id: 'reg-8812' },
      ipAddress: '120.29.71.14',
      userAgent: AUDIT_AGENTS.android,
      source: 'mobile',
      changes: [{ field: 'idNumber', before: '19-1O44-882', after: '19-1044-882' }],
      metadata: { service: 'ocr-service', confidence: '0.94' },
    },
  ],
  [
    70,
    {
      action: 'verification.face-match.failed',
      description: 'Face match fell below the accept threshold during registration',
      category: 'verification',
      severity: 'warning',
      outcome: 'failure',
      actor: auditActors.volunteer,
      target: { type: 'registration', label: 'Paolo Sarmiento', id: 'reg-8815' },
      ipAddress: '112.203.8.61',
      userAgent: AUDIT_AGENTS.ios,
      source: 'mobile',
      metadata: { service: 'fr-service', similarity: '0.61', threshold: '0.75' },
    },
  ],
  [
    95,
    {
      action: 'verification.id.flagged',
      description: 'School ID flagged as possibly tampered by the authenticity check',
      category: 'verification',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.system,
      target: { type: 'registration', label: 'Paolo Sarmiento', id: 'reg-8815' },
      ipAddress: '10.0.0.14',
      userAgent: AUDIT_AGENTS.job,
      source: 'system',
      metadata: { service: 'ucid-service', authenticity: '0.38', queuedFor: 'manual review' },
    },
  ],
  [
    14 * HOUR,
    {
      action: 'verification.approved',
      description: 'Approved the volunteer verification of Alyssa Mendoza',
      category: 'verification',
      severity: 'notice',
      outcome: 'success',
      actor: auditActors.coordinator,
      target: { type: 'verification', label: 'Alyssa Mendoza', id: 'ver-4471' },
      ipAddress: '203.177.12.90',
      userAgent: AUDIT_AGENTS.edge,
      source: 'portal',
      changes: [{ field: 'status', before: 'PENDING', after: 'APPROVED' }],
    },
  ],
  [
    16 * HOUR,
    {
      action: 'verification.rejected',
      description: 'Rejected the volunteer verification of Dennis Yap',
      category: 'verification',
      severity: 'warning',
      outcome: 'success',
      actor: auditActors.coordinator,
      target: { type: 'verification', label: 'Dennis Yap', id: 'ver-4468' },
      ipAddress: '203.177.12.90',
      userAgent: AUDIT_AGENTS.edge,
      source: 'portal',
      reason: 'Uploaded ID photo is unreadable; asked for a re-submission.',
      changes: [{ field: 'status', before: 'PENDING', after: 'REJECTED' }],
    },
  ],
  [
    20 * HOUR,
    {
      action: 'event.published',
      description: 'Published the event Coastal Clean-Up Drive',
      category: 'event',
      severity: 'notice',
      outcome: 'success',
      actor: auditActors.director,
      target: { type: 'event', label: 'Coastal Clean-Up Drive', id: 'evt-2205' },
      ipAddress: '175.176.20.33',
      userAgent: AUDIT_AGENTS.safari,
      source: 'portal',
      changes: [{ field: 'status', before: 'draft', after: 'published' }],
      metadata: { slots: '120', location: 'Talisay City' },
    },
  ],
  [
    22 * HOUR,
    {
      action: 'event.updated',
      description: 'Moved the schedule of Barangay Feeding Program',
      category: 'event',
      severity: 'info',
      outcome: 'success',
      actor: auditActors.coordinator,
      target: { type: 'event', label: 'Barangay Feeding Program', id: 'evt-2198' },
      ipAddress: '203.177.12.90',
      userAgent: AUDIT_AGENTS.edge,
      source: 'portal',
      changes: [
        { field: 'startsAt', before: '2026-08-22 08:00', after: '2026-08-23 07:30' },
        { field: 'slots', before: '80', after: '95' },
      ],
    },
  ],
  [
    26 * HOUR,
    {
      action: 'event.cancelled',
      description: 'Cancelled the event Tree Planting at Mt. Naupa',
      category: 'event',
      severity: 'warning',
      outcome: 'success',
      actor: auditActors.director,
      target: { type: 'event', label: 'Tree Planting at Mt. Naupa', id: 'evt-2183' },
      ipAddress: '175.176.20.33',
      userAgent: AUDIT_AGENTS.safari,
      source: 'portal',
      reason: 'Typhoon signal no. 2 raised over Cebu.',
      metadata: { notifiedVolunteers: '64' },
    },
  ],
  [
    28 * HOUR,
    {
      action: 'attendance.record.edited',
      description: 'Edited an attendance record after the event closed',
      category: 'event',
      severity: 'warning',
      outcome: 'success',
      actor: auditActors.coordinator,
      target: { type: 'attendance', label: 'Coastal Clean-Up Drive · Jomar Estrada' },
      ipAddress: '203.177.12.90',
      userAgent: AUDIT_AGENTS.edge,
      source: 'portal',
      reason: 'Volunteer scanned out at the wrong booth.',
      changes: [
        { field: 'checkOutAt', before: '11:42', after: '15:05' },
        { field: 'hoursCredited', before: '2.5', after: '6.0' },
      ],
    },
  ],
  [
    30 * HOUR,
    {
      action: 'attendance.qr.scanned',
      description: 'Checked in 38 volunteers by QR at Barangay Feeding Program',
      category: 'event',
      severity: 'info',
      outcome: 'success',
      actor: auditActors.coordinator,
      target: { type: 'event', label: 'Barangay Feeding Program', id: 'evt-2198' },
      ipAddress: '120.29.71.14',
      userAgent: AUDIT_AGENTS.android,
      source: 'mobile',
      metadata: { scanned: '38', duplicates: '2' },
    },
  ],
  [
    2 * DAY,
    {
      action: 'certificate.template.deployed',
      description: 'Deployed the certificate template Community Service 2026',
      category: 'certificate',
      severity: 'notice',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'certificate-template', label: 'Community Service 2026', id: 'tpl-77' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      metadata: { version: '3', signatory: 'Rogelio Villanueva' },
    },
  ],
  [
    2 * DAY + 3 * HOUR,
    {
      action: 'certificate.batch.issued',
      description: 'Issued 64 certificates for Coastal Clean-Up Drive',
      category: 'certificate',
      severity: 'notice',
      outcome: 'success',
      actor: auditActors.director,
      target: { type: 'event', label: 'Coastal Clean-Up Drive', id: 'evt-2205' },
      ipAddress: '175.176.20.33',
      userAgent: AUDIT_AGENTS.safari,
      source: 'portal',
      metadata: { issued: '64', template: 'Community Service 2026' },
    },
  ],
  [
    3 * DAY,
    {
      action: 'certificate.revoked',
      description: 'Revoked a certificate issued to Dennis Yap',
      category: 'certificate',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'certificate', label: 'CERT-2026-0641', id: 'cert-641' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      reason: 'Attendance for the event was reversed after review.',
      changes: [{ field: 'status', before: 'issued', after: 'revoked' }],
    },
  ],
  [
    3 * DAY + 5 * HOUR,
    {
      action: 'mailbox.google.linked',
      description: 'Linked a Google mailbox to the admin account',
      category: 'communication',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'mailbox', label: 'elena.rosales@uclm.edu.ph' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      metadata: { scopes: 'gmail.readonly, gmail.send', provider: 'google' },
    },
  ],
  [
    4 * DAY,
    {
      action: 'mail.broadcast.sent',
      description: 'Sent an event reminder to 120 registered volunteers',
      category: 'communication',
      severity: 'info',
      outcome: 'success',
      actor: auditActors.coordinator,
      target: { type: 'event', label: 'Coastal Clean-Up Drive', id: 'evt-2205' },
      ipAddress: '203.177.12.90',
      userAgent: AUDIT_AGENTS.edge,
      source: 'portal',
      metadata: { recipients: '120', template: 'event-reminder' },
    },
  ],
  [
    4 * DAY + 6 * HOUR,
    {
      action: 'support.ticket.closed',
      description: 'Closed support ticket TCK-2291',
      category: 'communication',
      severity: 'info',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'ticket', label: 'TCK-2291 · Cannot upload signature', id: 'tck-2291' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      metadata: { resolution: 'resolved', responseTime: '4h 12m' },
    },
  ],
  [
    5 * DAY,
    {
      action: 'chat.message.deleted',
      description: 'Deleted a message from the Engineering coordinators thread',
      category: 'communication',
      severity: 'notice',
      outcome: 'success',
      actor: auditActors.director,
      target: { type: 'conversation', label: 'Engineering coordinators', id: 'cnv-118' },
      ipAddress: '175.176.20.33',
      userAgent: AUDIT_AGENTS.safari,
      source: 'portal',
      reason: 'Contained a volunteer phone number posted by mistake.',
    },
  ],
  [
    5 * DAY + 2 * HOUR,
    {
      action: 'data.export.generated',
      description: 'Exported 412 user records to CSV',
      category: 'system',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'dataset', label: 'users.csv' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      metadata: { rows: '412', columns: 'name, email, role, status, department, ip' },
    },
  ],
  [
    6 * DAY,
    {
      action: 'system.backup.completed',
      description: 'Nightly database backup completed',
      category: 'system',
      severity: 'info',
      outcome: 'success',
      actor: auditActors.system,
      target: { type: 'system', label: 'postgres · cares_prod' },
      ipAddress: '10.0.0.14',
      userAgent: AUDIT_AGENTS.job,
      source: 'system',
      metadata: { size: '1.8 GB', duration: '4m 21s', retention: '30 days' },
    },
  ],
  [
    6 * DAY + 4 * HOUR,
    {
      action: 'system.backup.failed',
      description: 'Nightly database backup failed before upload',
      category: 'system',
      severity: 'critical',
      outcome: 'failure',
      actor: auditActors.system,
      target: { type: 'system', label: 'postgres · cares_prod' },
      ipAddress: '10.0.0.14',
      userAgent: AUDIT_AGENTS.job,
      source: 'system',
      metadata: { error: 'S3 upload timed out after 3 retries', size: '1.8 GB' },
    },
  ],
  [
    7 * DAY,
    {
      action: 'system.maintenance.enabled',
      description: 'Put the portal into maintenance mode',
      category: 'system',
      severity: 'critical',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'system', label: 'CARES portal' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      reason: 'Prisma migration for the attendance tables.',
      changes: [{ field: 'maintenanceMode', before: 'off', after: 'on' }],
    },
  ],
  [
    7 * DAY + 3 * HOUR,
    {
      action: 'system.service.restarted',
      description: 'Restarted fr-service after a health check failure',
      category: 'system',
      severity: 'warning',
      outcome: 'success',
      actor: auditActors.admin,
      target: { type: 'service', label: 'fr-service' },
      ipAddress: '112.198.44.7',
      userAgent: AUDIT_AGENTS.chrome,
      source: 'portal',
      metadata: { downtime: '38s', trigger: 'health check timeout' },
    },
  ],
]

/** Newest first — the grid renders the trail in the order it is returned. */
export const mockAuditLogs: AuditLogEntry[] = auditSeeds
  .map(([minutesAgo, seed], index) => auditEntry(minutesAgo, seed, index))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export const mockDepartmentOverview = {
  departmentName: 'College of Engineering',
  upcomingEvents: 2,
  pendingDocuments: 3,
  activeVolunteers: 45,
  monthlyCompletion: 78,
  pendingApprovals: 3,
  recentRegistrations: 12,
  recentAttendance: 34,
  recentSubmissions: 5,
}

/**
 * Event attendance roster. The attendance endpoint is not built yet, so the portal
 * reads this through `attendee-service` — the shape already matches what the server
 * will return, so the swap is a body-only change in that service.
 */
const dayOffset = (days: number, hour = 8, minute = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

interface AttendeeSeed {
  first: string
  last: string
  department: string
  yearLevel: string
  contact: string
  status: AttendanceStatus
  method?: GeoValidationMethod
  checkInHour?: number
  checkOutHour?: number
  hours?: number
  remarks?: string
}

interface AttendeeEventSeed {
  eventId: number
  title: string
  /** Days from today — negative for events that already ran. */
  offsetDays: number
  attendees: AttendeeSeed[]
}

const attendeeEventSeeds: AttendeeEventSeed[] = [
  {
    eventId: 101,
    title: 'Coastal Clean-Up Drive',
    offsetDays: -6,
    attendees: [
      { first: 'Jomar', last: 'Estrada', department: 'CCS', yearLevel: '3rd Year', contact: '+63 917 100 1101', status: 'completed', method: 'geofence', checkInHour: 7, checkOutHour: 12, hours: 5 },
      { first: 'Alyssa', last: 'Rubio', department: 'CCS', yearLevel: '2nd Year', contact: '+63 917 100 1102', status: 'completed', method: 'geofence', checkInHour: 7, checkOutHour: 12, hours: 5 },
      { first: 'Kenneth', last: 'Villanueva', department: 'CEA', yearLevel: '4th Year', contact: '+63 917 100 1103', status: 'completed', method: 'offline_sync', checkInHour: 8, checkOutHour: 12, hours: 4, remarks: 'No signal on site — coordinates pushed the next morning.' },
      { first: 'Marianne', last: 'Solon', department: 'CBA', yearLevel: '1st Year', contact: '+63 917 100 1104', status: 'absent', remarks: 'Did not arrive; no coordinates recorded.' },
      { first: 'Ray', last: 'Padilla', department: 'CAS', yearLevel: '3rd Year', contact: '+63 917 100 1105', status: 'absent', method: 'geofence', checkInHour: 8, checkOutHour: 9, hours: 0, remarks: 'Left the event area after an hour — validation did not pass.' },
      { first: 'Chesca', last: 'Lim', department: 'CCS', yearLevel: '2nd Year', contact: '+63 917 100 1106', status: 'absent', remarks: 'Withdrew two days before the event; no coordinates recorded.' },
    ],
  },
  {
    eventId: 102,
    title: 'Medical Outreach — Barangay Talamban',
    offsetDays: -2,
    attendees: [
      { first: 'Dianne', last: 'Cabrera', department: 'CNAHS', yearLevel: '4th Year', contact: '+63 917 100 1201', status: 'completed', method: 'geofence', checkInHour: 6, checkOutHour: 14, hours: 8 },
      { first: 'Paulo', last: 'Mendez', department: 'CNAHS', yearLevel: '4th Year', contact: '+63 917 100 1202', status: 'completed', method: 'geofence', checkInHour: 6, checkOutHour: 14, hours: 8 },
      { first: 'Trisha', last: 'Bacus', department: 'CNAHS', yearLevel: '3rd Year', contact: '+63 917 100 1203', status: 'completed', method: 'offline_sync', checkInHour: 7, checkOutHour: 14, hours: 7 },
      { first: 'Ivan', last: 'Delos Reyes', department: 'CAS', yearLevel: '2nd Year', contact: '+63 917 100 1204', status: 'pending', method: 'awaiting_sync', checkInHour: 7, remarks: 'Device still offline — coordinates not pushed yet.' },
      { first: 'Grace', last: 'Ortega', department: 'CBA', yearLevel: '3rd Year', contact: '+63 917 100 1205', status: 'absent' },
      { first: 'Nino', last: 'Almirante', department: 'CEA', yearLevel: '1st Year', contact: '+63 917 100 1206', status: 'completed', method: 'geofence', checkInHour: 8, checkOutHour: 13, hours: 5 },
      { first: 'Sam', last: 'Yap', department: 'CCS', yearLevel: '4th Year', contact: '+63 917 100 1207', status: 'completed', method: 'manual', checkInHour: 8, checkOutHour: 13, hours: 5, remarks: 'Phone battery died — coordinator vouched for the full duration.' },
    ],
  },
  {
    eventId: 103,
    title: 'Feeding Program — Sitio Kalunasan',
    offsetDays: 0,
    attendees: [
      { first: 'Bea', last: 'Fernandez', department: 'CBA', yearLevel: '2nd Year', contact: '+63 917 100 1301', status: 'pending', method: 'geofence', checkInHour: 8, remarks: 'Event still running — validation has not ruled yet.' },
      { first: 'Miguel', last: 'Tan', department: 'CCS', yearLevel: '3rd Year', contact: '+63 917 100 1302', status: 'pending', method: 'geofence', checkInHour: 8, remarks: 'Event still running — validation has not ruled yet.' },
      { first: 'Loraine', last: 'Abella', department: 'CAS', yearLevel: '1st Year', contact: '+63 917 100 1303', status: 'pending', method: 'awaiting_sync', checkInHour: 9, remarks: 'Buffering coordinates offline.' },
      { first: 'Hannah', last: 'Sarmiento', department: 'CNAHS', yearLevel: '2nd Year', contact: '+63 917 100 1304', status: 'pending' },
      { first: 'Dave', last: 'Roque', department: 'CEA', yearLevel: '4th Year', contact: '+63 917 100 1305', status: 'pending' },
      { first: 'Aira', last: 'Nacua', department: 'CCS', yearLevel: '1st Year', contact: '+63 917 100 1306', status: 'absent', remarks: 'Class schedule conflict — did not join.' },
    ],
  },
  {
    eventId: 104,
    title: 'Tree Planting — Busay Watershed',
    offsetDays: 9,
    attendees: [
      { first: 'Carla', last: 'Gonzaga', department: 'CEA', yearLevel: '3rd Year', contact: '+63 917 100 1401', status: 'pending' },
      { first: 'Jerome', last: 'Batucan', department: 'CCS', yearLevel: '2nd Year', contact: '+63 917 100 1402', status: 'pending' },
      { first: 'Patricia', last: 'Uy', department: 'CBA', yearLevel: '4th Year', contact: '+63 917 100 1403', status: 'pending' },
      { first: 'Ellen', last: 'Manalo', department: 'CAS', yearLevel: '2nd Year', contact: '+63 917 100 1404', status: 'pending' },
      { first: 'Rico', last: 'Salazar', department: 'CNAHS', yearLevel: '1st Year', contact: '+63 917 100 1405', status: 'pending', remarks: 'Requested transfer to the next batch.' },
    ],
  },
]

export const mockEventAttendees: EventAttendee[] = attendeeEventSeeds.flatMap((event) =>
  event.attendees.map((seed, index) => ({
    id: `att-${event.eventId}-${index + 1}`,
    eventId: event.eventId,
    eventTitle: event.title,
    eventDate: dayOffset(event.offsetDays),
    firstName: seed.first,
    lastName: seed.last,
    email: `${seed.first}.${seed.last}`.toLowerCase().replace(/\s+/g, '') + '@uclm.edu.ph',
    contactNumber: seed.contact,
    department: seed.department,
    yearLevel: seed.yearLevel,
    status: seed.status,
    registeredAt: dayOffset(event.offsetDays - 7, 10, 30),
    checkedInAt: seed.checkInHour ? dayOffset(event.offsetDays, seed.checkInHour, 15) : null,
    checkedOutAt: seed.checkOutHour ? dayOffset(event.offsetDays, seed.checkOutHour, 0) : null,
    validationMethod: seed.method ?? null,
    hoursRendered: seed.hours,
    remarks: seed.remarks,
  })),
)

/**
 * Calendar fixtures. Anchored to the current week rather than fixed dates so the
 * month, week and day grids are always populated whenever the page is opened.
 */
export function buildMockCalendarEvents(): CalendarEvent[] {
  const weekStart = dayjs().startOf('week')
  const monthStart = dayjs().startOf('month')

  /** `day` is an offset from Sunday of the current week. */
  const slot = (day: number, hour: number, minute = 0) =>
    weekStart.add(day, 'day').hour(hour).minute(minute).second(0).millisecond(0)

  const draft = (
    id: string,
    title: string,
    category: EventCategory,
    status: EventStatus,
    start: Dayjs,
    end: Dayjs,
    location: string,
    organizer: string,
    participants: number,
    maxParticipants: number,
    extras: { department?: string; allDay?: boolean } = {},
  ): CalendarEvent => ({
    id,
    title,
    category,
    status,
    location,
    organizer,
    department: extras.department,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: extras.allDay ?? false,
    participants,
    maxParticipants,
  })

  return [
    draft(
      'cal-1',
      'Barangay Clean-Up Drive',
      'Community',
      'Upcoming',
      slot(1, 7),
      slot(1, 10),
      'Barangay Guadalupe, Cebu City',
      'Prof. Dela Cruz',
      48,
      60,
      { department: 'College of Computer Studies' },
    ),
    draft(
      'cal-2',
      'Volunteer Orientation',
      'Training',
      'Upcoming',
      slot(1, 9),
      slot(1, 11, 30),
      'UCLM AVR 2',
      'CARES Office',
      35,
      40,
    ),
    draft(
      'cal-3',
      'Feeding Program Prep',
      'Charity',
      'Upcoming',
      slot(1, 13),
      slot(1, 16),
      'UCLM Gymnasium',
      'Ms. Reyes',
      22,
      30,
    ),
    draft(
      'cal-4',
      'Free Medical Check-Up',
      'Health',
      'Ongoing',
      slot(2, 8),
      slot(2, 12),
      'Brgy. Mabolo Health Center',
      'College of Nursing',
      54,
      70,
      { department: 'College of Nursing' },
    ),
    draft(
      'cal-5',
      'Department Heads Sync',
      'Seminar',
      'Upcoming',
      slot(2, 10),
      slot(2, 11),
      'Director’s Office',
      'Dr. Villanueva',
      12,
      15,
    ),
    draft(
      'cal-6',
      'Founders Week',
      'Others',
      'Ongoing',
      slot(2, 0),
      slot(3, 23, 59),
      'UCLM Main Campus',
      'Office of Student Affairs',
      0,
      0,
      { allDay: true },
    ),
    draft(
      'cal-7',
      'School Supplies Turnover',
      'Donation Drive',
      'Upcoming',
      slot(3, 9),
      slot(3, 11),
      'Talamban Elementary School',
      'Prof. Santos',
      18,
      25,
      { department: 'College of Teacher Education' },
    ),
    draft(
      'cal-8',
      'Disaster Response Drill',
      'Emergency',
      'Upcoming',
      slot(3, 14),
      slot(3, 17),
      'UCLM Quadrangle',
      'Safety Office',
      80,
      120,
    ),
    draft(
      'cal-9',
      'Coastal Clean-Up',
      'Outreach',
      'Upcoming',
      slot(4, 6, 30),
      slot(4, 10, 30),
      'Talisay Shoreline',
      'Engr. Lim',
      64,
      80,
      { department: 'College of Engineering' },
    ),
    draft(
      'cal-10',
      'Relief Goods Packing',
      'Relief Program',
      'Upcoming',
      slot(4, 13),
      slot(4, 18),
      'CARES Storage Room',
      'CARES Office',
      26,
      40,
    ),
    draft(
      'cal-11',
      'Literacy Tutorial Session',
      'School',
      'Upcoming',
      slot(5, 8),
      slot(5, 11),
      'Brgy. Lorega Day Care',
      'Prof. Abella',
      20,
      24,
      { department: 'College of Teacher Education' },
    ),
    draft(
      'cal-12',
      'Blood Donation Drive',
      'Health',
      'Upcoming',
      slot(5, 9),
      slot(5, 15),
      'UCLM Clinic',
      'Red Cross Cebu',
      90,
      150,
    ),
    draft(
      'cal-13',
      'Monthly Report Review',
      'Seminar',
      'Upcoming',
      slot(5, 16),
      slot(5, 17, 30),
      'Director’s Office',
      'Dr. Villanueva',
      9,
      12,
    ),
    draft(
      'cal-14',
      'Tree Planting Activity',
      'Community',
      'Upcoming',
      slot(6, 7),
      slot(6, 12),
      'Mt. Naupa, Naga',
      'Mr. Cabahug',
      45,
      50,
    ),
    // Spread across the month so the month grid is not one busy week and six blanks.
    draft(
      'cal-15',
      'Livelihood Skills Seminar',
      'Training',
      'Completed',
      monthStart.add(3, 'day').hour(9),
      monthStart.add(3, 'day').hour(15),
      'UCLM AVR 1',
      'Prof. Yap',
      38,
      40,
    ),
    draft(
      'cal-16',
      'Book Donation Sorting',
      'Donation Drive',
      'Completed',
      monthStart.add(9, 'day').hour(13),
      monthStart.add(9, 'day').hour(16),
      'UCLM Library Annex',
      'Ms. Ong',
      15,
      20,
    ),
    draft(
      'cal-17',
      'Fire Safety Awareness',
      'Emergency',
      'Cancelled',
      monthStart.add(17, 'day').hour(10),
      monthStart.add(17, 'day').hour(12),
      'Brgy. Apas Covered Court',
      'BFP Cebu City',
      0,
      60,
    ),
    draft(
      'cal-18',
      'Senior Citizens Outreach',
      'Outreach',
      'Upcoming',
      monthStart.add(23, 'day').hour(8),
      monthStart.add(23, 'day').hour(12),
      'Home for the Aged, Cebu',
      'Ms. Reyes',
      28,
      35,
    ),
    draft(
      'cal-19',
      'Scholarship Interview Day',
      'School',
      'Upcoming',
      monthStart.add(26, 'day').hour(9),
      monthStart.add(26, 'day').hour(16),
      'Guidance Office',
      'Dr. Villanueva',
      42,
      50,
    ),
  ]
}

/**
 * Live attendance monitor fixtures. Built on call, not at module load, and anchored to
 * *today* so the session always reads as a started, still-running event no matter when
 * the page is opened — a fixed date would show the director an empty monitor forever.
 *
 * `awaiting_sync` rows deliberately carry no pings at all: that is what the state
 * means — the device has pushed nothing yet.
 */
interface LiveAttendeeSeed {
  first: string
  last: string
  department: string
  yearLevel: string
  contact: string
  state: LiveAttendanceState
  /** Minutes after the event start; omitted for volunteers with no readings yet. */
  firstPingMinutes?: number
  /** Minutes before "now" that the latest reading landed. */
  lastPingAgoMinutes?: number
  distanceMeters?: number
  insideRatio?: number
  method?: GeoValidationMethod
  remarks?: string
}

const LIVE_SESSION_START_HOUR = 8
const LIVE_SESSION_END_HOUR = 16

const liveAttendeeSeeds: LiveAttendeeSeed[] = [
  { first: 'Bea', last: 'Fernandez', department: 'CBA', yearLevel: '2nd Year', contact: '+63 917 100 1301', state: 'in_area', firstPingMinutes: 4, lastPingAgoMinutes: 1, distanceMeters: 18, insideRatio: 0.99, method: 'geofence' },
  { first: 'Miguel', last: 'Tan', department: 'CCS', yearLevel: '3rd Year', contact: '+63 917 100 1302', state: 'in_area', firstPingMinutes: 2, lastPingAgoMinutes: 1, distanceMeters: 42, insideRatio: 0.97, method: 'geofence' },
  { first: 'Hannah', last: 'Sarmiento', department: 'CNAHS', yearLevel: '2nd Year', contact: '+63 917 100 1304', state: 'in_area', firstPingMinutes: 11, lastPingAgoMinutes: 2, distanceMeters: 65, insideRatio: 0.94, method: 'geofence' },
  { first: 'Dave', last: 'Roque', department: 'CEA', yearLevel: '4th Year', contact: '+63 917 100 1305', state: 'in_area', firstPingMinutes: 6, lastPingAgoMinutes: 3, distanceMeters: 87, insideRatio: 0.91, method: 'geofence' },
  { first: 'Nicole', last: 'Ybañez', department: 'CAS', yearLevel: '1st Year', contact: '+63 917 100 1307', state: 'in_area', firstPingMinutes: 19, lastPingAgoMinutes: 1, distanceMeters: 31, insideRatio: 0.88, method: 'geofence' },
  { first: 'Jerome', last: 'Batucan', department: 'CCS', yearLevel: '2nd Year', contact: '+63 917 100 1308', state: 'in_area', firstPingMinutes: 3, lastPingAgoMinutes: 4, distanceMeters: 54, insideRatio: 0.96, method: 'geofence' },
  { first: 'Ray', last: 'Padilla', department: 'CAS', yearLevel: '3rd Year', contact: '+63 917 100 1309', state: 'outside_area', firstPingMinutes: 8, lastPingAgoMinutes: 6, distanceMeters: 480, insideRatio: 0.62, method: 'geofence', remarks: 'Stepped out for a supply run — readings are outside the radius.' },
  { first: 'Chesca', last: 'Lim', department: 'CCS', yearLevel: '2nd Year', contact: '+63 917 100 1310', state: 'outside_area', firstPingMinutes: 15, lastPingAgoMinutes: 22, distanceMeters: 1240, insideRatio: 0.34, method: 'geofence', remarks: 'Last reading is well beyond the geofence.' },
  { first: 'Loraine', last: 'Abella', department: 'CAS', yearLevel: '1st Year', contact: '+63 917 100 1303', state: 'awaiting_sync', method: 'awaiting_sync', remarks: 'Device buffering offline — nothing pushed yet.' },
  { first: 'Aira', last: 'Nacua', department: 'CCS', yearLevel: '1st Year', contact: '+63 917 100 1306', state: 'awaiting_sync', method: 'awaiting_sync' },
  { first: 'Rico', last: 'Salazar', department: 'CNAHS', yearLevel: '1st Year', contact: '+63 917 100 1311', state: 'awaiting_sync', method: 'awaiting_sync' },
  { first: 'Patricia', last: 'Uy', department: 'CBA', yearLevel: '4th Year', contact: '+63 917 100 1312', state: 'awaiting_sync' },
  { first: 'Ellen', last: 'Manalo', department: 'CAS', yearLevel: '2nd Year', contact: '+63 917 100 1313', state: 'awaiting_sync', remarks: 'App not opened on site yet.' },
]

export function buildMockLiveAttendance(): LiveAttendanceSnapshot {
  const now = dayjs()
  const start = now.hour(LIVE_SESSION_START_HOUR).minute(0).second(0).millisecond(0)
  const end = now.hour(LIVE_SESSION_END_HOUR).minute(0).second(0).millisecond(0)

  return {
    session: {
      eventId: 103,
      title: 'Feeding Program — Sitio Kalunasan',
      location: 'Sitio Kalunasan, Cebu City',
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      radiusMeters: 150,
      coordinator: 'Prof. Dela Cruz',
    },
    attendees: liveAttendeeSeeds.map((seed, index) => ({
      id: `live-103-${index + 1}`,
      firstName: seed.first,
      lastName: seed.last,
      email: `${seed.first}.${seed.last}`.toLowerCase().replace(/\s+/g, '') + '@uclm.edu.ph',
      contactNumber: seed.contact,
      department: seed.department,
      yearLevel: seed.yearLevel,
      state: seed.state,
      // The AI service rules only once the event is over, so everyone is still pending.
      status: 'pending' as AttendanceStatus,
      validationMethod: seed.method ?? null,
      firstPingAt:
        seed.firstPingMinutes != null
          ? start.add(seed.firstPingMinutes, 'minute').toISOString()
          : null,
      lastPingAt:
        seed.lastPingAgoMinutes != null
          ? now.subtract(seed.lastPingAgoMinutes, 'minute').toISOString()
          : null,
      distanceMeters: seed.distanceMeters ?? null,
      insideRatio: seed.insideRatio,
      remarks: seed.remarks,
    })),
    capturedAt: now.toISOString(),
  }
}
