import dayjs from 'dayjs'
import type { AuditLogActor, AuditLogEntry } from '../types/audit-log'
import type { AttendanceStatus, GeoValidationMethod } from '../types/attendee'
import type {
  LiveAttendanceSnapshot,
  LiveAttendanceState,
} from '../types/attendance'
import type { NotificationFeed } from '../types/notification'
import type {
  Announcement,
  MaintenanceMode,
  MaintenanceWindow,
} from '../types/maintenance'
import type {
  CpuCore,
  EndpointLatency,
  PageLoadTiming,
  PerformanceHost,
  PerformanceSample,
  PerformanceSnapshot,
  ProcessLoad,
} from '../types/system-performance'
import type {
  ServiceLogEntry,
  ServiceRun,
  ServiceState,
  SystemService,
} from '../types/system-service'

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

/**
 * The scheduler roster for System Services. The workers are not built yet, so the
 * fixture describes what each one will do and where its runs sit in the cycle;
 * timestamps are relative to now so the page reads as a live board.
 */
interface SystemServiceSeed {
  id: string
  name: string
  description: string
  owner: SystemService['owner']
  state: ServiceState
  trigger: SystemService['trigger']
  duration: SystemService['duration']
  averageRuntimeSeconds: number
  /** Minutes since the last run started. */
  lastRunAgoMinutes: number
  /** Minutes until the next trigger; null for manual-only services. */
  nextRunInMinutes: number | null
  onDutyDays: number
  /** Outcomes of the recent runs, oldest first. */
  outcomes: ServiceRun['outcome'][]
  lastError: string | null
}

