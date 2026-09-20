import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  LeaderboardQueryDto,
  LeaderboardResponseDto,
} from '../dto/rankings-mobile-dto';
import { RankingsMobileService } from '../services/rankings-mobile-service';
import {
  LeaderboardQuerySchema,
  LeaderboardResponseSchema,
} from '../validators/rankings-mobile-validator';

/** The volunteer app's Ranks tab and the home header's rank badge. */
@Controller('v1/rankings')
@Roles(RoleType.VOLUNTEER)
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
}
