import { z } from 'zod';
import {
  CategoryActivitySchema,
  DepartmentActivitySchema,
  MonthlyActivitySchema,
  MonthlyReportActivitySchema,
  StatisticSummarySchema,
  StatisticsQuerySchema,
  StatisticsResponseSchema,
  TopEventSchema,
  YearLevelParticipationSchema,
} from '../validators/statistics-site-validator';

export type StatisticsQueryDto = z.infer<typeof StatisticsQuerySchema>;
export type StatisticsRange = StatisticsQueryDto['range'];
export type StatisticSummaryDto = z.infer<typeof StatisticSummarySchema>;
export type MonthlyActivityDto = z.infer<typeof MonthlyActivitySchema>;
export type CategoryActivityDto = z.infer<typeof CategoryActivitySchema>;
export type MonthlyReportActivityDto = z.infer<
  typeof MonthlyReportActivitySchema
>;
export type YearLevelParticipationDto = z.infer<
  typeof YearLevelParticipationSchema
>;
export type DepartmentActivityDto = z.infer<typeof DepartmentActivitySchema>;
export type TopEventDto = z.infer<typeof TopEventSchema>;
export type StatisticsResponseDto = z.infer<typeof StatisticsResponseSchema>;
