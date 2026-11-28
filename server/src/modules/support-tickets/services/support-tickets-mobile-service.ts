import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LoginSource,
  NotificationCategory,
  NotificationTone,
  RoleType,
  SupportTicketAuthorType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import type {
  ConfirmSupportTicketFixDto,
  CreateSupportTicketDto,
  MobileSupportTicketDto,
  MobileSupportTicketListDto,
  RequesterReplyDto,
} from '../dto/support-tickets-mobile-dto';
import {
  SupportTicketsRepository,
  type SupportTicketRow,
} from '../repositories/support-tickets-repository';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';

export interface RequesterAudit {
  actor: JwtPayload;
  context: RequestContextDto;
}

/** Decided once at filing: Issue = high, Feature = low. */
const PRIORITY_BY_TYPE: Record<SupportTicketType, SupportTicketPriority> = {
  BUG: SupportTicketPriority.HIGH,
  LOGIN: SupportTicketPriority.HIGH,
  VERIFICATION: SupportTicketPriority.HIGH,
  MOBILE_APP: SupportTicketPriority.HIGH,
  REPORT: SupportTicketPriority.HIGH,
  ACCOUNT: SupportTicketPriority.MEDIUM,
  EVENT: SupportTicketPriority.MEDIUM,
  OTHER: SupportTicketPriority.MEDIUM,
  FEATURE_REQUEST: SupportTicketPriority.LOW,
};

