import { z } from 'zod';
import {
  ActivityEntrySchema,
  AdminOverviewResponseSchema,
  AttendanceCountsSchema,
  CommunityCountsSchema,
  DepartmentOverviewResponseSchema,
  EventCountsSchema,
  QueueCountsSchema,
  ReportCountsSchema,
} from '../validators/overview-site-validator';

export type CommunityCountsDto = z.infer<typeof CommunityCountsSchema>;
export type EventCountsDto = z.infer<typeof EventCountsSchema>;
export type AttendanceCountsDto = z.infer<typeof AttendanceCountsSchema>;
export type QueueCountsDto = z.infer<typeof QueueCountsSchema>;
export type ActivityEntryDto = z.infer<typeof ActivityEntrySchema>;
export type ReportCountsDto = z.infer<typeof ReportCountsSchema>;
export type AdminOverviewDto = z.infer<typeof AdminOverviewResponseSchema>;
export type DepartmentOverviewDto = z.infer<
  typeof DepartmentOverviewResponseSchema
>;