const systemServiceSeeds: SystemServiceSeed[] = [
  {
    id: 'attendance-sync',
    name: 'Attendance Sync Worker',
    description: 'Flushes offline attendance readings queued by volunteer devices into the event roster.',
    owner: 'mobile-sync',
    state: 'running',
    trigger: { mode: 'interval', intervalMinutes: 5, dailyAt: '00:00', cronExpression: '*/5 * * * *' },
    duration: { maxRuntimeMinutes: 2, retries: 2, overlapPolicy: 'skip' },
    averageRuntimeSeconds: 41,
    lastRunAgoMinutes: 0,
    nextRunInMinutes: 5,
    onDutyDays: 34,
    outcomes: ['success', 'success', 'success', 'success', 'success', 'timed_out', 'success', 'success', 'success', 'success', 'success', 'running'],
    lastError: null,
  },
  {
    id: 'geofence-validator',
    name: 'Geofence Validation Pass',
    description: 'Runs the AI check over closed events and marks each volunteer present, absent, or for review.',
    owner: 'microservices',
    state: 'scheduled',
    trigger: { mode: 'interval', intervalMinutes: 15, dailyAt: '00:00', cronExpression: '*/15 * * * *' },
    duration: { maxRuntimeMinutes: 10, retries: 1, overlapPolicy: 'queue' },
    averageRuntimeSeconds: 188,
    lastRunAgoMinutes: 9,
    nextRunInMinutes: 6,
    onDutyDays: 21,
    outcomes: ['success', 'success', 'failed', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success'],
    lastError: null,
  },
  {
    id: 'certificate-dispatcher',
    name: 'Certificate Dispatcher',
    description: 'Renders approved certificate deployments and emails them to their volunteers.',
    owner: 'server',
    state: 'failing',
    trigger: { mode: 'interval', intervalMinutes: 30, dailyAt: '00:00', cronExpression: '*/30 * * * *' },
    duration: { maxRuntimeMinutes: 15, retries: 3, overlapPolicy: 'skip' },
    averageRuntimeSeconds: 402,
    lastRunAgoMinutes: 24,
    nextRunInMinutes: 6,
    onDutyDays: 12,
    outcomes: ['success', 'success', 'success', 'success', 'success', 'success', 'timed_out', 'failed', 'failed', 'success', 'failed', 'failed'],
    lastError: 'SMTP relay refused 12 of 40 recipients — mailbox quota exceeded.',
  },
  {
    id: 'event-reminders',
    name: 'Event Reminder Notifier',
    description: 'Pushes day-before and hour-before reminders to volunteers booked on upcoming events.',
    owner: 'server',
    state: 'scheduled',
    trigger: { mode: 'interval', intervalMinutes: 60, dailyAt: '00:00', cronExpression: '0 * * * *' },
    duration: { maxRuntimeMinutes: 5, retries: 2, overlapPolicy: 'skip' },
    averageRuntimeSeconds: 63,
    lastRunAgoMinutes: 38,
    nextRunInMinutes: 22,
    onDutyDays: 57,
    outcomes: ['success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success'],
    lastError: null,
  },
  {
    id: 'session-reaper',
    name: 'Session & Token Reaper',
    description: 'Clears expired portal sessions and refresh tokens so the active-sessions list stays truthful.',
    owner: 'server',
    state: 'scheduled',
    trigger: { mode: 'interval', intervalMinutes: 10, dailyAt: '00:00', cronExpression: '*/10 * * * *' },
    duration: { maxRuntimeMinutes: 1, retries: 1, overlapPolicy: 'skip' },
    averageRuntimeSeconds: 8,
    lastRunAgoMinutes: 4,
    nextRunInMinutes: 6,
    onDutyDays: 92,
    outcomes: ['success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success'],
    lastError: null,
  },
  {
    id: 'monthly-report-compiler',
    name: 'Monthly Report Compiler',
    description: 'Builds each department’s monthly report packet and files it for the director’s review.',
    owner: 'server',
    state: 'scheduled',
    trigger: { mode: 'daily', intervalMinutes: 1440, dailyAt: '01:30', cronExpression: '30 1 * * *' },
    duration: { maxRuntimeMinutes: 30, retries: 1, overlapPolicy: 'queue' },
    averageRuntimeSeconds: 754,
    lastRunAgoMinutes: 640,
    nextRunInMinutes: 800,
    onDutyDays: 12,
    outcomes: ['success', 'success', 'success', 'success', 'success', 'timed_out', 'success', 'success', 'success', 'success', 'success', 'success'],
    lastError: null,
  },
  {
    id: 'face-index-refresh',
    name: 'Face Index Refresh',
    description: 'Re-embeds newly verified volunteer faces so scan-in matches the current roster.',
    owner: 'microservices',
    state: 'paused',
    trigger: { mode: 'daily', intervalMinutes: 1440, dailyAt: '02:15', cronExpression: '15 2 * * *' },
    duration: { maxRuntimeMinutes: 60, retries: 0, overlapPolicy: 'skip' },
    averageRuntimeSeconds: 1620,
    lastRunAgoMinutes: 2_140,
    nextRunInMinutes: null,
    onDutyDays: 0,
    outcomes: ['success', 'success', 'success', 'success', 'failed', 'success', 'success', 'success', 'success', 'success', 'success', 'success'],
    lastError: null,
  },
  {
    id: 'audit-archiver',
    name: 'Audit Log Archiver',
    description: 'Compresses audit entries past the retention window and snapshots them to cold storage.',
    owner: 'server',
    state: 'scheduled',
    trigger: { mode: 'cron', intervalMinutes: 1440, dailyAt: '03:00', cronExpression: '0 3 * * 0' },
    duration: { maxRuntimeMinutes: 30, retries: 1, overlapPolicy: 'skip' },
    averageRuntimeSeconds: 512,
    lastRunAgoMinutes: 3_100,
    nextRunInMinutes: 1_180,
    onDutyDays: 44,
    outcomes: ['success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success', 'success'],
    lastError: null,
  },
]

export function buildMockSystemServices(): SystemService[] {
  const now = dayjs()

  return systemServiceSeeds.map((seed) => {
    const lastRunAt = now.subtract(seed.lastRunAgoMinutes, 'minute')

    return {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      owner: seed.owner,
      state: seed.state,
      trigger: seed.trigger,
      duration: seed.duration,
      averageRuntimeSeconds: seed.averageRuntimeSeconds,
      lastRunAt: lastRunAt.toISOString(),
      nextRunAt:
        seed.state === 'paused' || seed.nextRunInMinutes === null
          ? null
          : now.add(seed.nextRunInMinutes, 'minute').toISOString(),
      currentRunStartedAt:
        seed.state === 'running' ? now.subtract(27, 'second').toISOString() : null,
      onDutyDays: seed.onDutyDays,
      recentRuns: seed.outcomes.map((outcome, index) => {
        const spacingMinutes = seed.trigger.intervalMinutes
        const startedAt = lastRunAt.subtract(
          (seed.outcomes.length - 1 - index) * spacingMinutes,
          'minute',
        )
        // Failures die early, timeouts sit at the cap — a flat strip would hide both.
        const durationSeconds =
          outcome === 'timed_out'
            ? seed.duration.maxRuntimeMinutes * 60
            : outcome === 'failed'
              ? Math.round(seed.averageRuntimeSeconds * 0.35)
              : outcome === 'running'
                ? 27
                : Math.round(seed.averageRuntimeSeconds * (0.82 + (index % 5) * 0.09))

        return {
          id: `${seed.id}-run-${index + 1}`,
          startedAt: startedAt.toISOString(),
          durationSeconds,
          outcome,
        }
      }),
      lastError: seed.lastError,
    }
  })
}

/** Per-service log flavour: what a healthy run of that worker actually prints. */
const systemServiceLogLines: Record<string, string[]> = {
  'attendance-sync': [
    'claimed 3 device queues (mobile-sync v1.4.2)',
    'merged 42 readings into event 103 roster',
    'acknowledged queues, 0 readings left pending',
  ],
  'geofence-validator': [
    'loaded 2 closed events awaiting validation',
    'ucid-service returned 38 verdicts in 2.1 s',
    'wrote 34 present, 3 absent, 1 for review',
  ],
  'certificate-dispatcher': [
    'picked up 40 approved deployments',
    'rendered 40 certificates from template "Volunteer 2026"',
    'handed 40 messages to the SMTP relay',
  ],
  'event-reminders': [
    'found 6 events starting within 24 h',
    'queued 118 push notifications, 118 emails',
    'delivery receipts: 118 accepted',
  ],
  'session-reaper': [
    'scanned 214 sessions, 9 past expiry',
    'revoked 9 refresh tokens',
  ],
  'monthly-report-compiler': [
    'compiling packets for 5 departments',
    'aggregated 1,204 attendance rows',
    'filed 5 packets for director review',
  ],
  'face-index-refresh': [
    're-embedding 63 newly verified faces',
    'fr-service index rebuilt, 1,842 vectors',
  ],
  'audit-archiver': [
    'selected 12,400 entries past the retention window',
    'compressed to 3 archives, 41 MB',
    'uploaded to cold storage, verified checksums',
  ],
}

/** The failure each service reports when a run goes wrong, in its own vocabulary. */
const systemServiceFailureLines: Record<string, string> = {
  'attendance-sync': 'device queue lock held by a previous run — 1 queue skipped',
  'geofence-validator': 'ucid-service returned 503 on batch 2 of 3',
  'certificate-dispatcher': 'SMTP relay refused 12 of 40 recipients — mailbox quota exceeded',
  'event-reminders': 'push gateway rejected 4 stale device tokens',
  'session-reaper': 'session table locked by a migration, retrying next trigger',
  'monthly-report-compiler': 'department "Nursing" has no closed events this period',
  'face-index-refresh': 'fr-service model file missing an embedding for volunteer 4412',
  'audit-archiver': 'cold storage credentials expired',
}

/**
 * The log the scheduler wrote for each of its recent runs, newest run last. Built
 * from the same runs the history strip draws, so a red tick and the error line a
 * staff member opens to explain it always agree.
 */
export function buildMockServiceLogs(service: SystemService): ServiceLogEntry[] {
  const body = systemServiceLogLines[service.id] ?? ['worker step completed']
  const failure = systemServiceFailureLines[service.id] ?? 'worker step failed'

  return service.recentRuns.flatMap((run) => {
    const at = (offsetSeconds: number) =>
      dayjs(run.startedAt).add(offsetSeconds, 'second').toISOString()
    const step = run.durationSeconds / (body.length + 1)

    const lines: ServiceLogEntry[] = [
      {
        id: `${run.id}-start`,
        runId: run.id,
        at: at(0),
        level: 'info',
        message: `run started · trigger ${service.trigger.mode} · cap ${service.duration.maxRuntimeMinutes} min`,
      },
      ...body.map((message, index) => ({
        id: `${run.id}-step-${index}`,
        runId: run.id,
        at: at(Math.round(step * (index + 1))),
        level: 'info' as const,
        message,
      })),
    ]

    if (run.outcome === 'running') return lines

    if (run.outcome === 'failed') {
      lines.push({
        id: `${run.id}-error`,
        runId: run.id,
        at: at(run.durationSeconds),
        level: 'error',
        message: failure,
      })
    }

    if (run.outcome === 'timed_out') {
      lines.push({
        id: `${run.id}-timeout`,
        runId: run.id,
        at: at(run.durationSeconds),
        level: 'warn',
        message: `runtime cap of ${service.duration.maxRuntimeMinutes} min reached — run killed by the scheduler`,
      })
    }

    lines.push({
      id: `${run.id}-end`,
      runId: run.id,
      at: at(run.durationSeconds),
      level: run.outcome === 'success' ? 'info' : 'warn',
      message:
        run.outcome === 'success'
          ? `run finished in ${Math.round(run.durationSeconds)}s`
          : `run ended ${run.outcome === 'failed' ? 'with errors' : 'at the cap'} after ${Math.round(run.durationSeconds)}s`,
    })

    return lines
  })
}

/**
 * Maintenance fixtures. The system is live when the page first loads — the interesting
 * screen is the one where a window is booked for tonight and the notice has already
 * gone out, so the roster is written that way.
 */
export function buildMockMaintenanceMode(): MaintenanceMode {
  return {
    enabled: false,
    surfaces: [],
    since: null,
    estimatedEndAt: null,
    message:
      'CARES is briefly offline for scheduled maintenance. Attendance already recorded on your phone is safe and will sync when we are back.',
    allowAdmins: true,
    changedBy: null,
  }
}

export function buildMockMaintenanceWindows(): MaintenanceWindow[] {
  const tonight = dayjs().add(1, 'day').hour(1).minute(0).second(0).millisecond(0)

  return [
    {
      id: 'win-db-migration',
      title: 'Database migration — attendance tables',
      reason: 'Adds the geofence columns the new attendance monitor reads.',
      surfaces: ['portal', 'mobile', 'api'],
      startAt: tonight.toISOString(),
      endAt: tonight.add(90, 'minute').toISOString(),
      state: 'scheduled',
      noticeLeadMinutes: 60,
      allowAdmins: true,
      createdBy: 'A. Reyes',
    },
    {
      id: 'win-cert-worker',
      title: 'Certificate dispatcher upgrade',
      reason: 'New template engine; issued certificates are re-rendered on the way.',
      surfaces: ['api'],
      startAt: dayjs().add(4, 'day').hour(2).minute(30).toISOString(),
      endAt: dayjs().add(4, 'day').hour(3).minute(15).toISOString(),
      state: 'scheduled',
      noticeLeadMinutes: 1440,
      allowAdmins: true,
      createdBy: 'System',
    },
    {
      id: 'win-storage-swap',
      title: 'Media storage cutover',
      reason: 'ID photos and event media moved to the new S3 bucket.',
      surfaces: ['portal', 'mobile', 'public', 'api'],
      startAt: dayjs().subtract(6, 'day').hour(1).minute(0).toISOString(),
      endAt: dayjs().subtract(6, 'day').hour(2).minute(40).toISOString(),
      state: 'completed',
      noticeLeadMinutes: 1440,
      allowAdmins: true,
      createdBy: 'A. Reyes',
    },
    {
      id: 'win-public-refresh',
      title: 'Public site content refresh',
      reason: 'Called off — the change shipped without downtime.',
      surfaces: ['public'],
      startAt: dayjs().subtract(2, 'day').hour(22).minute(0).toISOString(),
      endAt: dayjs().subtract(2, 'day').hour(23).minute(0).toISOString(),
      state: 'cancelled',
      noticeLeadMinutes: 30,
      allowAdmins: true,
      createdBy: 'M. Cruz',
    },
  ]
}

export function buildMockAnnouncements(): Announcement[] {
  return [
    {
      id: 'ann-tonight-window',
      title: 'CARES is offline tonight, 1:00–2:30 AM',
      body: 'We are upgrading the attendance database. Check in before 12:45 AM or after 2:30 AM. Anything recorded offline on your phone will sync on its own once we are back.',
      tone: 'warning',
      audiences: ['volunteers', 'staff'],
      channels: ['portal', 'mobile', 'email'],
      state: 'published',
      publishAt: dayjs().subtract(3, 'hour').toISOString(),
      expiresAt: dayjs().add(1, 'day').hour(3).toISOString(),
      pinned: true,
      windowId: 'win-db-migration',
      author: 'A. Reyes',
      reach: 1284,
    },
    {
      id: 'ann-cert-worker',
      title: 'Certificates pause briefly this Saturday',
      body: 'Certificate issuing is paused from 2:30 to 3:15 AM while the dispatcher is upgraded. Requests filed during the pause are queued, not lost.',
      tone: 'info',
      audiences: ['staff'],
      channels: ['portal'],
      state: 'scheduled',
      publishAt: dayjs().add(3, 'day').hour(9).toISOString(),
      expiresAt: dayjs().add(4, 'day').hour(4).toISOString(),
      pinned: false,
      windowId: 'win-cert-worker',
      author: 'System',
      reach: 0,
    },
    {
      id: 'ann-outreach-call',
      title: 'Volunteers needed — Barangay Guadalupe outreach',
      body: 'Twenty more volunteers are needed for the medical mission on the 22nd. Slots open in the app under Upcoming Events.',
      tone: 'info',
      audiences: ['volunteers'],
      channels: ['mobile', 'email'],
      state: 'draft',
      publishAt: dayjs().add(1, 'day').hour(8).toISOString(),
      expiresAt: null,
      pinned: false,
      windowId: null,
      author: 'M. Cruz',
      reach: 0,
    },
    {
      id: 'ann-payroll-window',
      title: 'Donation receipts were delayed on the 3rd',
      body: 'Receipts filed between 9:00 and 11:20 AM on the 3rd were queued behind a stuck worker and sent late. Every one of them went out; no donation was lost.',
      tone: 'warning',
      audiences: ['donors', 'staff'],
      channels: ['portal', 'email'],
      state: 'expired',
      publishAt: dayjs().subtract(2, 'day').hour(11).minute(40).toISOString(),
      expiresAt: dayjs().subtract(1, 'day').toISOString(),
      pinned: false,
      windowId: null,
      author: 'J. Villanueva',
      reach: 244,
    },
    {
      id: 'ann-app-update',
      title: 'Volunteer app 2.4 is out — update before your next event',
      body: 'Offline check-in and the new QR scanner ship in 2.4. Phones still on 2.3 can check in, but attendance will not sync until the app is updated.',
      tone: 'info',
      audiences: ['volunteers'],
      channels: ['mobile', 'portal'],
      state: 'published',
      publishAt: dayjs().subtract(4, 'day').hour(8).minute(15).toISOString(),
      expiresAt: null,
      pinned: false,
      windowId: null,
      author: 'M. Cruz',
      reach: 1042,
    },
    {
      id: 'ann-storage-done',
      title: 'Media storage cutover finished',
      body: 'Photos and IDs uploaded before the cutover are all accounted for. Report anything that still fails to load through Support Tickets.',
      tone: 'info',
      audiences: ['staff', 'volunteers', 'beneficiaries', 'donors'],
      channels: ['portal', 'mobile'],
      state: 'expired',
      publishAt: dayjs().subtract(6, 'day').hour(4).toISOString(),
      expiresAt: dayjs().subtract(4, 'day').toISOString(),
      pinned: false,
      windowId: 'win-storage-swap',
      author: 'A. Reyes',
      reach: 2140,
    },
    {
      id: 'ann-scholarship-deadline',
      title: 'Scholarship requirement filing closes on the 30th',
      body: 'Beneficiaries have until 11:59 PM on the 30th to file their post-requirements. Anything filed after that moves to next term\u2019s review queue.',
      tone: 'critical',
      audiences: ['beneficiaries', 'staff'],
      channels: ['portal', 'mobile', 'email'],
      state: 'expired',
      publishAt: dayjs().subtract(12, 'day').hour(7).minute(30).toISOString(),
      expiresAt: dayjs().subtract(9, 'day').toISOString(),
      pinned: false,
      windowId: null,
      author: 'R. Dela Cruz',
      reach: 668,
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* System performance                                                          */
/* -------------------------------------------------------------------------- */

/** The box CARES runs on, quoted on the page so percentages have a unit. */
const performanceHost: PerformanceHost = {
  name: 'cares-app-01',
  region: 'ap-southeast-1 · Singapore',
  vcpu: 8,
  memoryGb: 32,
  uptimeHours: 296,
}

/**
 * Deterministic 0–1 noise. A redraw must not reshuffle the history behind the live
 * cursor, so the wobble is a function of the sample index, never `Math.random()`.
 */
function performanceNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * One reading built from slow and fast waves plus noise, so the chart has the shape
 * of real load — a drifting baseline with bursts on top — rather than a sine wave.
 * `dayShape` lifts the daytime hours on the 24 h view, where a flat line would be a
 * lie about how the portal is actually used.
 */
function buildPerformanceSample(
  at: dayjs.Dayjs,
  index: number,
  dayShape: boolean,
): PerformanceSample {
  const hourOfDay = at.hour() + at.minute() / 60
  // Office hours peak; the small hours are the report jobs only.
  const daytime = dayShape
    ? 0.35 + 0.65 * Math.max(0, Math.sin(((hourOfDay - 6) / 14) * Math.PI))
    : 1

  const burst = performanceNoise(index * 1.7) > 0.93 ? 14 : 0

  const cpuUser = clamp(
    (26 + 9 * Math.sin(index / 9) + 5 * Math.sin(index / 3.1) + burst) * daytime +
      4 * performanceNoise(index),
    6,
    82,
  )
  const cpuSystem = clamp(
    (8 + 2.5 * Math.sin(index / 7 + 1)) * daytime + 2 * performanceNoise(index + 11),
    2,
    24,
  )
  const cpuIoWait = clamp(
    (3.5 + 2.5 * Math.sin(index / 11 + 2) + burst / 3) * daytime +
      2 * performanceNoise(index + 29),
    0.4,
    18,
  )

  const busy = cpuUser + cpuSystem + cpuIoWait
  const requestsPerMinute = Math.round(
    clamp((150 + 70 * Math.sin(index / 8) + burst * 6) * daytime + 30 * performanceNoise(index + 5), 20, 460),
  )

  // Response time follows the host, not its own curve: the tail is what queueing and
  // I/O wait do to the median, which is the whole point of charting them together.
  const responseP50 = clamp(96 + busy * 1.9 + 18 * performanceNoise(index + 41), 80, 900)
  const responseP95 = clamp(
    responseP50 * 2.4 + cpuIoWait * 18 + 90 * performanceNoise(index + 61),
    responseP50 * 1.6,
    2_600,
  )

  return {
    at: at.toISOString(),
    cpuUser: Number(cpuUser.toFixed(1)),
    cpuSystem: Number(cpuSystem.toFixed(1)),
    cpuIoWait: Number(cpuIoWait.toFixed(1)),
    memoryPercent: Number(
      clamp(58 + 7 * Math.sin(index / 17) + 3 * performanceNoise(index + 7), 40, 94).toFixed(1),
    ),
    requestsPerMinute,
    responseP50Ms: Math.round(responseP50),
    responseP95Ms: Math.round(responseP95),
  }
}

/** The window of readings behind the charts, oldest first, ending at "now". */
export function buildMockPerformanceSamples(
  points: number,
  stepSeconds: number,
): PerformanceSample[] {
  const now = dayjs()

  return Array.from({ length: points }, (_, index) =>
    buildPerformanceSample(
      now.subtract((points - 1 - index) * stepSeconds, 'second'),
      index,
      stepSeconds >= 600,
    ),
  )
}

/**
 * The next live reading, walked from the one before it. Continuity matters more than
 * realism here: a stream that jumps every tick reads as a broken sensor.
 */
export function buildNextPerformanceSample(
  previous: PerformanceSample,
): PerformanceSample {
  const walk = (value: number, spread: number, min: number, max: number) =>
    Number(clamp(value + (Math.random() - 0.5) * spread, min, max).toFixed(1))

  const cpuUser = walk(previous.cpuUser, 9, 6, 88)
  const cpuSystem = walk(previous.cpuSystem, 3, 2, 24)
  const cpuIoWait = walk(previous.cpuIoWait, 2.5, 0.4, 18)
  const busy = cpuUser + cpuSystem + cpuIoWait

  const responseP50Ms = Math.round(clamp(96 + busy * 1.9 + Math.random() * 24, 80, 900))

  return {
    at: new Date().toISOString(),
    cpuUser,
    cpuSystem,
    cpuIoWait,
    memoryPercent: walk(previous.memoryPercent, 1.6, 40, 94),
    requestsPerMinute: Math.round(
      clamp(previous.requestsPerMinute + (Math.random() - 0.5) * 60, 20, 460),
    ),
    responseP50Ms,
    responseP95Ms: Math.round(
      clamp(responseP50Ms * 2.4 + cpuIoWait * 18 + Math.random() * 110, responseP50Ms * 1.6, 2_600),
    ),
  }
}

/** What each core is mostly running, so a hot core points somewhere. */
const performanceCoreWork = [
  'API request handlers',
  'API request handlers',
  'OCR inference',
  'Face-recognition inference',
  'Prisma query pool',
  'Report compiler',
  'Attendance sync',
  'Idle / spare capacity',
]

/**
 * Per-core load derived from the live reading rather than fixed, so the analysis card
 * stays consistent with the chart above it. The ML cores carry the burst — that is the
 * finding the card is there to surface.
 */
export function buildMockCpuCores(sample: PerformanceSample, vcpu: number): CpuCore[] {
  const busy = sample.cpuUser + sample.cpuSystem + sample.cpuIoWait
  // Weights sum to `vcpu`, so the weighted mean lands back on the host average.
  const weights = [1.05, 1, 1.75, 1.6, 0.95, 0.7, 0.55, 0.4]

  return Array.from({ length: vcpu }, (_, index) => ({
    id: index,
    usagePercent: Number(
      clamp(busy * (weights[index % weights.length] ?? 1), 2, 99).toFixed(1),
    ),
    runningWhat: performanceCoreWork[index % performanceCoreWork.length],
  }))
}

/** Shares of host capacity, scaled to the live reading so the column stays honest. */
const performanceProcessSeeds: Array<
  Omit<ProcessLoad, 'cpuPercent'> & { share: number }
> = [
  { id: 'ocr-service', name: 'ocr-service (uvicorn)', owner: 'microservices', share: 0.29, memoryMb: 1_960, threads: 12 },
  { id: 'fr-service', name: 'fr-service (uvicorn)', owner: 'microservices', share: 0.24, memoryMb: 2_480, threads: 10 },
  { id: 'cares-api', name: 'cares-api (node)', owner: 'server', share: 0.21, memoryMb: 1_120, threads: 18 },
  { id: 'postgres', name: 'postgres (primary)', owner: 'database', share: 0.13, memoryMb: 3_240, threads: 24 },
  { id: 'ucid-service', name: 'ucid-service (uvicorn)', owner: 'microservices', share: 0.08, memoryMb: 890, threads: 6 },
  { id: 'nginx', name: 'nginx (site)', owner: 'site', share: 0.05, memoryMb: 140, threads: 4 },
]

export function buildMockProcessLoad(sample: PerformanceSample): ProcessLoad[] {
  const busy = sample.cpuUser + sample.cpuSystem + sample.cpuIoWait

  return performanceProcessSeeds.map((seed) => ({
    id: seed.id,
    name: seed.name,
    owner: seed.owner,
    memoryMb: seed.memoryMb,
    threads: seed.threads,
    cpuPercent: Number((busy * seed.share).toFixed(1)),
  }))
}

/** Trend strip for a route: recent p95 readings around its median. */
function buildLatencyTrend(p95: number, seed: number): number[] {
  return Array.from({ length: 12 }, (_, index) =>
    Math.round(p95 * (0.78 + 0.42 * performanceNoise(seed + index * 3.7))),
  )
}

const performanceEndpointSeeds: Array<
  Omit<EndpointLatency, 'trend'> & { seed: number }
> = [
  { id: 'ep-ocr', method: 'POST', route: '/api/v1/registration/ocr-scan', callsPerMinute: 14, p50Ms: 1_180, p95Ms: 2_340, errorRate: 0.021, seed: 3 },
  { id: 'ep-face', method: 'POST', route: '/api/v1/registration/face-verify', callsPerMinute: 11, p50Ms: 940, p95Ms: 1_780, errorRate: 0.014, seed: 9 },
  { id: 'ep-reports', method: 'GET', route: '/api/v1/reports/monthly', callsPerMinute: 6, p50Ms: 610, p95Ms: 1_460, errorRate: 0, seed: 17 },
  { id: 'ep-attendance', method: 'POST', route: '/api/v1/attendance/sync', callsPerMinute: 42, p50Ms: 288, p95Ms: 720, errorRate: 0.004, seed: 23 },
  { id: 'ep-users', method: 'GET', route: '/api/v1/users', callsPerMinute: 96, p50Ms: 132, p95Ms: 340, errorRate: 0, seed: 31 },
  { id: 'ep-events', method: 'GET', route: '/api/v1/events', callsPerMinute: 78, p50Ms: 118, p95Ms: 262, errorRate: 0, seed: 37 },
  { id: 'ep-certs', method: 'PATCH', route: '/api/v1/certificates/:id/deploy', callsPerMinute: 4, p50Ms: 240, p95Ms: 520, errorRate: 0.008, seed: 43 },
  { id: 'ep-notices', method: 'GET', route: '/api/v1/system-notices', callsPerMinute: 61, p50Ms: 46, p95Ms: 96, errorRate: 0, seed: 47 },
  { id: 'ep-session', method: 'DELETE', route: '/api/v1/sessions/:id', callsPerMinute: 3, p50Ms: 64, p95Ms: 132, errorRate: 0, seed: 53 },
  { id: 'ep-login', method: 'POST', route: '/api/v1/auth/login', callsPerMinute: 19, p50Ms: 210, p95Ms: 430, errorRate: 0.011, seed: 59 },
]

export function buildMockEndpointLatency(): EndpointLatency[] {
  return performanceEndpointSeeds.map(({ seed, ...endpoint }) => ({
    ...endpoint,
    trend: buildLatencyTrend(endpoint.p95Ms, seed),
  }))
}

/** Browser-side load of the screens staff open most, measured in the field. */
export function buildMockPageLoadTimings(): PageLoadTiming[] {
  return [
    { id: 'page-dashboard', label: 'Dashboard overview', ttfbMs: 148, domReadyMs: 420, interactiveMs: 910, samples: 1_842 },
    { id: 'page-attendance', label: 'Attendance monitor', ttfbMs: 210, domReadyMs: 560, interactiveMs: 1_340, samples: 964 },
    { id: 'page-users', label: 'Manage users', ttfbMs: 172, domReadyMs: 480, interactiveMs: 1_060, samples: 1_310 },
    { id: 'page-map', label: 'Event map', ttfbMs: 196, domReadyMs: 720, interactiveMs: 2_180, samples: 388 },
    { id: 'page-reports', label: 'Monthly reports', ttfbMs: 640, domReadyMs: 1_020, interactiveMs: 1_720, samples: 246 },
  ]
}

export function buildMockPerformanceSnapshot(
  points: number,
  stepSeconds: number,
): PerformanceSnapshot {
  const samples = buildMockPerformanceSamples(points, stepSeconds)
  const latest = samples[samples.length - 1]
  const busy = latest.cpuUser + latest.cpuSystem + latest.cpuIoWait

  return {
    capturedAt: latest.at,
    host: performanceHost,
    samples,
    cores: buildMockCpuCores(latest, performanceHost.vcpu),
    processes: buildMockProcessLoad(latest),
    endpoints: buildMockEndpointLatency(),
    pages: buildMockPageLoadTimings(),
    // Load average is the run queue, so it tracks busy CPU across the vCPU count.
    loadAverage: [
      Number(((busy / 100) * performanceHost.vcpu).toFixed(2)),
      Number(((busy / 100) * performanceHost.vcpu * 0.92).toFixed(2)),
      Number(((busy / 100) * performanceHost.vcpu * 0.81).toFixed(2)),
    ],
  }
}