@Injectable()
export class SupportTicketsMobileService {
  constructor(
    private readonly supportTicketsRepository: SupportTicketsRepository,
    private readonly auditLogRecorder: AuditLogRecorder,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  async listMyTickets(userId: string): Promise<MobileSupportTicketListDto> {
    const rows =
      await this.supportTicketsRepository.listTicketsForRequester(userId);
    return { items: rows.map(toMobileSupportTicket) };
  }

  async getMyTicket(
    id: string,
    userId: string,
  ): Promise<MobileSupportTicketDto> {
    return toMobileSupportTicket(await this.requireMyTicket(id, userId));
  }

  async createTicket(
    userId: string,
    data: CreateSupportTicketDto,
    audit?: RequesterAudit,
  ): Promise<MobileSupportTicketDto> {
    const row = await this.supportTicketsRepository.createTicket({
      subject: data.subject,
      description: data.description,
      type: data.type,
      priority: PRIORITY_BY_TYPE[data.type],
      requesterId: userId,
      source: LoginSource.MOBILE,
    });

    await this.recordActivity(audit, row, {
      action: 'support.ticket.created',
      description: `Sent a support request: ${data.subject}`,
      metadata: { type: data.type },
    });

    // Notifies admins to triage.
    const excerpt =
      data.description.length > 140
        ? `${data.description.slice(0, 140)}…`
        : data.description;
    await this.notificationScheduler.publish({
      title: `Ticket #${row.reference_number}: ${data.subject}`,
      description: `${data.type.replace('_', ' ').toLowerCase()} · ${row.priority.toLowerCase()} priority. ${excerpt}`,
      category: NotificationCategory.SUPPORT,
      tone:
        row.priority === SupportTicketPriority.HIGH
          ? NotificationTone.ATTENTION
          : NotificationTone.INFO,
      href: '/admin/support-tickets',
      roles: [RoleType.ADMIN],
      dedupeKey: `ticket-created:${row.support_ticket_id}`,
    });

    // The requester's receipt with the number.
    await this.notificationScheduler.publish({
      title: `We received ticket #${row.reference_number}`,
      description: `"${data.subject}" is with the CARES support team. You'll be notified when they reply or the status changes.`,
      category: NotificationCategory.SUPPORT,
      tone: NotificationTone.INFO,
      href: `/support/${row.support_ticket_id}`,
      userIds: [userId],
      dedupeKey: `ticket-received:${row.support_ticket_id}`,
    });

    return toMobileSupportTicket(row);
  }

  /** Tickets awaiting the requester go back to the team; other statuses unchanged. */
  async reply(
    id: string,
    userId: string,
    reply: RequesterReplyDto,
    audit?: RequesterAudit,
  ): Promise<MobileSupportTicketDto> {
    const ticket = await this.requireMyTicket(id, userId);
    this.rejectIfFinished(ticket);

    const row = await this.supportTicketsRepository.updateTicket(id, {
      status:
        ticket.status === SupportTicketStatus.CLIENT_FEEDBACK
          ? SupportTicketStatus.IN_PROGRESS
          : undefined,
      note: this.requesterNote(ticket, reply.body),
    });

    await this.recordActivity(audit, row, {
      action: 'support.ticket.replied',
      description: `Replied to support request: ${ticket.subject}`,
    });

    return toMobileSupportTicket(row);
  }

  /** "Fixed" closes; "still broken" returns it to staff. */
  async confirmFix(
    id: string,
    userId: string,
    data: ConfirmSupportTicketFixDto,
    audit?: RequesterAudit,
  ): Promise<MobileSupportTicketDto> {
    const ticket = await this.requireMyTicket(id, userId);

    if (ticket.status !== SupportTicketStatus.UNDER_VERIFICATION) {
      throw new ConflictException(
        'This request is not waiting for your confirmation',
      );
    }

    const row = await this.supportTicketsRepository.updateTicket(id, {
      status: data.fixed
        ? SupportTicketStatus.RESOLVED
        : SupportTicketStatus.IN_PROGRESS,
      note: this.requesterNote(
        ticket,
        data.fixed ? 'Confirmed — the fix works on my side.' : data.body!,
      ),
    });

    await this.recordActivity(audit, row, {
      action: data.fixed
        ? 'support.ticket.fix-confirmed'
        : 'support.ticket.fix-rejected',
      description: data.fixed
        ? `Confirmed the fix for support request: ${ticket.subject}`
        : `Reported the fix did not work for support request: ${ticket.subject}`,
    });

    return toMobileSupportTicket(row);
  }

  /** Back to the top of the queue with the reason. */
  async reopen(
    id: string,
    userId: string,
    reply: RequesterReplyDto,
    audit?: RequesterAudit,
  ): Promise<MobileSupportTicketDto> {
    const ticket = await this.requireMyTicket(id, userId);

    if (
      ticket.status !== SupportTicketStatus.RESOLVED &&
      ticket.status !== SupportTicketStatus.CLOSED
    ) {
      throw new ConflictException('This request is still open');
    }

    const row = await this.supportTicketsRepository.updateTicket(id, {
      status: SupportTicketStatus.OPEN,
      note: this.requesterNote(ticket, reply.body),
    });

    await this.recordActivity(audit, row, {
      action: 'support.ticket.reopened',
      description: `Reopened support request: ${ticket.subject}`,
    });

    return toMobileSupportTicket(row);
  }

  /** Skipped without request context. */
  private async recordActivity(
    audit: RequesterAudit | undefined,
    ticket: SupportTicketRow,
    entry: {
      action: string;
      description: string;
      metadata?: Record<string, string>;
    },
  ): Promise<void> {
    if (!audit) return;

    await this.auditLogRecorder.record({
      action: entry.action,
      description: entry.description,
      category: 'COMMUNICATION',
      actor: audit.actor,
      targetType: 'support-ticket',
      targetLabel: ticket.subject,
      targetId: ticket.support_ticket_id,
      ipAddress: audit.context.ipAddress,
      userAgent: audit.context.userAgent,
      source: 'MOBILE',
      metadata: { status: ticket.status, ...entry.metadata },
    });
  }

  private async requireMyTicket(
    id: string,
    userId: string,
  ): Promise<SupportTicketRow> {
    const ticket = await this.supportTicketsRepository.findTicketForRequester(
      id,
      userId,
    );
    if (!ticket) {
      throw new NotFoundException('Support request not found');
    }
    return ticket;
  }

  private rejectIfFinished(ticket: SupportTicketRow): void {
    if (
      ticket.status === SupportTicketStatus.RESOLVED ||
      ticket.status === SupportTicketStatus.CLOSED
    ) {
      throw new ConflictException(
        'This request is finished — reopen it to continue the conversation',
      );
    }
  }

  /** Name already on the row. */
  private requesterNote(ticket: SupportTicketRow, body: string) {
    return {
      authorId: ticket.requester_id,
      authorName: `${ticket.requester.firstname} ${ticket.requester.lastname}`,
      authorType: SupportTicketAuthorType.REQUESTER,
      body,
    };
  }
}

export function toMobileSupportTicket(
  row: SupportTicketRow,
): MobileSupportTicketDto {
  return {
    support_ticket_id: row.support_ticket_id,
    reference_number: row.reference_number,
    subject: row.subject,
    description: row.description,
    type: row.type,
    status: row.status,
    priority: row.priority,
    assignee_name: row.assignee
      ? `${row.assignee.firstname} ${row.assignee.lastname}`
      : null,
    replies: row.replies.map((reply) => ({
      support_ticket_reply_id: reply.support_ticket_reply_id,
      author_name: reply.author_name,
      author_type: reply.author_type,
      body: reply.body,
      created_at: reply.createdAt.toISOString(),
    })),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
