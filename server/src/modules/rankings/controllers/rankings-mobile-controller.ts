import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { MOBILE_ROLE_TYPES } from '../../../shared/constants/mobile-role-types';
import type {
  DonorLeaderboardResponseDto,
  LeaderboardQueryDto,
  LeaderboardResponseDto,
} from '../dto/rankings-mobile-dto';
import { RankingsMobileService } from '../services/rankings-mobile-service';
import {
  DonorLeaderboardResponseSchema,
  LeaderboardQuerySchema,
  LeaderboardResponseSchema,
} from '../validators/rankings-mobile-validator';

/** The volunteer app's Ranks tab and the home header's rank badge. */
@Controller('v1/rankings')
@Roles(...MOBILE_ROLE_TYPES)
export class RankingsMobileController {
  constructor(private readonly rankingsMobileService: RankingsMobileService) {}

  @Get('leaderboard')
  @ResponseMessage('Leaderboard')
  @ZSerialize(LeaderboardResponseSchema)
  async getLeaderboard(
    @CurrentUser() user: JwtPayload,
    @ZQuery(LeaderboardQuerySchema) query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.rankingsMobileService.getLeaderboard(user.sub, query.period);
  }

  /** The donor app's Ranks tab: confirmed giving at the portal's peso-per-point rate. */
  @Get('donors/leaderboard')
  @ResponseMessage('Donor leaderboard')
  @ZSerialize(DonorLeaderboardResponseSchema)
  async getDonorLeaderboard(
    @CurrentUser() user: JwtPayload,
    @ZQuery(LeaderboardQuerySchema) query: LeaderboardQueryDto,
  ): Promise<DonorLeaderboardResponseDto> {
    return this.rankingsMobileService.getDonorLeaderboard(
      user.sub,
      query.period,
    );
  }
}
