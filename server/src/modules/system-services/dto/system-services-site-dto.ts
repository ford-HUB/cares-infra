import { z } from 'zod';
import {
  ServiceDurationSchema,
  ServiceLogEntrySchema,
  ServiceTriggerSchema,
  SetServicePausedSchema,
  SystemServiceSchema,
  UpdateServiceScheduleSchema,
} from '../validators/system-services-site-validator';

export type ServiceTriggerDto = z.infer<typeof ServiceTriggerSchema>;
export type ServiceDurationDto = z.infer<typeof ServiceDurationSchema>;
export type UpdateServiceScheduleDto = z.infer<
  typeof UpdateServiceScheduleSchema
>;
export type SetServicePausedDto = z.infer<typeof SetServicePausedSchema>;
export type SystemServiceDto = z.infer<typeof SystemServiceSchema>;
export type ServiceLogEntryDto = z.infer<typeof ServiceLogEntrySchema>;
