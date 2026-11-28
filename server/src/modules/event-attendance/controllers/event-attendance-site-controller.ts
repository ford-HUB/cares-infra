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

/** Own path so the roster spans every event. */
@Controller('v1/event-attendees')
@Roles(...PORTAL_ROLE_TYPES)
export class EventAttendanceSiteController {
  constructor(
    private readonly eventAttendanceSiteService: EventAttendanceSiteService,
  ) {}

  /** The server picks the event so the page can't drift onto a stale one. */
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

  /** Geofence fallback: marks present and credits the full event window. */
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
