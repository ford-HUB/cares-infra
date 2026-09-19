import {
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZBody, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  LiveCoordinateDto,
  LiveCoordinateResponseDto,
  SyncCoordinatesFieldsDto,
  SyncCoordinatesResponseDto,
} from '../dto/event-attendance-mobile-dto';
import { EventAttendanceMobileService } from '../services/event-attendance-mobile-service';
import {
  LiveCoordinateResponseSchema,
  LiveCoordinateSchema,
  SyncCoordinatesFieldsSchema,
  SyncCoordinatesResponseSchema,
} from '../validators/event-attendance-mobile-validator';

/**
 * Where the volunteer app's geofence recorder sends its coordinates: one JSON reading
 * per second while online, or one CSV per event for what it buffered offline.
 */
@Controller('v1/attendance/geofence/mobile')
@Roles(RoleType.VOLUNTEER)
export class EventAttendanceMobileController {
  constructor(
    private readonly eventAttendanceMobileService: EventAttendanceMobileService,
  ) {}

  @Post('coordinates')
  @HttpCode(200)
  @ResponseMessage('Coordinate recorded')
  @ZSerialize(LiveCoordinateResponseSchema)
  async recordLive(
    @CurrentUser() user: JwtPayload,
    @ZBody(LiveCoordinateSchema) reading: LiveCoordinateDto,
  ): Promise<LiveCoordinateResponseDto> {
    return this.eventAttendanceMobileService.recordLive(user.sub, reading);
  }

  @Post('sync')
  @HttpCode(200)
  @ResponseMessage('Coordinates synced')
  @ZSerialize(SyncCoordinatesResponseSchema)
  @UseInterceptors(FileInterceptor('file'))
  async recordSync(
    @CurrentUser() user: JwtPayload,
    @ZBody(SyncCoordinatesFieldsSchema) fields: SyncCoordinatesFieldsDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<SyncCoordinatesResponseDto> {
    return this.eventAttendanceMobileService.recordSync(user.sub, fields, file);
  }
}
