import { z } from 'zod';
import {
  AuditLogChangeSchema,
  AuditLogPageResponseSchema,
  AuditLogRangeSchema,
  AuditLogSchema,
  ListAuditLogsQuerySchema,
} from '../validators/audit-logs-site-validator';

export type ListAuditLogsQueryDto = z.infer<typeof ListAuditLogsQuerySchema>;
export type AuditLogRangeDto = z.infer<typeof AuditLogRangeSchema>;
export type AuditLogChangeDto = z.infer<typeof AuditLogChangeSchema>;
export type AuditLogDto = z.infer<typeof AuditLogSchema>;
export type AuditLogPageDto = z.infer<typeof AuditLogPageResponseSchema>;
