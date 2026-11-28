import { z } from 'zod';

/** Whole months. */
export const STATISTICS_RANGES = ['3m', '6m', '12m'] as const;

export const STATISTICS_RANGE_MONTHS: Record<
  (typeof STATISTICS_RANGES)[number],
  number
> = { '3m': 3, '6m': 6, '12m': 12 };

export const STATISTICS_DEFAULT_RANGE = '6m';

/** Must match the portal's sentinel. */
export const STATISTICS_ALL = 'all';

export const STATISTICS_TOP_EVENTS = 6;

export const StatisticsQuerySchema = z
  .object({
    range: z.enum(STATISTICS_RANGES).default(STATISTICS_DEFAULT_RANGE),
    /** Case-insensitive. */
    category: z.string().trim().max(120).default(STATISTICS_ALL),
    /** Admin/director only; ignored for coordinators. */
    department: z.string().trim().max(160).default(STATISTICS_ALL),
  })
  .strict();

/** Compared to the previous equal-length period. */
export const StatisticSummarySchema = z.object({
  value: z.number(),
  /** Null when nothing to compare. */
  previous: z.number().nullable(),
  /** Monthly, oldest first (sparkline). */
  trend: z.array(z.number()),
});

export const MonthlyActivitySchema = z.object({
  /** `YYYY-MM` grouping key; `label` is for display. */
  period: z.string(),
  label: z.string(),
  events_held: z.number(),
  registrations: z.number(),
  attended: z.number(),
  service_hours: z.number(),
});

export const AttendanceOutcomesSchema = z.object({
  completed: z.number(),
  pending: z.number(),
  absent: z.number(),
});

export const CategoryActivitySchema = z.object({
  category: z.string(),
  events: z.number(),
  registrations: z.number(),
  outcomes: AttendanceOutcomesSchema,
});

export const MonthlyReportActivitySchema = z.object({
  period: z.string(),
  label: z.string(),
  outcomes: z.object({
    approved: z.number(),
    under_review: z.number(),
    returned: z.number(),
  }),
});

export const YearLevelParticipationSchema = z.object({
  year_level: z.string(),
  volunteers: z.number(),
  /** At least one completed attendance. */
  active: z.number(),
});

export const DepartmentActivitySchema = z.object({
  department: z.string(),
  events: z.number(),
  registrations: z.number(),
  attended: z.number(),
  service_hours: z.number(),
});

export const TopEventSchema = z.object({
  event_id: z.number(),
  title: z.string(),
  category: z.string(),
  date: z.string(),
  registrations: z.number(),
  attended: z.number(),
  service_hours: z.number(),
});

export const StatisticsResponseSchema = z.object({
  /** Null means every department. */
  department: z.string().nullable(),
  range: z.enum(STATISTICS_RANGES),
  summary: z.object({
    events_held: StatisticSummarySchema,
    active_volunteers: StatisticSummarySchema,
    attendance_rate: StatisticSummarySchema,
    service_hours: StatisticSummarySchema,
  }),
  monthly: z.array(MonthlyActivitySchema),
  categories: z.array(CategoryActivitySchema),
  reports: z.array(MonthlyReportActivitySchema),
  year_levels: z.array(YearLevelParticipationSchema),
  top_events: z.array(TopEventSchema),
  /** Empty when scoped to one department. */
  departments: z.array(DepartmentActivitySchema),
  generated_at: z.string(),
});
