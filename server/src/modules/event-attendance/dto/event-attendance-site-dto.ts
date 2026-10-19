import { z } from 'zod';
import {
  EventAttendeeQuerySchema,
  EventAttendeeResponseSchema,
  LiveAttendanceSnapshotSchema,
  LiveAttendeeResponseSchema,
  ManualAttendanceResponseSchema,
  ManualAttendanceSchema,
} from '../validators/event-attendance-site-validator';

export type EventAttendeeQueryDto = z.infer<typeof EventAttendeeQuerySchema>;
export type EventAttendeeDto = z.infer<typeof EventAttendeeResponseSchema>;
export type LiveAttendeeDto = z.infer<typeof LiveAttendeeResponseSchema>;
export type LiveAttendanceSnapshotDto = z.infer<
  typeof LiveAttendanceSnapshotSchema
>;
export type ManualAttendanceDto = z.infer<typeof ManualAttendanceSchema>;
export type ManualAttendanceResultDto = z.infer<
  typeof ManualAttendanceResponseSchema
>;
