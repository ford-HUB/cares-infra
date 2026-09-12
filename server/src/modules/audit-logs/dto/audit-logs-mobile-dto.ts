import { z } from 'zod';
import {
  ActivityLogEntrySchema,
  ActivityLogPageResponseSchema,
  ListMyActivityQuerySchema,
  RecordClientActivitySchema,
} from '../validators/audit-logs-mobile-validator';

export type ListMyActivityQueryDto = z.infer<typeof ListMyActivityQuerySchema>;
export type ActivityLogEntryDto = z.infer<typeof ActivityLogEntrySchema>;
export type ActivityLogPageDto = z.infer<typeof ActivityLogPageResponseSchema>;
export type RecordClientActivityDto = z.infer<
  typeof RecordClientActivitySchema
>;
