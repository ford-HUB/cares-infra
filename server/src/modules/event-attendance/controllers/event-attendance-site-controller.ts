import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import type {
  EventAttendeeDto,
  EventAttendeeQueryDto,
} from '../dto/event-attendance-site-dto';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { EventAttendanceSiteService } from '../services/event-attendance-site-service';
import {
  EventAttendeeListResponseSchema,
  EventAttendeeQuerySchema,
} from '../validators/event-attendance-site-validator';

/**
 * Sits on its own path rather than under `v1/events/:id` so the roster can be loaded
 * across every event at once — which is what the portal's attendees table shows.
 */
@Controller('v1/event-attendees')
@Roles(...PORTAL_ROLE_TYPES)
export class EventAttendanceSiteController {
  constructor(
    private readonly eventAttendanceSiteService: EventAttendanceSiteService,
  ) {}

  @Get()
  @ResponseMessage('Event attendees')
  @ZSerialize(EventAttendeeListResponseSchema)
  async listAttendees(
    @ZQuery(EventAttendeeQuerySchema) query: EventAttendeeQueryDto,
  ): Promise<EventAttendeeDto[]> {
    return this.eventAttendanceSiteService.listAttendees(query.event_id);
  }
}
