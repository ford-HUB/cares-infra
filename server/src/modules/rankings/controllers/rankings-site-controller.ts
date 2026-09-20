import { Controller, Get, Put } from '@nestjs/common';
import { ZBody, ZQuery, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  RankingSettingsDto,
  RankingTrendResponseDto,
  RankingsQueryDto,
  UpdateRankingSettingsDto,
  VolunteerRankingsResponseDto,
} from '../dto/rankings-site-dto';
import { RankingsSiteService } from '../services/rankings-site-service';
import {
  RankingSettingsResponseSchema,
  RankingTrendResponseSchema,
  RankingsQuerySchema,
  UpdateRankingSettingsSchema,
  VolunteerRankingsResponseSchema,
} from '../validators/rankings-site-validator';

/** The portal's Rankings area: the volunteer standings and their scoring rule. */
@Controller('v1/rankings')
@Roles(...PORTAL_ROLE_TYPES)
export class RankingsSiteController {
  constructor(private readonly rankingsSiteService: RankingsSiteService) {}

  @Get('settings')
  @ResponseMessage('Ranking settings')
  @ZSerialize(RankingSettingsResponseSchema)
  async getSettings(): Promise<RankingSettingsDto> {
    return this.rankingsSiteService.getSettings();
  }

  @Put('settings')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Ranking settings saved')
  @ZSerialize(RankingSettingsResponseSchema)
  async updateSettings(
    @ZBody(UpdateRankingSettingsSchema) data: UpdateRankingSettingsDto,
  ): Promise<RankingSettingsDto> {
    return this.rankingsSiteService.updateSettings(data);
  }

  @Get('volunteers')
  @ResponseMessage('Volunteer rankings')
  @ZSerialize(VolunteerRankingsResponseSchema)
  async listVolunteers(
    @CurrentUser() user: JwtPayload,
    @ZQuery(RankingsQuerySchema) query: RankingsQueryDto,
  ): Promise<VolunteerRankingsResponseDto> {
    return this.rankingsSiteService.listVolunteers(user, query.period);
  }

  @Get('volunteers/trend')
  @ResponseMessage('Volunteer ranking trend')
  @ZSerialize(RankingTrendResponseSchema)
  async getTrend(
    @CurrentUser() user: JwtPayload,
    @ZQuery(RankingsQuerySchema) query: RankingsQueryDto,
  ): Promise<RankingTrendResponseDto> {
    return this.rankingsSiteService.getTrend(user, query.period);
  }
}
