import {
  Controller,
  Get,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ChatConversationDto,
  ChatDirectoryDto,
  ChatMessageDto,
  ChatReadReceiptDto,
  SendChatMessageDto,
} from '../dto/chat-site-dto';
import { ChatSiteService } from '../services/chat-site-service';
import {
  CHAT_ATTACHMENT_MAX_COUNT,
  ChatConversationResponseSchema,
  ChatDirectoryResponseSchema,
  ChatMessageSchema,
  ChatReadReceiptSchema,
  SendChatMessageSchema,
} from '../validators/chat-site-validator';

const ContactIdParamSchema = z.uuid('A valid contact id is required');
const AttachmentIdParamSchema = z.uuid('A valid attachment id is required');

@Controller('v1/chat')
@Roles(...PORTAL_ROLE_TYPES)
export class ChatSiteController {
  constructor(private readonly chatSiteService: ChatSiteService) {}

  @Get('contacts')
  @ResponseMessage('Chat directory')
  @ZSerialize(ChatDirectoryResponseSchema)
  async getDirectory(
    @CurrentUser() caller: JwtPayload,
  ): Promise<ChatDirectoryDto> {
    return this.chatSiteService.getDirectory(caller);
  }

  @Get('conversations/:contactId/messages')
  @ResponseMessage('Conversation')
  @ZSerialize(ChatConversationResponseSchema)
  async getConversation(
    @CurrentUser() caller: JwtPayload,
    @ZParam('contactId', ContactIdParamSchema) contactId: string,
  ): Promise<ChatConversationDto> {
    return this.chatSiteService.getConversation(caller, contactId);
  }

  @Post('conversations/:contactId/messages')
  @ResponseMessage('Message sent')
  @ZSerialize(ChatMessageSchema)
  @UseInterceptors(FilesInterceptor('files', CHAT_ATTACHMENT_MAX_COUNT))
  async sendMessage(
    @CurrentUser() caller: JwtPayload,
    @ZParam('contactId', ContactIdParamSchema) contactId: string,
    @ZBody(SendChatMessageSchema) data: SendChatMessageDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<ChatMessageDto> {
    return this.chatSiteService.sendMessage(caller, contactId, data, files);
  }

  @Post('conversations/:contactId/read')
  @ResponseMessage('Conversation marked as read')
  @ZSerialize(ChatReadReceiptSchema)
  async markRead(
    @CurrentUser() caller: JwtPayload,
    @ZParam('contactId', ContactIdParamSchema) contactId: string,
  ): Promise<ChatReadReceiptDto> {
    return this.chatSiteService.markRead(caller, contactId);
  }

  @Get('attachments/:attachmentId')
  async getAttachment(
    @CurrentUser() caller: JwtPayload,
    @ZParam('attachmentId', AttachmentIdParamSchema) attachmentId: string,
  ) {
    const attachment = await this.chatSiteService.getAttachment(
      caller,
      attachmentId,
    );

    return new StreamableFile(attachment.buffer, {
      type: attachment.contentType,
      disposition: `inline; filename="${encodeURIComponent(attachment.name)}"`,
    });
  }
}
