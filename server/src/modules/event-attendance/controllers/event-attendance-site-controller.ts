import { Controller, Get, Post } from '@nestjs/common';
import { ZBody, ZQuery, ZSerialize } from 'nest-zod';
import { PermissionKey } from '../../../infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  EventAttendeeDto,
  EventAttendeeQueryDto,
  LiveAttendanceSnapshotDto,
  ManualAttendanceDto,
  ManualAttendanceResultDto,
} from '../dto/event-attendance-site-dto';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { EventAttendanceSiteService } from '../services/event-attendance-site-service';
import {
  EventAttendeeListResponseSchema,
  EventAttendeeQuerySchema,
  LiveAttendanceSnapshotSchema,
  ManualAttendanceResponseSchema,
  ManualAttendanceSchema,
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

  /**
   * One poll of the running event and who the geofence sees on site. The server
   * picks the event so a director watching the page cannot drift onto a stale one.
   */
  @Get('live')
  @ResponseMessage('Live attendance')
  @ZSerialize(LiveAttendanceSnapshotSchema)
  async getLiveAttendance(): Promise<LiveAttendanceSnapshotDto> {
    return this.eventAttendanceSiteService.getLiveSnapshot();
  }

  @Get()
  @ResponseMessage('Event attendees')
  @ZSerialize(EventAttendeeListResponseSchema)
  async listAttendees(
    @ZQuery(EventAttendeeQuerySchema) query: EventAttendeeQueryDto,
  ): Promise<EventAttendeeDto[]> {
    return this.eventAttendanceSiteService.listAttendees(query.event_id);
  }

  /**
   * The backup for a failed geofence: marks the selected participants present and
   * credits each the full event window as service hours.
   */
  @Post('manual-attendance')
  @RequirePermission(PermissionKey.ATTENDANCE_MANUAL_MARK)
  @ResponseMessage('Attendance marked')
  @ZSerialize(ManualAttendanceResponseSchema)
  async markPresent(
    @CurrentUser() caller: JwtPayload,
    @ZBody(ManualAttendanceSchema) body: ManualAttendanceDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<ManualAttendanceResultDto> {
    return this.eventAttendanceSiteService.markPresentManually(
      caller,
      body,
      context,
    );
  }
}
