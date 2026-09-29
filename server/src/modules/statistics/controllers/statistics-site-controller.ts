import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  StatisticsQueryDto,
  StatisticsResponseDto,
} from '../dto/statistics-site-dto';
import { StatisticsSiteService } from '../services/statistics-site-service';
import {
  StatisticsQuerySchema,
  StatisticsResponseSchema,
} from '../validators/statistics-site-validator';

/**
 * The Statistics page. One route for every portal role: the service scopes a
 * coordinator to their own college and lets admin and director pick one.
 */
@Controller('v1/statistics')
@Roles(...PORTAL_ROLE_TYPES)
export class StatisticsSiteController {
  constructor(private readonly statisticsSiteService: StatisticsSiteService) {}

  @Get()
  @ResponseMessage('Statistics')
  @ZSerialize(StatisticsResponseSchema)
  async getStatistics(
    @CurrentUser() caller: JwtPayload,
    @ZQuery(StatisticsQuerySchema) query: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto> {
    return this.statisticsSiteService.getStatistics(
      caller.sub,
      caller.role_type,
      query,
    );
  }
}
