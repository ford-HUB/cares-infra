import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { AuthMobileService } from '../../auth/services/auth-mobile-service';
import type {
  CreateEventJoinRequestDto,
  CreateRoleAccessRequestDto,
  MobileUserRequestDto,
  MobileUserRequestListDto,
} from '../dto/user-requests-mobile-dto';
import { UserRequestsRepository } from '../repositories/user-requests-repository';
import {
  EVENT_JOIN_PROOF_ALLOWED_MIMES,
  EVENT_JOIN_PROOF_MAX_BYTES,
} from '../validators/user-requests-mobile-validator';
import { toMobileDto } from './user-requests-mapper';

@Injectable()
export class UserRequestsMobileService {
  constructor(
    private readonly userRequestsRepository: UserRequestsRepository,
    private readonly authMobileService: AuthMobileService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async listMine(userId: string): Promise<MobileUserRequestListDto> {
    const rows = await this.userRequestsRepository.listForUser(userId);
    return { items: rows.map(toMobileDto) };
  }

  /**
   * Files the volunteer-side unlock for a donor / beneficiary account. The ID
   * check and face match have already run inside the registration session
   * (`/auth/upload-id`, `/auth/verify-face`); this copies their proof onto a
   * durable row so a director can rule on it after the session expires.
   */
  async createRoleAccess(
    userId: string,
    callerRole: RoleType,
    body: CreateRoleAccessRequestDto,
  ): Promise<MobileUserRequestDto> {
    if (callerRole === body.roleType) {
      throw new BadRequestException('Your account already holds this role');
    }

    const session = await this.authMobileService.getRegistrationSession(
      body.registrationId,
    );
    if (!session) {
      throw new NotFoundException(
        'Verification session not found or expired. Please upload your ID again.',
      );
    }
    if (!session.idFrontImageUrl || !session.idBackImageUrl) {
      throw new BadRequestException('Upload both sides of your ID first');
    }
    if (session.faceMatch !== true) {
      throw new BadRequestException(
        'Complete the face verification before requesting access',
      );
    }

    const duplicate = await this.userRequestsRepository.findPendingDuplicate({
      userId,
      kind: 'ROLE_ACCESS',
      requestedRole: body.roleType,
    });
    if (duplicate) {
      throw new ConflictException(
        'Your request is already under review. Please wait for administrator approval.',
      );
    }

    const name = await this.userRequestsRepository.findUserName(userId);
    const row = await this.userRequestsRepository.create({
      kind: 'ROLE_ACCESS',
      userId,
      requestedRole: body.roleType,
      summary: `Requested access to the ${labelFor(body.roleType)} role after completing ID and face verification.`,
      actorName: name
        ? `${name.firstname} ${name.lastname}`.trim()
        : 'Requester',
      idFrontUrl: session.idFrontImageUrl,
      idBackUrl: session.idBackImageUrl,
      selfieUrl: session.selfieUrl,
      selfieEmbedding: session.selfieEmbedding,
      faceSimilarity: session.faceSimilarity,
    });
    return toMobileDto(row);
  }

  /**
   * A beneficiary applying for a place on an event. Unlike a volunteer join
   * this does not take a slot straight away — the row waits for a director,
   * who reviews the attached proof of residency, and the attendance record is
   * only created when they accept.
   */
  async createEventJoin(
    userId: string,
    callerRole: RoleType,
    body: CreateEventJoinRequestDto,
    proof: Express.Multer.File,
  ): Promise<MobileUserRequestDto> {
    if (callerRole !== RoleType.BENEFICIARY) {
      throw new BadRequestException(
        'Only beneficiary accounts request to join an event this way',
      );
    }

    const event = await this.prisma.event.findUnique({
      where: { event_id: body.eventId },
      select: {
        title: true,
        status: true,
        event_ended: true,
        beneficiary_applicable: true,
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (!event.beneficiary_applicable) {
      throw new BadRequestException('This event is not open to beneficiaries');
    }
    const open =
      (event.status === EventStatus.Upcoming ||
        event.status === EventStatus.Ongoing) &&
      event.event_ended.getTime() >= Date.now();
    if (!open) {
      throw new BadRequestException(
        'This event is no longer accepting registrations',
      );
    }

    const duplicate = await this.userRequestsRepository.findPendingDuplicate({
      userId,
      kind: 'EVENT_JOIN',
      eventId: body.eventId,
    });
    if (duplicate) {
      throw new ConflictException(
        'You have already asked to join this event. Please wait for approval.',
      );
    }

    const mime = this.resolveProofMime(proof);
    if (proof.size > EVENT_JOIN_PROOF_MAX_BYTES) {
      const limitMb = EVENT_JOIN_PROOF_MAX_BYTES / (1024 * 1024);
      throw new BadRequestException(
        `Proof of residency must be ${limitMb} MB or smaller`,
      );
    }
    if (!(EVENT_JOIN_PROOF_ALLOWED_MIMES as readonly string[]).includes(mime)) {
      throw new BadRequestException('Proof of residency must be a PDF file');
    }

    const safeName = proof.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `user-requests/${userId}/residency-${Date.now()}-${safeName}`;
    const url = await this.s3Service.uploadToS3(key, proof.buffer, mime);

    const name = await this.userRequestsRepository.findUserName(userId);
    const row = await this.userRequestsRepository.create({
      kind: 'EVENT_JOIN',
      userId,
      eventId: body.eventId,
      summary: `Applied for "${event.title}" as a beneficiary.`,
      actorName: name
        ? `${name.firstname} ${name.lastname}`.trim()
        : 'Requester',
      residencyProof: { url, name: proof.originalname, mime },
    });
    return toMobileDto(row);
  }

  /** Trusts the bytes over the declared type: a real PDF starts with `%PDF-`. */
  private resolveProofMime(file: Express.Multer.File): string {
    const isPdf =
      file.buffer.subarray(0, 5).toString('latin1') === '%PDF-' &&
      (file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf'));
    return isPdf ? 'application/pdf' : file.mimetype;
  }
}

function labelFor(role: RoleType): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
