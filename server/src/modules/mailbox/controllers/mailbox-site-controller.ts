import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { GmailOAuthGuard } from 'src/infastructures/passport/guards/gmail-oauth-guard';
import type { GmailOAuthResult } from 'src/infastructures/passport/strategies/gmail-strategy';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { Public } from 'src/shared/decorators/public-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ListMailQueryDto,
  MailDetailDto,
  MailListDto,
  MailSummaryDto,
  MailboxAuthorizeDto,
  MailboxConnectionDto,
  MailboxDisconnectDto,
  MarkMailReadDto,
  SendMailDto,
  SendMailResponseDto,
} from '../dto/mailbox-site-dto';
import { MailboxSiteService } from '../services/mailbox-site-service';
import {
  ListMailQuerySchema,
  MailDetailSchema,
  MailListResponseSchema,
  MailSummarySchema,
  MailboxAuthorizeResponseSchema,
  MailboxConnectionResponseSchema,
  MailboxDisconnectResponseSchema,
  MarkMailReadSchema,
  SendMailResponseSchema,
  SendMailSchema,
} from '../validators/mailbox-site-validator';

const MessageIdParamSchema = z
  .string()
  .trim()
  .min(1, 'A message id is required')
  .max(200);

/**
 * Passport hangs the consent result on `req.user` for the callback leg only — it is a
 * Google grant, never a CARES identity, so it deliberately shadows Express' `user`.
 */
type GmailCallbackRequest = Omit<Request, 'user'> & {
  user?: GmailOAuthResult | null;
};

/**
 * Admin only. The mailbox is the system operator's support channel, and each admin
 * links their own Google account — nothing here is shared between portal users.
 */
@Controller('v1/mailbox')
export class MailboxSiteController {
  constructor(private readonly mailboxSiteService: MailboxSiteService) {}

  @Get('connection')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Mailbox connection')
  @ZSerialize(MailboxConnectionResponseSchema)
  async getConnection(
    @CurrentUser() user: JwtPayload,
  ): Promise<MailboxConnectionDto> {
    return this.mailboxSiteService.getConnection(user.sub);
  }

  @Post('connection')
  @Roles(RoleType.ADMIN)
  @HttpCode(200)
  @ResponseMessage('Google authorization link created')
  @ZSerialize(MailboxAuthorizeResponseSchema)
  async createAuthorizeUrl(
    @CurrentUser() user: JwtPayload,
  ): Promise<MailboxAuthorizeDto> {
    return this.mailboxSiteService.createAuthorizeUrl(user.sub);
  }

  @Delete('connection')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Google account disconnected')
  @ZSerialize(MailboxDisconnectResponseSchema)
  async disconnect(
    @CurrentUser() user: JwtPayload,
  ): Promise<MailboxDisconnectDto> {
    return this.mailboxSiteService.disconnect(user.sub);
  }

  /**
   * Entered by a browser redirect, so it carries no bearer token — the caller is proven
   * by the single-use `state` nonce minted by `POST connection`.
   */
  @Get('google')
  @Public()
  @UseGuards(GmailOAuthGuard)
  startGoogleConsent(): void {
    // Passport redirects to Google before this ever runs.
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GmailOAuthGuard)
  async handleGoogleCallback(
    @Req() request: GmailCallbackRequest,
    @Res() response: Response,
  ): Promise<void> {
    const state =
      typeof request.query.state === 'string' ? request.query.state : undefined;

    const redirectUrl = await this.mailboxSiteService.completeConnection(
      state,
      request.user ?? null,
    );

    response.redirect(redirectUrl);
  }

  @Get('messages')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Mail messages')
  @ZSerialize(MailListResponseSchema)
  async listMail(
    @CurrentUser() user: JwtPayload,
    @ZQuery(ListMailQuerySchema) query: ListMailQueryDto,
  ): Promise<MailListDto> {
    return this.mailboxSiteService.listMail(user.sub, query);
  }

  @Post('messages')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Message sent')
  @ZSerialize(SendMailResponseSchema)
  async sendMail(
    @CurrentUser() user: JwtPayload,
    @ZBody(SendMailSchema) data: SendMailDto,
  ): Promise<SendMailResponseDto> {
    return this.mailboxSiteService.sendMail(user.sub, data);
  }

  @Get('messages/:messageId')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Mail message')
  @ZSerialize(MailDetailSchema)
  async getMail(
    @CurrentUser() user: JwtPayload,
    @ZParam('messageId', MessageIdParamSchema) messageId: string,
  ): Promise<MailDetailDto> {
    return this.mailboxSiteService.getMail(user.sub, messageId);
  }

  @Patch('messages/:messageId/read-state')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Message updated')
  @ZSerialize(MailSummarySchema)
  async markRead(
    @CurrentUser() user: JwtPayload,
    @ZParam('messageId', MessageIdParamSchema) messageId: string,
    @ZBody(MarkMailReadSchema) data: MarkMailReadDto,
  ): Promise<MailSummaryDto> {
    return this.mailboxSiteService.markRead(user.sub, messageId, data);
  }
}
