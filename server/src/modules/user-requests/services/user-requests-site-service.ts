import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { NodemailerService } from '../../../infastructures/nodemailer/nodemailer-service';
import { TemplateUtils } from '../../../shared/utils/templete-utils';
import {
  EventRoleApproval,
  EventStatus,
  NotificationCategory,
  NotificationTone,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import type { PublishNotificationInput } from '../../notifications/dto/notifications-site-dto';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import type {
  ListUserRequestsQueryDto,
  RejectUserRequestDto,
  UserRequestAttachmentKind,
  UserRequestDto,
  UserRequestListDto,
} from '../dto/user-requests-site-dto';
import {
  UserRequestsRepository,
  type UserRequestRow,
} from '../repositories/user-requests-repository';
import { participationRoleLabel } from '../../events/repositories/events-repository';
import { toSiteDto } from './user-requests-mapper';

@Injectable()
export class UserRequestsSiteService {
  private readonly logger = new Logger(UserRequestsSiteService.name);

  constructor(
    private readonly userRequestsRepository: UserRequestsRepository,
    private readonly s3Service: S3Service,
    private readonly notificationScheduler: NotificationScheduler,
    private readonly nodemailerService: NodemailerService,
  ) {}

  async list(query: ListUserRequestsQueryDto): Promise<UserRequestListDto> {
    const { rows, total } = await this.userRequestsRepository.list(query);
    return { items: rows.map(toSiteDto), total };
  }

  /**
   * Accepting an event-join request is what confirms the beneficiary's place.
   * It does not take a volunteer slot or create an attendance row — the
   * attendance list is the volunteers'; beneficiaries receive from the event
   * rather than serve at it, so the accepted request is their record. The
   * event's beneficiary cap, when set, is enforced against accepted requests.
   * Accepting a role-access request enrols the verified ID + face on the
   * account, so the Volunteer side's profile completion counts the ID check
   * as done. Accepting a beneficiary registration is what lets the account
   * sign in — the mobile login gate reads this row's status.
   */
  async accept(id: string, callerId: string): Promise<UserRequestDto> {
    const row = await this.requirePending(id);

    if (row.kind === 'EVENT_ROLE') {
      await this.requireEventRoleAttendance(row);
      const updated = await this.userRequestsRepository.decideEventRole(
        id,
        {
          status: 'ACCEPTED',
          decidedByUserId: callerId,
          trail: {
            label: `Request accepted — approved as ${this.eventRoleLabel(row)}`,
            actorName: await this.callerName(callerId),
          },
        },
        EventRoleApproval.APPROVED,
      );
      await this.notifyRequester(updated, 'ACCEPTED');
      return toSiteDto(updated);
    }

    if (row.kind === 'EVENT_JOIN') {
      if (row.event_id === null) {
        throw new BadRequestException('This request has no event attached');
      }
      await this.assertBeneficiaryPlace(row.event_id);
    }

    const actorName = await this.callerName(callerId);
    const updated =
      row.kind === 'ROLE_ACCESS'
        ? await this.userRequestsRepository.acceptRoleAccess(id, {
            decidedByUserId: callerId,
            trail: {
              label: 'Request accepted — Volunteer role approved',
              actorName,
            },
          })
        : await this.userRequestsRepository.decide(id, {
            status: 'ACCEPTED',
            decidedByUserId: callerId,
            trail: {
              label:
                row.kind === 'BENEFICIARY_REGISTRATION'
                  ? 'Registration approved — the account can now sign in'
                  : 'Request accepted — beneficiary approved for the event',
              actorName,
            },
          });
    await this.notifyRequester(updated, 'ACCEPTED');
    return toSiteDto(updated);
  }

  /**
   * Turns down a beneficiary's event application with a reason they see in
   * the app. Unlike a removal this is final for the row — nothing restores
   * it — but the beneficiary may file a fresh application for the same event,
   * since only a PENDING row counts as a duplicate. Rejecting a beneficiary
   * registration keeps the account shut; the reason is emailed to them, since
   * an account that cannot sign in never sees an in-app notice.
   */
  async reject(
    id: string,
    callerId: string,
    body: RejectUserRequestDto,
  ): Promise<UserRequestDto> {
    const row = await this.requirePending(id);
    if (row.kind === 'ROLE_ACCESS') {
      throw new BadRequestException(
        'Only event applications, event roles and beneficiary registrations can be rejected with a reason',
      );
    }
    const actorName = await this.callerName(callerId);
    if (row.kind === 'EVENT_ROLE') {
      const updated = await this.userRequestsRepository.decideEventRole(
        id,
        {
          status: 'REJECTED',
          decidedByUserId: callerId,
          rejectionReason: body.reason,
          trail: {
            label: `Request rejected — stays on as Regular: ${body.reason}`,
            actorName,
          },
        },
        EventRoleApproval.REJECTED,
      );
      await this.notifyRequester(updated, 'REJECTED');
      return toSiteDto(updated);
    }
    const updated = await this.userRequestsRepository.decide(id, {
      status: 'REJECTED',
      decidedByUserId: callerId,
      rejectionReason: body.reason,
      trail: {
        label:
          row.kind === 'BENEFICIARY_REGISTRATION'
            ? `Registration rejected — ${body.reason}`
            : `Request rejected — ${body.reason}`,
        actorName,
      },
    });
    await this.notifyRequester(updated, 'REJECTED');
    return toSiteDto(updated);
  }

  async remove(id: string, callerId: string): Promise<UserRequestDto> {
    const row = await this.requireRow(id);
    // A removed registration would leave the account shut with no decision on
    // record — it is approved or rejected, never binned.
    if (row.kind === 'BENEFICIARY_REGISTRATION') {
      throw new BadRequestException(
        'Approve or reject a beneficiary registration instead of removing it',
      );
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be removed');
    }
    const actorName = await this.callerName(callerId);
    const removal = {
      status: 'DELETED' as const,
      decidedByUserId: callerId,
      trail: { label: 'Request removed from the review queue', actorName },
    };
    // A removed role request is not approved, so the volunteer takes part as
    // Regular until a restore puts it back in front of a reviewer.
    const updated =
      row.kind === 'EVENT_ROLE'
        ? await this.userRequestsRepository.decideEventRole(
            id,
            removal,
            EventRoleApproval.REJECTED,
          )
        : await this.userRequestsRepository.decide(id, removal);
    await this.notifyRequester(updated, 'DELETED');
    return toSiteDto(updated);
  }

  async restore(id: string, callerId: string): Promise<UserRequestDto> {
    const row = await this.requireRow(id);
    if (row.status !== 'DELETED') {
      throw new BadRequestException('Only removed requests can be restored');
    }
    if (row.kind === 'EVENT_ROLE') await this.requireEventRoleAttendance(row);
    const actorName = await this.callerName(callerId);
    const restoral = {
      status: 'PENDING' as const,
      decidedByUserId: null,
      trail: { label: 'Request restored to the review queue', actorName },
    };
    const updated =
      row.kind === 'EVENT_ROLE'
        ? await this.userRequestsRepository.decideEventRole(
            id,
            restoral,
            EventRoleApproval.PENDING,
          )
        : await this.userRequestsRepository.decide(id, restoral);
    await this.notifyRequester(updated, 'PENDING');
    return toSiteDto(updated);
  }

  async getAttachment(
    id: string,
    kind: UserRequestAttachmentKind,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const row = await this.requireRow(id);
    const stored = {
      'id-front': row.id_front_url,
      'id-back': row.id_back_url,
      selfie: row.selfie_url,
      'residency-proof': row.residency_proof_url,
      'supporting-document': row.document_url,
    }[kind];
    if (!stored) throw new NotFoundException('Attachment not found');
    const object = await this.s3Service.getObject(stored);
    const declaredMimes: Partial<
      Record<UserRequestAttachmentKind, string | null>
    > = {
      'residency-proof': row.residency_proof_mime,
      'supporting-document': row.document_mime,
    };
    const declaredMime = declaredMimes[kind];
    return declaredMime ? { ...object, contentType: declaredMime } : object;
  }

  /** The event must still be open and, if capped, have a beneficiary place left. */
  private async assertBeneficiaryPlace(eventId: number): Promise<void> {
    const capacity =
      await this.userRequestsRepository.findBeneficiaryCapacity(eventId);
    if (!capacity) throw new NotFoundException('Event not found');
    if (!capacity.beneficiary_applicable) {
      throw new BadRequestException('This event is not open to beneficiaries');
    }
    const open =
      (capacity.status === EventStatus.Upcoming ||
        capacity.status === EventStatus.Ongoing) &&
      capacity.event_ended.getTime() >= Date.now();
    if (!open) {
      throw new BadRequestException('This event is no longer open');
    }
    if (
      capacity.max_beneficiaries !== null &&
      capacity.accepted >= capacity.max_beneficiaries
    ) {
      throw new BadRequestException(
        `This event already has its ${capacity.max_beneficiaries} beneficiaries`,
      );
    }
  }

  /**
   * Every move on a request is news to the person who filed it — it is the
   * only way they learn a decision was made. An event application belongs to
   * the Beneficiary side; a role unlock is about the account itself, so it
   * shows on whichever side they have open.
   */
  private async notifyRequester(
    row: UserRequestRow,
    status: 'ACCEPTED' | 'REJECTED' | 'DELETED' | 'PENDING',
  ): Promise<void> {
    const reference = `REQ-${String(row.reference_number).padStart(3, '0')}`;
    const base = {
      category: NotificationCategory.USER_REQUEST,
      href: `/requests/${row.user_request_id}`,
      userIds: [row.user_id],
      // A restored request can be decided again; each move is its own notice.
      dedupeKey: `user-request:${row.user_request_id}:${status}:${row.trail.length}`,
    };

    if (row.kind === 'BENEFICIARY_REGISTRATION') {
      await this.notifyRegistrant(row, status, reference);
      return;
    }

    let notice: PublishNotificationInput;
    if (row.kind === 'EVENT_ROLE') {
      const event = row.event?.title ?? 'the event';
      const role = this.eventRoleLabel(row);
      notice = {
        ...base,
        href: row.event_id !== null ? `/events/${row.event_id}` : base.href,
        audienceRole: RoleType.VOLUNTEER,
        ...{
          ACCEPTED: {
            title: `You're the ${role} for ${event}`,
            description: `${reference} was approved — you're confirmed as ${role} for this event.`,
            tone: NotificationTone.INFO,
          },
          REJECTED: {
            title: `Your ${role} role for ${event} was not approved`,
            description: `${reference}: ${row.rejection_reason ?? 'No reason was given.'} You're still registered as a regular volunteer.`,
            tone: NotificationTone.ATTENTION,
          },
          DELETED: {
            title: `Your ${role} role request for ${event} was closed`,
            description: `${reference} was removed from the review queue. You're still registered as a regular volunteer.`,
            tone: NotificationTone.ATTENTION,
          },
          PENDING: {
            title: `Your ${role} role request for ${event} is back under review`,
            description: `${reference} was returned to the review queue.`,
            tone: NotificationTone.INFO,
          },
        }[status],
      };
    } else if (row.kind === 'ROLE_ACCESS') {
      const role = roleLabel(row.requested_role ?? RoleType.VOLUNTEER);
      notice = {
        ...base,
        ...{
          ACCEPTED: {
            title: `Your ${role} side is unlocked`,
            description: `${reference} was approved. Switch to ${role} from your profile to start.`,
            tone: NotificationTone.INFO,
          },
          REJECTED: {
            title: `Your ${role} access request was declined`,
            description: `${reference} was not approved.`,
            tone: NotificationTone.ATTENTION,
          },
          DELETED: {
            title: `Your ${role} access request was closed`,
            description: `${reference} was removed from the review queue. You can verify and request again from your profile.`,
            tone: NotificationTone.ATTENTION,
          },
          PENDING: {
            title: `Your ${role} access request is back under review`,
            description: `${reference} was returned to the review queue.`,
            tone: NotificationTone.INFO,
          },
        }[status],
      };
    } else {
      const event = row.event?.title ?? 'the event';
      notice = {
        ...base,
        audienceRole: RoleType.BENEFICIARY,
        ...{
          ACCEPTED: {
            title: `You're confirmed for ${event}`,
            description: `${reference} was approved — your place is reserved. We'll remind you before it starts.`,
            tone: NotificationTone.INFO,
          },
          REJECTED: {
            title: `Your application for ${event} was not approved`,
            description: `${reference}: ${row.rejection_reason ?? 'No reason was given.'} You may apply again.`,
            tone: NotificationTone.ATTENTION,
          },
          DELETED: {
            title: `Your application for ${event} was closed`,
            description: `${reference} was removed from the review queue.`,
            tone: NotificationTone.ATTENTION,
          },
          PENDING: {
            title: `Your application for ${event} is back under review`,
            description: `${reference} was returned to the review queue.`,
            tone: NotificationTone.INFO,
          },
        }[status],
      };
    }
    await this.notificationScheduler.publish(notice);
  }

  /**
   * A registrant cannot sign in until approved, so the decision goes out by email —
   * the approval also leaves a welcome notice for their first sign-in. A failed
   * email never undoes the decision; the director's ruling is already on record.
   */
  private async notifyRegistrant(
    row: UserRequestRow,
    status: 'ACCEPTED' | 'REJECTED' | 'DELETED' | 'PENDING',
    reference: string,
  ): Promise<void> {
    if (status !== 'ACCEPTED' && status !== 'REJECTED') return;
    const approved = status === 'ACCEPTED';

    if (approved) {
      await this.notificationScheduler.publish({
        title: 'Your beneficiary account is approved',
        description: `${reference} was approved. Welcome to CARES — you can now apply for events and request assistance.`,
        category: NotificationCategory.USER_REQUEST,
        tone: NotificationTone.INFO,
        href: `/requests/${row.user_request_id}`,
        userIds: [row.user_id],
        audienceRole: RoleType.BENEFICIARY,
        dedupeKey: `user-request:${row.user_request_id}:${status}:${row.trail.length}`,
      });
    }

    const email = row.user.accounts[0]?.email;
    if (!email) return;
    const heading = approved
      ? 'Your CARES account is approved'
      : 'Your CARES registration was not approved';
    try {
      const html = await TemplateUtils.compileTemplate(
        'beneficiary-registration-decision.html',
        {
          heading,
          username: row.user.firstname || email,
          reference,
          approved,
          reason: row.rejection_reason ?? 'No reason was given.',
        },
      );
      await this.nodemailerService.sendEmail(email, heading, html);
    } catch (error) {
      this.logger.warn(
        `Could not email the ${reference} decision to ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** An event role can only be ruled on while the volunteer still holds the slot. */
  private async requireEventRoleAttendance(row: UserRequestRow): Promise<void> {
    const attendance =
      row.event_id === null
        ? null
        : await this.userRequestsRepository.findEventRoleAttendance(
            row.user_id,
            row.event_id,
          );
    if (!attendance) {
      throw new BadRequestException(
        'The volunteer is no longer registered for this event',
      );
    }
  }

  private eventRoleLabel(row: UserRequestRow): string {
    return row.participation_role
      ? participationRoleLabel(row.participation_role)
      : 'event role';
  }

  private async requireRow(id: string): Promise<UserRequestRow> {
    const row = await this.userRequestsRepository.findById(id);
    if (!row) throw new NotFoundException('Request not found');
    return row;
  }

  private async requirePending(id: string): Promise<UserRequestRow> {
    const row = await this.requireRow(id);
    if (row.status !== 'PENDING') {
      throw new BadRequestException('This request has already been decided');
    }
    return row;
  }

  private async callerName(callerId: string): Promise<string> {
    const name = await this.userRequestsRepository.findUserName(callerId);
    return name ? `${name.firstname} ${name.lastname}`.trim() : 'Portal staff';
  }
}

function roleLabel(role: RoleType): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
