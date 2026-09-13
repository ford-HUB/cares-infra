import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  RecommendedEventsQueryDto,
  RecommendedEventsResponseDto,
} from '../dto/events-mobile-dto';
import { EventsMobileService } from '../services/events-mobile-service';
import {
  RecommendedEventsQuerySchema,
  RecommendedEventsResponseSchema,
} from '../validators/events-mobile-validator';

@Controller('v1/events')
export class EventsMobileController {
  constructor(private readonly eventsMobileService: EventsMobileService) {}

  @Get('recommended')
  @Roles(RoleType.VOLUNTEER)
  @ResponseMessage('Recommended events')
  @ZSerialize(RecommendedEventsResponseSchema)
  async listRecommended(
    @CurrentUser() user: JwtPayload,
    @ZQuery(RecommendedEventsQuerySchema) query: RecommendedEventsQueryDto,
  ): Promise<RecommendedEventsResponseDto> {
    return this.eventsMobileService.listRecommended(user.sub, query.limit);
  }
}
