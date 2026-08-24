import { Controller, Get, Patch, Post } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ListSupportTicketsQueryDto,
  ReplyToSupportTicketDto,
  SupportTicketDto,
  SupportTicketListDto,
  UpdateSupportTicketDto,
} from '../dto/support-tickets-site-dto';
import { SupportTicketsSiteService } from '../services/support-tickets-site-service';
import {
  ListSupportTicketsQuerySchema,
  ReplyToSupportTicketSchema,
  SupportTicketListResponseSchema,
  SupportTicketResponseSchema,
  UpdateSupportTicketSchema,
} from '../validators/support-tickets-site-validator';

const TicketIdParamSchema = z.uuid('A valid support ticket id is required');

/** The queue is worked by the whole portal staff, not admins alone. */
@Controller('v1/support-tickets')
@Roles(...PORTAL_ROLE_TYPES)
export class SupportTicketsSiteController {
  constructor(
    private readonly supportTicketsSiteService: SupportTicketsSiteService,
  ) {}

  @Get()
  @ResponseMessage('Support tickets')
  @ZSerialize(SupportTicketListResponseSchema)
  async listTickets(
    @ZQuery(ListSupportTicketsQuerySchema) query: ListSupportTicketsQueryDto,
  ): Promise<SupportTicketListDto> {
    return this.supportTicketsSiteService.listTickets(query);
  }

  @Patch(':id')
  @ResponseMessage('Support ticket updated')
  @ZSerialize(SupportTicketResponseSchema)
  async updateTicket(
    @ZParam('id', TicketIdParamSchema) id: string,
    @ZBody(UpdateSupportTicketSchema) body: UpdateSupportTicketDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicketDto> {
    return this.supportTicketsSiteService.updateTicket(id, user.sub, body);
  }

  @Post(':id/replies')
  @ResponseMessage('Reply sent')
  @ZSerialize(SupportTicketResponseSchema)
  async replyToTicket(
    @ZParam('id', TicketIdParamSchema) id: string,
    @ZBody(ReplyToSupportTicketSchema) body: ReplyToSupportTicketDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SupportTicketDto> {
    return this.supportTicketsSiteService.replyToTicket(id, user.sub, body);
  }
}
