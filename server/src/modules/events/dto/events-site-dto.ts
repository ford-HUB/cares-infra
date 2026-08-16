import { z } from 'zod';
import { EventStatus } from '../../../infastructures/prisma/common/client';
import {
  CreateEventSchema,
  EventResponseSchema,
  UpdateDonationsSchema,
  UpdateEventSchema,
} from '../validators/events-site-validator';

export type CreateEventDto = z.infer<typeof CreateEventSchema>;
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;
export type UpdateDonationsDto = z.infer<typeof UpdateDonationsSchema>;
export type EventDto = z.infer<typeof EventResponseSchema>;

/** Repository-facing shape — never serialized to a client, so it has no schema. */
export interface PersistEventDto {
  title: string;
  description: string;
  event_started: Date;
  event_ended: Date;
  location: string;
  max_participants: number;
  organizer_name: string;
  category: string;
  department: string | null;
  specified_category: string | null;
  images: string[];
  status: EventStatus;
  funds_donation: boolean;
  goods_donation: boolean;
  goods_types: string[];
  beneficiary_applicable: boolean;
  max_beneficiaries: number | null;
  geojson: unknown | null;
  area_sqm: number | null;
}
