import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../../../infastructures/s3/s3-service';
import {
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
import { toSiteDto } from './user-requests-mapper';

@Injectable()
export class UserRequestsSiteService {
  constructor(
    private readonly userRequestsRepository: UserRequestsRepository,
    private readonly s3Service: S3Service,
    private readonly notificationScheduler: NotificationScheduler,
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
   * as done.
   */
  async accept(id: string, callerId: string): Promise<UserRequestDto> {
    const row = await this.requirePending(id);

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
              label: 'Request accepted — beneficiary approved for the event',
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
   * since only a PENDING row counts as a duplicate.
   */
  async reject(
    id: string,
    callerId: string,
    body: RejectUserRequestDto,
  ): Promise<UserRequestDto> {
    const row = await this.requirePending(id);
    if (row.kind !== 'EVENT_JOIN') {
      throw new BadRequestException(
        'Only event applications can be rejected with a reason',
      );
    }
    const actorName = await this.callerName(callerId);
    const updated = await this.userRequestsRepository.decide(id, {
      status: 'REJECTED',
      decidedByUserId: callerId,
      rejectionReason: body.reason,
      trail: {
        label: `Request rejected — ${body.reason}`,
        actorName,
      },
    });
    await this.notifyRequester(updated, 'REJECTED');
    return toSiteDto(updated);
  }

  async remove(id: string, callerId: string): Promise<UserRequestDto> {
    const row = await this.requireRow(id);
    if (row.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be removed');
    }
    const actorName = await this.callerName(callerId);
    const updated = await this.userRequestsRepository.decide(id, {
      status: 'DELETED',
      decidedByUserId: callerId,
      trail: { label: 'Request removed from the review queue', actorName },
    });
    await this.notifyRequester(updated, 'DELETED');
    return toSiteDto(updated);
  }

  async restore(id: string, callerId: string): Promise<UserRequestDto> {
    const row = await this.requireRow(id);
    if (row.status !== 'DELETED') {
      throw new BadRequestException('Only removed requests can be restored');
    }
    const actorName = await this.callerName(callerId);
    const updated = await this.userRequestsRepository.decide(id, {
      status: 'PENDING',
      decidedByUserId: null,
      trail: { label: 'Request restored to the review queue', actorName },
    });
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
    }[kind];
    if (!stored) throw new NotFoundException('Attachment not found');
    const object = await this.s3Service.getObject(stored);
    return kind === 'residency-proof' && row.residency_proof_mime
      ? { ...object, contentType: row.residency_proof_mime }
      : object;
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

    let notice: PublishNotificationInput;
    if (row.kind === 'ROLE_ACCESS') {
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
