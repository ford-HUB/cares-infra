import { Injectable } from '@nestjs/common';
import { Prisma, RoleType } from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

const contactSelect = {
  user_id: true,
  firstname: true,
  lastname: true,
  portal_department: true,
  role: { select: { type: true } },
  accounts: { select: { email: true }, take: 1 },
} satisfies Prisma.UserSelect;

export type ChatContactRow = Prisma.UserGetPayload<{
  select: typeof contactSelect;
}>;

const messageInclude = {
  attachments: {
    select: {
      attachment_id: true,
      name: true,
      size: true,
      mime_type: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  sender: { select: { role: { select: { type: true } } } },
} satisfies Prisma.ChatMessageInclude;

export type ChatMessageRow = Prisma.ChatMessageGetPayload<{
  include: typeof messageInclude;
}>;

export interface ChatThreadRow {
  contactId: string;
  conversationId: string;
  preview: string;
  lastMessageAt: Date;
  unread: number;
}

export interface NewAttachment {
  name: string;
  size: number;
  mimeType: string;
  url: string;
}

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Portal staff the caller may message — never themselves, never volunteers. */
  async listContacts(
    callerId: string,
    roles: readonly RoleType[],
  ): Promise<ChatContactRow[]> {
    return this.prisma.user.findMany({
      where: {
        user_id: { not: callerId },
        role: { type: { in: [...roles] } },
      },
      select: contactSelect,
      orderBy: [{ firstname: 'asc' }, { lastname: 'asc' }],
    });
  }

  async findContact(userId: string): Promise<ChatContactRow | null> {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: contactSelect,
    });
  }

  async findConversationBetween(
    userId: string,
    contactId: string,
  ): Promise<string | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { user_id: userId } } },
          { participants: { some: { user_id: contactId } } },
        ],
      },
      select: { conversation_id: true },
    });

    return conversation?.conversation_id ?? null;
  }

  /** The first message between two people is what creates their conversation. */
  async findOrCreateConversation(
    userId: string,
    contactId: string,
  ): Promise<string> {
    const existing = await this.findConversationBetween(userId, contactId);
    if (existing) return existing;

    const created = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ user_id: userId }, { user_id: contactId }],
        },
      },
      select: { conversation_id: true },
    });

    return created.conversation_id;
  }

  async listMessages(
    conversationId: string,
    take: number,
  ): Promise<ChatMessageRow[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversation_id: conversationId },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return rows.reverse();
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    body: string,
    attachments: NewAttachment[],
  ): Promise<ChatMessageRow> {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          conversation_id: conversationId,
          sender_id: senderId,
          body,
          attachments: {
            create: attachments.map((attachment) => ({
              name: attachment.name,
              size: attachment.size,
              mime_type: attachment.mimeType,
              url: attachment.url,
            })),
          },
        },
        include: messageInclude,
      });

      await tx.conversation.update({
        where: { conversation_id: conversationId },
        data: { last_message_at: message.createdAt },
      });

      // The sender has read what they just wrote.
      await tx.conversationParticipant.updateMany({
        where: { conversation_id: conversationId, user_id: senderId },
        data: { last_read_at: message.createdAt },
      });

      return message;
    });
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversation_id: conversationId, user_id: userId },
      data: { last_read_at: new Date() },
    });
  }

  async isParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversation_id: conversationId, user_id: userId },
      select: { conversation_participant_id: true },
    });

    return participant !== null;
  }

  /** Every conversation the caller is in that has at least one message. */
  async listThreads(userId: string): Promise<ChatThreadRow[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        user_id: userId,
        conversation: { last_message_at: { not: null } },
      },
      select: {
        last_read_at: true,
        conversation: {
          select: {
            conversation_id: true,
            last_message_at: true,
            participants: {
              where: { user_id: { not: userId } },
              select: { user_id: true },
              take: 1,
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                body: true,
                createdAt: true,
                _count: { select: { attachments: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { last_message_at: 'desc' } },
    });

    // Portal staff counts are small, so a count per thread stays cheap here.
    return Promise.all(
      participants
        .filter(
          (row) =>
            row.conversation.participants.length > 0 &&
            row.conversation.messages.length > 0,
        )
        .map(async (row) => {
          const conversation = row.conversation;
          const latest = conversation.messages[0];
          const unread = await this.prisma.chatMessage.count({
            where: {
              conversation_id: conversation.conversation_id,
              sender_id: { not: userId },
              ...(row.last_read_at
                ? { createdAt: { gt: row.last_read_at } }
                : {}),
            },
          });

          return {
            contactId: conversation.participants[0].user_id,
            conversationId: conversation.conversation_id,
            preview:
              latest.body || this.attachmentPreview(latest._count.attachments),
            lastMessageAt: latest.createdAt,
            unread,
          };
        }),
    );
  }

  async findAttachment(attachmentId: string) {
    return this.prisma.chatAttachment.findUnique({
      where: { attachment_id: attachmentId },
      select: {
        attachment_id: true,
        name: true,
        mime_type: true,
        url: true,
        message: { select: { conversation_id: true } },
      },
    });
  }

  private attachmentPreview(count: number): string {
    return count === 1 ? '📎 1 attachment' : `📎 ${count} attachments`;
  }
}
