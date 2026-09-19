import { z } from 'zod';
import {
  EventAttendeeQuerySchema,
  EventAttendeeResponseSchema,
  LiveAttendanceSnapshotSchema,
  LiveAttendeeResponseSchema,
} from '../validators/event-attendance-site-validator';

export type EventAttendeeQueryDto = z.infer<typeof EventAttendeeQuerySchema>;
export type EventAttendeeDto = z.infer<typeof EventAttendeeResponseSchema>;
export type LiveAttendeeDto = z.infer<typeof LiveAttendeeResponseSchema>;
export type LiveAttendanceSnapshotDto = z.infer<
  typeof LiveAttendanceSnapshotSchema
>;
