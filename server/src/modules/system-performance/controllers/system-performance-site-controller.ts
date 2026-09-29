import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZBody, ZQuery, ZSerialize } from 'nest-zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  PerformanceSnapshotDto,
  PerformanceTickDto,
  ReportPageTimingDto,
  ReportPageTimingResponseDto,
  SnapshotQueryDto,
} from '../dto/system-performance-site-dto';
import { SystemPerformanceSiteService } from '../services/system-performance-site-service';
import {
  PerformanceSnapshotSchema,
  PerformanceTickSchema,
  ReportPageTimingResponseSchema,
  ReportPageTimingSchema,
  SnapshotQuerySchema,
} from '../validators/system-performance-site-validator';

/**
 * Host and request metrics for the Performance screen. Reading needs the
 * "View performance" right; reporting a page load does not — every portal tab
 * contributes to the page-load medians, whoever is signed in.
 */
@Controller('v1/system-performance')
@Roles(...PORTAL_ROLE_TYPES)
export class SystemPerformanceSiteController {
  constructor(
    private readonly systemPerformanceSiteService: SystemPerformanceSiteService,
  ) {}

  @Get()
  @RequirePermission(PermissionKey.SYSTEM_PERFORMANCE_VIEW)
  @ResponseMessage('Performance snapshot')
  @ZSerialize(PerformanceSnapshotSchema)
  async getSnapshot(
    @ZQuery(SnapshotQuerySchema) query: SnapshotQueryDto,
  ): Promise<PerformanceSnapshotDto> {
    return this.systemPerformanceSiteService.getSnapshot(query.range);
  }

  @Get('tick')
  @RequirePermission(PermissionKey.SYSTEM_PERFORMANCE_VIEW)
  @ResponseMessage('Latest reading')
  @ZSerialize(PerformanceTickSchema)
  getTick(): PerformanceTickDto {
    return this.systemPerformanceSiteService.getTick();
  }

  @Post('page-timings')
  @HttpCode(202)
  @ResponseMessage('Page timing recorded')
  @ZSerialize(ReportPageTimingResponseSchema)
  async reportPageTiming(
    @ZBody(ReportPageTimingSchema) data: ReportPageTimingDto,
  ): Promise<ReportPageTimingResponseDto> {
    await this.systemPerformanceSiteService.recordPageTiming(data);
    return { recorded: true };
  }
}
