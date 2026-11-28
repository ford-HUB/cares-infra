import { z } from 'zod';
import {
  AuditCategory,
  AuditOutcome,
} from '../../../infastructures/prisma/common/client';

export const OVERVIEW_RECENT_DAYS = 7;
/** A glance, not the audit page. */
export const OVERVIEW_ACTIVITY_LIMIT = 8;

/** Split by sign-up role. */
export const CommunityCountsSchema = z.object({
  volunteers: z.number(),
  /** ID + face check passed. */
  verified_volunteers: z.number(),
  beneficiaries: z.number(),
  donors: z.number(),
  /** Admin, director and coordinator. */
  staff: z.number(),
  /** Created inside the recent window. */
  new_volunteers: z.number(),
});

export const EventCountsSchema = z.object({
  total: z.number(),
  upcoming: z.number(),
  ongoing: z.number(),
  completed: z.number(),
  cancelled: z.number(),
  /** Starting inside the recent window. */
  starting_soon: z.number(),
});

/** One row per volunteer per event. */
export const AttendanceCountsSchema = z.object({
  registrations: z.number(),
  completed: z.number(),
  pending: z.number(),
  absent: z.number(),
  /** Across COMPLETED rows. */
  service_hours: z.number(),
  /** Within the recent window. */
  recent_completed: z.number(),
});

/** Should be zero by end of day. */
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

export const ReportCountsSchema = z.object({
  under_review: z.number(),
  approved: z.number(),
  returned: z.number(),
});

export const DepartmentOverviewResponseSchema = z.object({
  recent_days: z.number(),
  /** As on the profile; null when unassigned. */
  department: z.string().nullable(),
  volunteers: z.number(),
  new_volunteers: z.number(),
  events: EventCountsSchema,
  attendance: AttendanceCountsSchema,
  reports: ReportCountsSchema,
  generated_at: z.iso.datetime(),
});
