import { z } from 'zod';

/** How far back the statistics reach; each value is a whole number of months. */
export const STATISTICS_RANGES = ['3m', '6m', '12m'] as const;

export const STATISTICS_RANGE_MONTHS: Record<
  (typeof STATISTICS_RANGES)[number],
  number
> = { '3m': 3, '6m': 6, '12m': 12 };

export const STATISTICS_DEFAULT_RANGE = '6m';

/** The "every category" / "every department" choice — mirrors the portal's sentinel. */
export const STATISTICS_ALL = 'all';

/** Rows the top-events table shows — enough to rank, not a full list. */
export const STATISTICS_TOP_EVENTS = 6;

export const StatisticsQuerySchema = z
  .object({
    range: z.enum(STATISTICS_RANGES).default(STATISTICS_DEFAULT_RANGE),
    /** An event category, or `all`. Matched case-insensitively. */
    category: z.string().trim().max(120).default(STATISTICS_ALL),
    /**
     * Admin / director only: the college to narrow the system to, or `all`. A
     * coordinator's scope comes from their profile and this is ignored.
     */
    department: z.string().trim().max(160).default(STATISTICS_ALL),
  })
  .strict();

/** A headline number with its movement against the previous period of the same length. */
export const StatisticSummarySchema = z.object({
  value: z.number(),
  /** Same measure over the previous period; null when there is nothing to compare to. */
  previous: z.number().nullable(),
  /** One point per month, oldest first — the sparkline behind the number. */
  trend: z.array(z.number()),
});

export const MonthlyActivitySchema = z.object({
  /** `YYYY-MM`, the grouping key; `label` is what the axis shows. */
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
  /** Volunteers with at least one completed attendance in the period. */
  active: z.number(),
});

/** One college's share of the system, for the director-level view. */
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
  /** The college the numbers are scoped to; null means every department. */
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
  /** Per-college breakdown; empty when the scope is one department. */
  departments: z.array(DepartmentActivitySchema),
  generated_at: z.string(),
});
