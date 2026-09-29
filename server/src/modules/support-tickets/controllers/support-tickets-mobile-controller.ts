import { Controller, Get, Post } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ConfirmSupportTicketFixDto,
  CreateSupportTicketDto,
  MobileSupportTicketDto,
  MobileSupportTicketListDto,
  RequesterReplyDto,
} from '../dto/support-tickets-mobile-dto';
import { SupportTicketsMobileService } from '../services/support-tickets-mobile-service';
import {
  ConfirmSupportTicketFixSchema,
  CreateSupportTicketSchema,
  MOBILE_SUPPORT_TICKET_ROLE_TYPES,
  MobileSupportTicketListResponseSchema,
  MobileSupportTicketResponseSchema,
  RequesterReplySchema,
} from '../validators/support-tickets-mobile-validator';

const TicketIdParamSchema = z.uuid('A valid support request id is required');

/**
 * The requester's side of the queue. Shares `v1/support-tickets` with the portal
 * controller; every route here is under `me/` so the two never collide, and every
 * read is scoped to the caller's own tickets.
 */
@Controller('v1/support-tickets')
@Roles(...MOBILE_SUPPORT_TICKET_ROLE_TYPES)
export class SupportTicketsMobileController {
  constructor(
    private readonly supportTicketsMobileService: SupportTicketsMobileService,
  ) {}

  @Get('me')
  @ResponseMessage('Your support requests')
  @ZSerialize(MobileSupportTicketListResponseSchema)
  async listMyTickets(
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileSupportTicketListDto> {
    return this.supportTicketsMobileService.listMyTickets(user.sub);
  }

  @Post('me')
  @ResponseMessage('Support request sent')
  @ZSerialize(MobileSupportTicketResponseSchema)
  async createTicket(
    @ZBody(CreateSupportTicketSchema) body: CreateSupportTicketDto,
    @CurrentUser() user: JwtPayload,
    @RequestContext() context: RequestContextDto,
  ): Promise<MobileSupportTicketDto> {
    return this.supportTicketsMobileService.createTicket(user.sub, body, {
      actor: user,
      context,
    });
  }

  @Get('me/:id')
  @ResponseMessage('Support request')
  @ZSerialize(MobileSupportTicketResponseSchema)
  async getMyTicket(
    @ZParam('id', TicketIdParamSchema) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileSupportTicketDto> {
    return this.supportTicketsMobileService.getMyTicket(id, user.sub);
  }

  @Post('me/:id/replies')
  @ResponseMessage('Reply sent')
  @ZSerialize(MobileSupportTicketResponseSchema)
  async reply(
    @ZParam('id', TicketIdParamSchema) id: string,
    @ZBody(RequesterReplySchema) body: RequesterReplyDto,
    @CurrentUser() user: JwtPayload,
    @RequestContext() context: RequestContextDto,
  ): Promise<MobileSupportTicketDto> {
    return this.supportTicketsMobileService.reply(id, user.sub, body, {
      actor: user,
      context,
    });
  }

  @Post('me/:id/confirm-fix')
  @ResponseMessage('Thanks for confirming')
  @ZSerialize(MobileSupportTicketResponseSchema)
  async confirmFix(
    @ZParam('id', TicketIdParamSchema) id: string,
    @ZBody(ConfirmSupportTicketFixSchema) body: ConfirmSupportTicketFixDto,
    @CurrentUser() user: JwtPayload,
    @RequestContext() context: RequestContextDto,
  ): Promise<MobileSupportTicketDto> {
    return this.supportTicketsMobileService.confirmFix(id, user.sub, body, {
      actor: user,
      context,
    });
  }

  @Post('me/:id/reopen')
  @ResponseMessage('Request reopened')
  @ZSerialize(MobileSupportTicketResponseSchema)
  async reopen(
    @ZParam('id', TicketIdParamSchema) id: string,
    @ZBody(RequesterReplySchema) body: RequesterReplyDto,
    @CurrentUser() user: JwtPayload,
    @RequestContext() context: RequestContextDto,
  ): Promise<MobileSupportTicketDto> {
    return this.supportTicketsMobileService.reopen(id, user.sub, body, {
      actor: user,
      context,
    });
  }
}
