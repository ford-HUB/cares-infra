import { Injectable } from '@nestjs/common';
import {
  EmbeddingType,
  Prisma,
  VerificationStatus,
  type RoleType,
  type UserRequestKind,
  type UserRequestStatus,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface ListUserRequestsInput {
  status: UserRequestStatus | 'all';
  kind: UserRequestKind | 'all';
  limit: number;
}

export interface CreateUserRequestInput {
  kind: UserRequestKind;
  userId: string;
  summary: string;
  /** Written as the first trail line, attributed to the requester. */
  actorName: string;
  requestedRole?: RoleType;
  eventId?: number;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  selfieUrl?: string | null;
  selfieEmbedding?: number[] | null;
  faceSimilarity?: number | null;
  residencyProof?: { url: string; name: string; mime: string } | null;
}

export interface DecideUserRequestInput {
  status: UserRequestStatus;
  /** Null clears the decision — what a restore back to PENDING does. */
  decidedByUserId: string | null;
  trail: { label: string; actorName: string };
}

const requestInclude = {
  user: {
    select: {
      firstname: true,
      lastname: true,
      address_barangay: true,
      accounts: { select: { email: true }, take: 1 },
      role: { select: { type: true } },
    },
  },
  event: { select: { title: true, event_started: true } },
  decided_by: { select: { firstname: true, lastname: true } },
  trail: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.UserRequestInclude;

export type UserRequestRow = Prisma.UserRequestGetPayload<{
  include: typeof requestInclude;
}>;

@Injectable()
export class UserRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListUserRequestsInput) {
    const where: Prisma.UserRequestWhereInput = {
      ...(input.status === 'all' ? {} : { status: input.status }),
      ...(input.kind === 'all' ? {} : { kind: input.kind }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.userRequest.findMany({
        where,
        include: requestInclude,
        orderBy: [{ createdAt: 'desc' }],
        take: input.limit,
      }),
      this.prisma.userRequest.count({ where }),
    ]);

    return { rows, total };
  }

  async listForUser(userId: string): Promise<UserRequestRow[]> {
    return this.prisma.userRequest.findMany({
      where: { user_id: userId },
      include: requestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findById(id: string): Promise<UserRequestRow | null> {
    return this.prisma.userRequest.findUnique({
      where: { user_request_id: id },
      include: requestInclude,
    });
  }

  /** The open request the requester already has for the same role / event, if any. */
  async findPendingDuplicate(input: {
    userId: string;
    kind: UserRequestKind;
    requestedRole?: RoleType;
    eventId?: number;
  }): Promise<UserRequestRow | null> {
    return this.prisma.userRequest.findFirst({
      where: {
        user_id: input.userId,
        kind: input.kind,
        status: 'PENDING',
        ...(input.requestedRole ? { requested_role: input.requestedRole } : {}),
        ...(input.eventId ? { event_id: input.eventId } : {}),
      },
      include: requestInclude,
    });
  }

  /**
   * The event's beneficiary cap and how many applications a director has
   * already accepted against it. Beneficiaries are counted here, never on the
   * attendance table — that list is the volunteers'.
   */
  async findBeneficiaryCapacity(eventId: number) {
    const [event, accepted] = await Promise.all([
      this.prisma.event.findUnique({
        where: { event_id: eventId },
        select: {
          title: true,
          status: true,
          event_ended: true,
          beneficiary_applicable: true,
          max_beneficiaries: true,
        },
      }),
      this.prisma.userRequest.count({
        where: { kind: 'EVENT_JOIN', event_id: eventId, status: 'ACCEPTED' },
      }),
    ]);
    return event ? { ...event, accepted } : null;
  }

  async create(input: CreateUserRequestInput): Promise<UserRequestRow> {
    return this.prisma.userRequest.create({
      data: {
        kind: input.kind,
        user_id: input.userId,
        summary: input.summary,
        requested_role: input.requestedRole ?? null,
        event_id: input.eventId ?? null,
        id_front_url: input.idFrontUrl ?? null,
        id_back_url: input.idBackUrl ?? null,
        selfie_url: input.selfieUrl ?? null,
        selfie_embedding: input.selfieEmbedding ?? undefined,
        face_similarity: input.faceSimilarity ?? null,
        residency_proof_url: input.residencyProof?.url ?? null,
        residency_proof_name: input.residencyProof?.name ?? null,
        residency_proof_mime: input.residencyProof?.mime ?? null,
        trail: {
          create: {
            label: 'Request submitted from the mobile app',
            actor_name: input.actorName,
          },
        },
      },
      include: requestInclude,
    });
  }

  async decide(
    id: string,
    input: DecideUserRequestInput,
  ): Promise<UserRequestRow> {
    return this.prisma.userRequest.update({
      where: { user_request_id: id },
      data: {
        status: input.status,
        decided_by_user_id: input.decidedByUserId,
        decided_at: input.decidedByUserId ? new Date() : null,
        trail: {
          create: {
            label: input.trail.label,
            actor_name: input.trail.actorName,
          },
        },
      },
      include: requestInclude,
    });
  }

  /**
   * Accepting a role-access request enrols the proof the request carried as
   * the user's verified ID check, in the same transaction as the decision —
   * so profile completion and anything else that reads `UserVerification`
   * sees the ID as verified the moment the director approves.
   */
  async acceptRoleAccess(
    id: string,
    input: Omit<DecideUserRequestInput, 'status'> & { decidedByUserId: string },
  ): Promise<UserRequestRow> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.userRequest.findUniqueOrThrow({
        where: { user_request_id: id },
        select: {
          user_id: true,
          id_front_url: true,
          selfie_url: true,
          selfie_embedding: true,
          user: {
            select: {
              user_verifications: {
                where: { status: VerificationStatus.V },
                select: { user_verification_id: true },
                take: 1,
              },
            },
          },
        },
      });

      // A user can only hold one verified check; a second accepted request
      // (after a restore, say) must not enrol a duplicate.
      if (row.user.user_verifications.length === 0) {
        const faceUrl = row.selfie_url ?? row.id_front_url;
        await tx.userVerification.create({
          data: {
            user: { connect: { user_id: row.user_id } },
            status: VerificationStatus.V,
            user_biometric: faceUrl
              ? {
                  create: {
                    face_url: faceUrl,
                    embedding: row.selfie_embedding ?? Prisma.JsonNull,
                    embedding_type: EmbeddingType.FACE,
                    isActive: true,
                  },
                }
              : undefined,
          },
        });
      }

      return tx.userRequest.update({
        where: { user_request_id: id },
        data: {
          status: 'ACCEPTED',
          decided_by_user_id: input.decidedByUserId,
          decided_at: new Date(),
          trail: {
            create: {
              label: input.trail.label,
              actor_name: input.trail.actorName,
            },
          },
        },
        include: requestInclude,
      });
    });
  }

  async findUserName(
    userId: string,
  ): Promise<{ firstname: string; lastname: string } | null> {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { firstname: true, lastname: true },
    });
  }
}
