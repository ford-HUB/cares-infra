import { z } from 'zod';
import {
  AuditCategory,
  AuditOutcome,
} from '../../../infastructures/prisma/common/client';

/** How far back "recent" reaches on the dashboard, in days. */
export const OVERVIEW_RECENT_DAYS = 7;
/** Trail entries shown in the activity feed — a glance, not the audit page. */
export const OVERVIEW_ACTIVITY_LIMIT = 8;

/** Every account the platform holds, split by the role it signed up as. */
export const CommunityCountsSchema = z.object({
  volunteers: z.number(),
  /** Volunteers whose ID + face check has passed. */
  verified_volunteers: z.number(),
  beneficiaries: z.number(),
  donors: z.number(),
  /** Admin, director and coordinator accounts together. */
  staff: z.number(),
  /** Volunteer accounts created inside the recent window. */
  new_volunteers: z.number(),
});

export const EventCountsSchema = z.object({
  total: z.number(),
  upcoming: z.number(),
  ongoing: z.number(),
  completed: z.number(),
  cancelled: z.number(),
  /** Upcoming events that start inside the recent window. */
  starting_soon: z.number(),
});

/** One row per volunteer per event: every registration, and how it was judged. */
export const AttendanceCountsSchema = z.object({
  registrations: z.number(),
  completed: z.number(),
  pending: z.number(),
  absent: z.number(),
  /** Credited service hours across every COMPLETED row. */
  service_hours: z.number(),
  /** Rows judged COMPLETED inside the recent window. */
  recent_completed: z.number(),
});

/** What is waiting on a person — the counts that should be zero by end of day. */
export const QueueCountsSchema = z.object({
  reports_under_review: z.number(),
  open_support_tickets: z.number(),
  certificates_distributing: z.number(),
});

export const ActivityEntrySchema = z.object({
  audit_log_id: z.string(),
  description: z.string(),
  actor_name: z.string(),
  category: z.enum(AuditCategory),
  outcome: z.enum(AuditOutcome),
  created_at: z.iso.datetime(),
});

export const AdminOverviewResponseSchema = z.object({
  recent_days: z.number(),
  community: CommunityCountsSchema,
  events: EventCountsSchema,
  attendance: AttendanceCountsSchema,
  queues: QueueCountsSchema,
  activity: z.array(ActivityEntrySchema),
  generated_at: z.iso.datetime(),
});

/** The coordinator's own submissions, by where each one stands. */
export const ReportCountsSchema = z.object({
  under_review: z.number(),
  approved: z.number(),
  returned: z.number(),
});

export const DepartmentOverviewResponseSchema = z.object({
  recent_days: z.number(),
  /** The coordinator's college as it reads on their profile; null when unassigned. */
  department: z.string().nullable(),
  /** Volunteers whose school record files under this college. */
  volunteers: z.number(),
  new_volunteers: z.number(),
  events: EventCountsSchema,
  attendance: AttendanceCountsSchema,
  reports: ReportCountsSchema,
  generated_at: z.iso.datetime(),
});
