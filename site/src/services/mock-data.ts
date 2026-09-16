import dayjs from 'dayjs'
import type { AuditLogActor, AuditLogEntry } from '../types/audit-log'
import type { AttendanceStatus, GeoValidationMethod } from '../types/attendee'
import type {
  LiveAttendanceSnapshot,
  LiveAttendanceState,
} from '../types/attendance'
import type {
  Announcement,
  MaintenanceMode,
  MaintenanceWindow,
} from '../types/maintenance'

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
      audiences: ['volunteers', 'coordinators'],
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
      audiences: ['coordinators'],
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
      audiences: ['donors', 'coordinators'],
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
      audiences: ['coordinators', 'volunteers', 'beneficiaries', 'donors'],
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
      audiences: ['beneficiaries', 'coordinators'],
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
