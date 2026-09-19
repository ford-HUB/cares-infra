import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { RoleType } from '../../../infastructures/prisma/common/client';
import type {
  EventRegistrationResponseDto,
  RecommendedEventsQueryDto,
  RecommendedEventsResponseDto,
} from '../dto/events-mobile-dto';
import { EventsMobileService } from '../services/events-mobile-service';
import {
  EventRegistrationResponseSchema,
  RecommendedEventsQuerySchema,
  RecommendedEventsResponseSchema,
} from '../validators/events-mobile-validator';
import { EventIdParamSchema } from '../validators/events-site-validator';

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

  @Post(':id/register')
  @HttpCode(200)
  @Roles(RoleType.VOLUNTEER)
  @ResponseMessage('Registered for the event')
  @ZSerialize(EventRegistrationResponseSchema)
  async register(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
  ): Promise<EventRegistrationResponseDto> {
    return this.eventsMobileService.register(user.sub, id);
  }

  @Delete(':id/register')
  @Roles(RoleType.VOLUNTEER)
  @ResponseMessage('Registration cancelled')
  @ZSerialize(EventRegistrationResponseSchema)
  async unregister(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
  ): Promise<EventRegistrationResponseDto> {
    return this.eventsMobileService.unregister(user.sub, id);
  }
}
