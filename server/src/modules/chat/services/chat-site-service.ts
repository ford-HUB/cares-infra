import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { PORTAL_ROLE_TYPES } from '../../../shared/constants/portal-role-types';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type {
  ChatConversationDto,
  ChatDirectoryDto,
  ChatMessageDto,
  ChatReadReceiptDto,
  SendChatMessageDto,
} from '../dto/chat-site-dto';
import { ChatGateway } from '../gateways/chat-gateway';
import {
  ChatRepository,
  type ChatMessageRow,
  type NewAttachment,
} from '../repositories/chat-repository';
import {
  CHAT_ALLOWED_ATTACHMENT_MIMES,
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MAX_COUNT,
  CHAT_MESSAGE_PAGE_SIZE,
} from '../validators/chat-site-validator';

@Injectable()
export class ChatSiteService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly s3Service: S3Service,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getDirectory(caller: JwtPayload): Promise<ChatDirectoryDto> {
    const [contacts, threads] = await Promise.all([
      this.chatRepository.listContacts(caller.sub, PORTAL_ROLE_TYPES),
      this.chatRepository.listThreads(caller.sub),
    ]);

    return {
      contacts: contacts.map((contact) => ({
        user_id: contact.user_id,
        firstname: contact.firstname,
        lastname: contact.lastname,
        email: contact.accounts[0]?.email ?? '',
        role_type: contact.role.type,
        department: contact.portal_department,
      })),
      threads: threads.map((thread) => ({
        contact_id: thread.contactId,
        conversation_id: thread.conversationId,
        preview: thread.preview,
        last_message_at: thread.lastMessageAt.toISOString(),
        unread: thread.unread,
      })),
    };
  }

  /** A contact with no history yet resolves to a null conversation, not a 404. */
  async getConversation(
    caller: JwtPayload,
    contactId: string,
  ): Promise<ChatConversationDto> {
    await this.assertContact(caller, contactId);

    const conversationId = await this.chatRepository.findConversationBetween(
      caller.sub,
      contactId,
    );

    if (!conversationId) {
      return { conversation_id: null, contact_id: contactId, messages: [] };
    }

    const messages = await this.chatRepository.listMessages(
      conversationId,
      CHAT_MESSAGE_PAGE_SIZE,
    );
    await this.chatRepository.markRead(conversationId, caller.sub);

    return {
      conversation_id: conversationId,
      contact_id: contactId,
      messages: messages.map((message) => this.mapMessage(message)),
    };
  }

  async sendMessage(
    caller: JwtPayload,
    contactId: string,
    data: SendChatMessageDto,
    files?: Express.Multer.File[],
  ): Promise<ChatMessageDto> {
    await this.assertContact(caller, contactId);

    const body = data.body.trim();
    if (!body && !files?.length) {
      throw new BadRequestException('A message needs text or an attachment');
    }

    const conversationId = await this.chatRepository.findOrCreateConversation(
      caller.sub,
      contactId,
    );
    const attachments = await this.uploadAttachments(conversationId, files);
    const row = await this.chatRepository.createMessage(
      conversationId,
      caller.sub,
      body,
      attachments,
    );
    const message = this.mapMessage(row);

    // Both sides get the same message; only the "who it is with" differs.
    this.chatGateway.emitMessage(contactId, caller.sub, message);
    this.chatGateway.emitMessage(caller.sub, contactId, message);

    return message;
  }

  async markRead(
    caller: JwtPayload,
    contactId: string,
  ): Promise<ChatReadReceiptDto> {
    await this.assertContact(caller, contactId);

    const conversationId = await this.chatRepository.findConversationBetween(
      caller.sub,
      contactId,
    );
    if (!conversationId) {
      throw new NotFoundException('No conversation with that contact yet');
    }

    await this.chatRepository.markRead(conversationId, caller.sub);
    const receipt: ChatReadReceiptDto = {
      conversation_id: conversationId,
      contact_id: contactId,
      unread: 0,
    };
    this.chatGateway.emitRead(caller.sub, receipt);

    return receipt;
  }

  /** Attachments are streamed through the API so the bucket stays private. */
  async getAttachment(
    caller: JwtPayload,
    attachmentId: string,
  ): Promise<{ buffer: Buffer; contentType: string; name: string }> {
    const attachment = await this.chatRepository.findAttachment(attachmentId);
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const allowed = await this.chatRepository.isParticipant(
      attachment.message.conversation_id,
      caller.sub,
    );
    if (!allowed) {
      throw new ForbiddenException('You cannot open this attachment');
    }

    const object = await this.s3Service.getObject(attachment.url);
    return {
      buffer: object.buffer,
      contentType: attachment.mime_type || object.contentType,
      name: attachment.name,
    };
  }

  private async uploadAttachments(
    conversationId: string,
    files?: Express.Multer.File[],
  ): Promise<NewAttachment[]> {
    if (!files?.length) return [];

    if (files.length > CHAT_ATTACHMENT_MAX_COUNT) {
      throw new BadRequestException(
        `You can attach up to ${CHAT_ATTACHMENT_MAX_COUNT} files per message`,
      );
    }

    const uploaded: NewAttachment[] = [];
    for (const file of files) {
      if (!file.buffer?.length) {
        throw new BadRequestException(`${file.originalname} is empty`);
      }
      if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
        throw new BadRequestException(
          `${file.originalname} is larger than 10 MB`,
        );
      }
      if (
        !(CHAT_ALLOWED_ATTACHMENT_MIMES as readonly string[]).includes(
          file.mimetype,
        )
      ) {
        throw new BadRequestException(
          `${file.originalname} is not an allowed file type`,
        );
      }

      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `chat/${conversationId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${safeName}`;

      uploaded.push({
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        url: await this.s3Service.uploadToS3(key, file.buffer, file.mimetype),
      });
    }

    return uploaded;
  }

  /** Blocks messaging anyone who is not portal staff, including volunteers. */
  private async assertContact(
    caller: JwtPayload,
    contactId: string,
  ): Promise<void> {
    if (contactId === caller.sub) {
      throw new BadRequestException('You cannot message yourself');
    }

    const contact = await this.chatRepository.findContact(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    if (!(PORTAL_ROLE_TYPES as readonly string[]).includes(contact.role.type)) {
      throw new ForbiddenException(
        'That user cannot be messaged from the portal',
      );
    }
  }

  private mapMessage(row: ChatMessageRow): ChatMessageDto {
    return {
      message_id: row.message_id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      sender_role_type: row.sender.role.type,
      body: row.body,
      created_at: row.createdAt.toISOString(),
      attachments: row.attachments.map((attachment) => ({
        attachment_id: attachment.attachment_id,
        name: attachment.name,
        size: attachment.size,
        mime_type: attachment.mime_type,
      })),
    };
  }
}
