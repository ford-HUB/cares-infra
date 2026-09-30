import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LoginSource,
  NotificationCategory,
  NotificationTone,
  SupportTicketAuthorType,
  SupportTicketStatus,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
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
    private readonly notificationScheduler: NotificationScheduler,
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
    const before = await this.requireTicket(id);

    const row = await this.supportTicketsRepository.updateTicket(id, {
      status: update.status,
      assigneeId: update.assignee_id,
      note: update.note
        ? await this.staffNote(staffUserId, update.note)
        : undefined,
    });

    if (row.status !== before.status) {
      await this.notifyRequester(row, {
        title: `Ticket #${row.reference_number} is now ${STATUS_LABELS[row.status]}`,
        description: update.note
          ? `${STATUS_NOTICES[row.status]} Note from support: ${excerpt(update.note)}`
          : STATUS_NOTICES[row.status],
        tone: STATUS_NEEDS_REQUESTER.has(row.status)
          ? NotificationTone.ATTENTION
          : NotificationTone.INFO,
        dedupeKey: `ticket-status:${row.support_ticket_id}:${row.status}:${row.replies.length}`,
      });
    } else if (update.note) {
      await this.notifyReply(row, update.note);
    }

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

    await this.notifyReply(row, reply.body);

    return toSupportTicket(row);
  }

  private async notifyReply(row: SupportTicketRow, body: string) {
    await this.notifyRequester(row, {
      title: `Support replied on ticket #${row.reference_number}`,
      description: excerpt(body),
      tone: NotificationTone.INFO,
      dedupeKey: `ticket-reply:${row.support_ticket_id}:${row.replies.length}`,
    });
  }

  /**
   * A ticket is about the account, not one side of it, so the notice carries no
   * audience role. Only app-filed tickets get an app link; a portal requester
   * reads the thread on the portal.
   */
  private async notifyRequester(
    row: SupportTicketRow,
    notice: {
      title: string;
      description: string;
      tone: NotificationTone;
      dedupeKey: string;
    },
  ) {
    await this.notificationScheduler.publish({
      ...notice,
      category: NotificationCategory.SUPPORT,
      href:
        row.source === LoginSource.MOBILE
          ? `/support/${row.support_ticket_id}`
          : undefined,
      userIds: [row.requester_id],
    });
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

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'in progress',
  UNDER_VERIFICATION: 'awaiting your confirmation',
  CLIENT_FEEDBACK: 'waiting on you',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const STATUS_NOTICES: Record<SupportTicketStatus, string> = {
  OPEN: 'Your ticket is back in the support queue.',
  IN_PROGRESS: 'A member of the support team is working on it.',
  UNDER_VERIFICATION:
    'A fix is in. Open the ticket to confirm it works for you, or reopen it.',
  CLIENT_FEEDBACK:
    'Support needs more detail from you — reply on the ticket to keep it moving.',
  RESOLVED: 'Support marked your issue as resolved.',
  CLOSED: 'This ticket is closed. File a new one if the issue comes back.',
};

/** Statuses that are blocked on the requester doing something. */
const STATUS_NEEDS_REQUESTER = new Set<SupportTicketStatus>([
  SupportTicketStatus.UNDER_VERIFICATION,
  SupportTicketStatus.CLIENT_FEEDBACK,
]);

function excerpt(text: string): string {
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
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
