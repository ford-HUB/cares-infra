import { z } from 'zod';
import {
  EventAttendeeQuerySchema,
  EventAttendeeResponseSchema,
} from '../validators/event-attendance-site-validator';

export type EventAttendeeQueryDto = z.infer<typeof EventAttendeeQuerySchema>;
export type EventAttendeeDto = z.infer<typeof EventAttendeeResponseSchema>;
