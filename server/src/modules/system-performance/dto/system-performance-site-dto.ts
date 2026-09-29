import { z } from 'zod';
import {
  CpuCoreSchema,
  EndpointLatencySchema,
  PageLoadTimingSchema,
  PerformanceRangeSchema,
  PerformanceSampleSchema,
  PerformanceSnapshotSchema,
  PerformanceTickSchema,
  ProcessLoadSchema,
  ReportPageTimingResponseSchema,
  ReportPageTimingSchema,
  SnapshotQuerySchema,
} from '../validators/system-performance-site-validator';

export type PerformanceRangeDto = z.infer<typeof PerformanceRangeSchema>;
export type SnapshotQueryDto = z.infer<typeof SnapshotQuerySchema>;
export type PerformanceSampleDto = z.infer<typeof PerformanceSampleSchema>;
export type CpuCoreDto = z.infer<typeof CpuCoreSchema>;
export type ProcessLoadDto = z.infer<typeof ProcessLoadSchema>;
export type EndpointLatencyDto = z.infer<typeof EndpointLatencySchema>;
export type PageLoadTimingDto = z.infer<typeof PageLoadTimingSchema>;
export type PerformanceSnapshotDto = z.infer<typeof PerformanceSnapshotSchema>;
export type PerformanceTickDto = z.infer<typeof PerformanceTickSchema>;
export type ReportPageTimingDto = z.infer<typeof ReportPageTimingSchema>;
export type ReportPageTimingResponseDto = z.infer<
  typeof ReportPageTimingResponseSchema
>;
