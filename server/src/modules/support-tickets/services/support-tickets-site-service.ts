import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketAuthorType } from '../../../infastructures/prisma/common/client';
import type {
  ListSupportTicketsQueryDto,
  ReplyToSupportTicketDto,
  SupportTicketDto,
  SupportTicketListDto,
  UpdateSupportTicketDto,
} from '../dto/support-tickets-site-dto';
import {
  SupportTicketsRepository,
  type SupportTicketRow,
} from '../repositories/support-tickets-repository';

@Injectable()
export class SupportTicketsSiteService {
  constructor(
    private readonly supportTicketsRepository: SupportTicketsRepository,
  ) {}

  async listTickets(
    query: ListSupportTicketsQueryDto,
  ): Promise<SupportTicketListDto> {
    const { rows, total } = await this.supportTicketsRepository.listTickets({
      status: query.status,
      type: query.type,
      priority: query.priority,
      limit: query.limit,
    });

    return { items: rows.map(toSupportTicket), total };
  }

  /**
   * Status, assignee, and the explanatory note are applied as one write — see the
   * repository. The ticket is read first so a bad id is a 404 rather than the
   * P2025 a blind update would raise.
   */
  async updateTicket(
    id: string,
    staffUserId: string,
    update: UpdateSupportTicketDto,
  ): Promise<SupportTicketDto> {
    await this.requireTicket(id);

    const row = await this.supportTicketsRepository.updateTicket(id, {
      status: update.status,
      assigneeId: update.assignee_id,
      note: update.note
        ? await this.staffNote(staffUserId, update.note)
        : undefined,
    });

    return toSupportTicket(row);
  }

  async replyToTicket(
    id: string,
    staffUserId: string,
    reply: ReplyToSupportTicketDto,
  ): Promise<SupportTicketDto> {
    const ticket = await this.requireTicket(id);

    const row = await this.supportTicketsRepository.updateTicket(id, {
      // A reply on an untouched ticket means someone has picked it up.
      status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : undefined,
      note: await this.staffNote(staffUserId, reply.body),
    });

    return toSupportTicket(row);
  }

  private async requireTicket(id: string): Promise<SupportTicketRow> {
    const ticket = await this.supportTicketsRepository.findTicket(id);
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return ticket;
  }

  private async staffNote(staffUserId: string, body: string) {
    const authorName =
      await this.supportTicketsRepository.findUserName(staffUserId);

    if (!authorName) {
      throw new NotFoundException('Signed-in account not found');
    }

    return {
      authorId: staffUserId,
      authorName,
      authorType: SupportTicketAuthorType.STAFF,
      body,
    };
  }
}

export function toSupportTicket(row: SupportTicketRow): SupportTicketDto {
  return {
    support_ticket_id: row.support_ticket_id,
    reference_number: row.reference_number,
    subject: row.subject,
    description: row.description,
    type: row.type,
    status: row.status,
    priority: row.priority,
    requester_id: row.requester_id,
    requester_firstname: row.requester.firstname,
    requester_lastname: row.requester.lastname,
    requester_email: row.requester.accounts[0]?.email ?? '',
    requester_role_type: row.requester.role.type,
    assignee_id: row.assignee_id,
    assignee_name: row.assignee
      ? `${row.assignee.firstname} ${row.assignee.lastname}`
      : null,
    source: row.source,
    replies: row.replies.map((reply) => ({
      support_ticket_reply_id: reply.support_ticket_reply_id,
      author_id: reply.author_id,
      author_name: reply.author_name,
      author_type: reply.author_type,
      body: reply.body,
      created_at: reply.createdAt.toISOString(),
    })),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
