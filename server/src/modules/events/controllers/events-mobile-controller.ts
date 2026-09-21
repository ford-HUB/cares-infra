import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { MOBILE_ROLE_TYPES } from '../../../shared/constants/mobile-role-types';
import type {
  EventRegistrationResponseDto,
  RecommendedEventsQueryDto,
  RecommendedEventsResponseDto,
  RegisteredEventsResponseDto,
} from '../dto/events-mobile-dto';
import { EventsMobileService } from '../services/events-mobile-service';
import {
  EventRegistrationResponseSchema,
  RecommendedEventsQuerySchema,
  RecommendedEventsResponseSchema,
  RegisteredEventsResponseSchema,
} from '../validators/events-mobile-validator';
import { EventIdParamSchema } from '../validators/events-site-validator';

@Controller('v1/events')
export class EventsMobileController {
  constructor(private readonly eventsMobileService: EventsMobileService) {}

  @Get('recommended')
  @Roles(...MOBILE_ROLE_TYPES)
  @ResponseMessage('Recommended events')
  @ZSerialize(RecommendedEventsResponseSchema)
  async listRecommended(
    @CurrentUser() user: JwtPayload,
    @ZQuery(RecommendedEventsQuerySchema) query: RecommendedEventsQueryDto,
  ): Promise<RecommendedEventsResponseDto> {
    return this.eventsMobileService.listRecommended(user.sub, query.limit);
  }

  @Get('beneficiary')
  @Roles(...MOBILE_ROLE_TYPES)
  @ResponseMessage('Events open to beneficiaries')
  @ZSerialize(RegisteredEventsResponseSchema)
  async listForBeneficiaries(
    @CurrentUser() user: JwtPayload,
  ): Promise<RegisteredEventsResponseDto> {
    return this.eventsMobileService.listForBeneficiaries(user.sub);
  }

  @Get('beneficiary/completed')
  @Roles(...MOBILE_ROLE_TYPES)
  @ResponseMessage('Completed events for beneficiaries')
  @ZSerialize(RegisteredEventsResponseSchema)
  async listCompletedForBeneficiaries(
    @CurrentUser() user: JwtPayload,
  ): Promise<RegisteredEventsResponseDto> {
    return this.eventsMobileService.listCompletedForBeneficiaries(user.sub);
  }

  @Get('registered')
  @Roles(...MOBILE_ROLE_TYPES)
  @ResponseMessage('Registered events')
  @ZSerialize(RegisteredEventsResponseSchema)
  async listRegistered(
    @CurrentUser() user: JwtPayload,
  ): Promise<RegisteredEventsResponseDto> {
    return this.eventsMobileService.listRegistered(user.sub);
  }

  @Post(':id/register')
  @HttpCode(200)
  @Roles(...MOBILE_ROLE_TYPES)
  @ResponseMessage('Registered for the event')
  @ZSerialize(EventRegistrationResponseSchema)
  async register(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
  ): Promise<EventRegistrationResponseDto> {
    return this.eventsMobileService.register(user.sub, id);
  }

  @Delete(':id/register')
  @Roles(...MOBILE_ROLE_TYPES)
  @ResponseMessage('Registration cancelled')
  @ZSerialize(EventRegistrationResponseSchema)
  async unregister(
    @CurrentUser() user: JwtPayload,
    @ZParam('id', EventIdParamSchema) id: number,
  ): Promise<EventRegistrationResponseDto> {
    return this.eventsMobileService.unregister(user.sub, id);
  }
}
