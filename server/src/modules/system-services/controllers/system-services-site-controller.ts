import { Controller, Get, Patch, Post } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  ServiceLogEntryDto,
  SetServicePausedDto,
  SystemServiceDto,
  UpdateServiceScheduleDto,
} from '../dto/system-services-site-dto';
import { SystemServicesSiteService } from '../services/system-services-site-service';
import {
  ServiceLogListSchema,
  SetServicePausedSchema,
  SystemServiceListSchema,
  UpdateServiceScheduleSchema,
} from '../validators/system-services-site-validator';

/** Scheduler ids are catalogue slugs, not uuids. */
const ServiceIdParamSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'A valid service id is required');

/**
 * The scheduler control board. Reading and writing share one right — "Manage
 * services" — because the screen exists to operate the schedulers, not to browse
 * them; there is no read-only audience for it.
 */
@Controller('v1/system-services')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.SYSTEM_SERVICE_MANAGE)
export class SystemServicesSiteController {
  constructor(
    private readonly systemServicesSiteService: SystemServicesSiteService,
  ) {}

  @Get()
  @ResponseMessage('System services')
  @ZSerialize(SystemServiceListSchema)
  async listServices(): Promise<SystemServiceDto[]> {
    return this.systemServicesSiteService.listServices();
  }

  @Get(':id/logs')
  @ResponseMessage('Service logs')
  @ZSerialize(ServiceLogListSchema)
  async getServiceLogs(
    @ZParam('id', ServiceIdParamSchema) id: string,
  ): Promise<ServiceLogEntryDto[]> {
    return this.systemServicesSiteService.getServiceLogs(id);
  }

  @Patch(':id/paused')
  @ResponseMessage('Service updated')
  @ZSerialize(SystemServiceListSchema)
  async setPaused(
    @ZParam('id', ServiceIdParamSchema) id: string,
    @ZBody(SetServicePausedSchema) data: SetServicePausedDto,
  ): Promise<SystemServiceDto[]> {
    return this.systemServicesSiteService.setPaused(id, data.paused);
  }

  @Post(':id/run')
  @ResponseMessage('Run started')
  @ZSerialize(SystemServiceListSchema)
  async triggerRun(
    @ZParam('id', ServiceIdParamSchema) id: string,
  ): Promise<SystemServiceDto[]> {
    return this.systemServicesSiteService.triggerRun(id);
  }

  @Post(':id/stop')
  @ResponseMessage('Run stopped')
  @ZSerialize(SystemServiceListSchema)
  async stopRun(
    @ZParam('id', ServiceIdParamSchema) id: string,
  ): Promise<SystemServiceDto[]> {
    return this.systemServicesSiteService.stopRun(id);
  }

  @Patch(':id/schedule')
  @ResponseMessage('Schedule updated')
  @ZSerialize(SystemServiceListSchema)
  async updateSchedule(
    @ZParam('id', ServiceIdParamSchema) id: string,
    @ZBody(UpdateServiceScheduleSchema) data: UpdateServiceScheduleDto,
  ): Promise<SystemServiceDto[]> {
    return this.systemServicesSiteService.updateSchedule(id, data);
  }
}
