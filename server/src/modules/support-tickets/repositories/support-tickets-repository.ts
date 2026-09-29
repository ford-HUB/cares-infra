import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type LoginSource,
  type SupportTicketAuthorType,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportTicketType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface ListSupportTicketsInput {
  status: SupportTicketStatus | 'all';
  type: SupportTicketType | 'all';
  priority: SupportTicketPriority | 'all';
  limit: number;
}

export interface CreateSupportTicketInput {
  subject: string;
  description: string;
  type: SupportTicketType;
  priority: SupportTicketPriority;
  requesterId: string;
  source: LoginSource;
}

export interface UpdateSupportTicketInput {
  status?: SupportTicketStatus;
  /** `null` unassigns; `undefined` leaves the assignee as it is. */
  assigneeId?: string | null;
  note?: {
    authorId: string;
    authorName: string;
    authorType: SupportTicketAuthorType;
    body: string;
  };
}

const ticketInclude = {
  requester: {
    select: {
      firstname: true,
      lastname: true,
      accounts: { select: { email: true }, take: 1 },
      role: { select: { type: true } },
    },
  },
  assignee: { select: { firstname: true, lastname: true } },
  replies: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.SupportTicketInclude;

export type SupportTicketRow = Prisma.SupportTicketGetPayload<{
  include: typeof ticketInclude;
}>;

@Injectable()
export class SupportTicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(input: ListSupportTicketsInput) {
    const where: Prisma.SupportTicketWhereInput = {
      ...(input.status === 'all' ? {} : { status: input.status }),
      ...(input.type === 'all' ? {} : { type: input.type }),
      ...(input.priority === 'all' ? {} : { priority: input.priority }),
    };

    // Two independent reads, so they run concurrently rather than holding a
    // transaction slot open — a capped read needs no atomicity.
    const [rows, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: ticketInclude,
        orderBy: [{ updatedAt: 'desc' }],
        take: input.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { rows, total };
  }

  /**
   * The JWT carries no name, and a reply snapshots the author's — so the name is read
   * here rather than trusted from the request body.
   */
  async findUserName(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { firstname: true, lastname: true },
    });

    return user ? `${user.firstname} ${user.lastname}` : null;
  }

  async findTicket(id: string): Promise<SupportTicketRow | null> {
    return this.prisma.supportTicket.findUnique({
      where: { support_ticket_id: id },
      include: ticketInclude,
    });
  }

  /** Every ticket the requester filed, newest activity first — the app's own queue. */
  async listTicketsForRequester(
    requesterId: string,
  ): Promise<SupportTicketRow[]> {
    return this.prisma.supportTicket.findMany({
      where: { requester_id: requesterId },
      include: ticketInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  /**
   * Scoped by requester so a guessed id from another account reads as missing, not
   * as forbidden — the app never learns the ticket exists.
   */
  async findTicketForRequester(
    id: string,
    requesterId: string,
  ): Promise<SupportTicketRow | null> {
    return this.prisma.supportTicket.findFirst({
      where: { support_ticket_id: id, requester_id: requesterId },
      include: ticketInclude,
    });
  }

  async createTicket(
    data: CreateSupportTicketInput,
  ): Promise<SupportTicketRow> {
    return this.prisma.supportTicket.create({
      data: {
        subject: data.subject,
        description: data.description,
        type: data.type,
        priority: data.priority,
        requester_id: data.requesterId,
        source: data.source,
      },
      include: ticketInclude,
    });
  }

  /**
   * Status change and its note land in one write, so a thread can never show a note
   * explaining a move that did not happen.
   */
  async updateTicket(
    id: string,
    data: UpdateSupportTicketInput,
  ): Promise<SupportTicketRow> {
    return this.prisma.supportTicket.update({
      where: { support_ticket_id: id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.assigneeId === undefined
          ? {}
          : { assignee_id: data.assigneeId }),
        ...(data.note
          ? {
              replies: {
                create: {
                  author_id: data.note.authorId,
                  author_name: data.note.authorName,
                  author_type: data.note.authorType,
                  body: data.note.body,
                },
              },
            }
          : {}),
      },
      include: ticketInclude,
    });
  }
}
