import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthProvider,
  GenderType,
  Prisma,
  RoleType,
  UserRequestKind,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { NewUserAccountDto } from '../dto/auth-mobile-dto';

interface DonorDetailsInput {
  firstname: string;
  lastname: string;
  middleName: string;
  gender: GenderType;
  phoneNumber: string;
  currentAddress: string;
  email: string;
}

export interface CreateDonorInput extends DonorDetailsInput {
  avatar: string | null;
  provider: AuthProvider;
  providerUserId: string;
}

export interface CreateDonorWithPasswordInput extends DonorDetailsInput {
  /** Already bcrypt-hashed — the repository never sees a plaintext password. */
  hashedPassword: string;
}

/** The sign-up kinds that keep an account shut until a director approves it. */
export const REGISTRATION_REVIEW_KINDS = [
  UserRequestKind.BENEFICIARY_REGISTRATION,
  UserRequestKind.ALUMNI_REGISTRATION,
  UserRequestKind.PARTNER_BARANGAY_REGISTRATION,
  UserRequestKind.MANUAL_REGISTRATION,
] as const;

export type RegistrationReviewKind = (typeof REGISTRATION_REVIEW_KINDS)[number];

/**
 * The review request a self-registered beneficiary or alumnus files with their
 * sign-up — written in the same transaction as the account, so the account never
 * exists without it. A beneficiary attaches a supporting document; an alumnus
 * attaches the alumni ID they uploaded and the selfie matched against it.
 */
export interface RegistrationReviewRequestInput {
  kind: RegistrationReviewKind;
  summary: string;
  /** The first trail line's actor — the person who just registered. */
  actorName: string;
  document?: { url: string; name: string; mime: string; sizeBytes: number };
  idFrontUrl?: string;
  idBackUrl?: string;
  /** The face-scan selfie, for sign-ups face matched against their ID. */
  selfieUrl?: string;
  faceSimilarity?: number;
}

export type RegistrationConflictField = 'email' | 'phone_number' | 'id_number';

const REGISTRATION_CONFLICT_MESSAGES: Record<
  RegistrationConflictField,
  string
> = {
  email: 'An account with this email already exists',
  phone_number: 'This phone number is already registered to another account',
  id_number: 'This ID number is already registered to another account',
};

/**
 * A 409 whose `errors` carries the clashing field in the same `{ path, message }`
 * shape as validation issues, so a client can jump back to that input.
 */
export function registrationConflict(
  field: RegistrationConflictField,
): ConflictException {
  const message = REGISTRATION_CONFLICT_MESSAGES[field];
  return new ConflictException({
    message,
    errors: [{ path: field, message }],
  });
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    data: NewUserAccountDto,
    registrationRequest?: RegistrationReviewRequestInput,
  ) {
    try {
      return await this.createUserInTransaction(data, registrationRequest);
    } catch (error) {
      throw this.mapUniqueViolation(error);
    }
  }

  /**
   * Turns a unique-index clash into a 409 naming the field, so a registration retry
   * reads as "already taken" instead of a raw database failure.
   */
  private mapUniqueViolation(error: unknown): unknown {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return error;
    }

    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target.map(String)
      : [String(target)];
    const field = (['phone_number', 'email', 'id_number'] as const).find(
      (candidate) => fields.includes(candidate),
    );
    return field
      ? registrationConflict(field)
      : new ConflictException('Some of these details are already registered');
  }

  private async createUserInTransaction(
    data: NewUserAccountDto,
    registrationRequest?: RegistrationReviewRequestInput,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const department = await this.findOrCreateDepartment(
        tx,
        data.school_info.department.name,
      );

      const major = await this.findOrCreateMajor(
        tx,
        data.school_info.major.name,
      );

      const yearLevel = await this.findOrCreateYearLevel(
        tx,
        data.school_info.year_level.name,
      );

      const role =
        (await tx.role.findFirst({
          where: { type: data.role_type },
          select: { role_id: true },
        })) ??
        (await tx.role.create({
          data: { type: data.role_type },
          select: { role_id: true },
        }));

      const user = await tx.user.create({
        data: {
          firstname: data.firstname,
          lastname: data.lastname,
          middle_name: data.middle_name,
          gender: data.gender,
          age: data.age,
          current_address: data.current_address,
          phone_number: data.phone_number,
          partner_barangay: data.partner_barangay ?? null,
          beneficiary_type: data.beneficiary_type ?? null,
          role: {
            connect: {
              role_id: role.role_id,
            },
          },
          user_school_info: {
            create: {
              id_number: data.school_info.id_number,
              school_id_url: data.school_info.school_id_url ?? null,
              graduation_year: data.school_info.graduation_year,
              graduation_month: data.school_info.graduation_month,
              graduation_day: data.school_info.graduation_day,
              department: {
                connect: {
                  department_id: department.department_id,
                },
              },
              major: {
                connect: {
                  major_id: major.major_id,
                },
              },
              year_level: {
                connect: {
                  year_level_id: yearLevel.year_level_id,
                },
              },
            },
          },
          // A face is only enrolled once it has matched the ID during sign-up, so
          // the verification it owns is already passed — not left pending.
          user_verifications: data.biometric
            ? {
                create: {
                  status: VerificationStatus.V,
                  user_biometric: {
                    create: {
                      face_url: data.biometric.face_url,
                      embedding: data.biometric.embedding,
                      embedding_type: data.biometric.embedding_type,
                      isActive: data.biometric.isActive,
                    },
                  },
                },
              }
            : undefined,
        },
        select: {
          user_id: true,
          user_verifications: {
            select: {
              user_biometric_id: true,
            },
          },
        },
      });

      const account = await tx.account.create({
        data: {
          email: data.account.email,
          password: data.account.password,
          // Only reached after the sign-up OTP — see `requireVerifiedEmail`.
          email_verified_at: new Date(),
          user: {
            connect: {
              user_id: user.user_id,
            },
          },
        },
        select: {
          account_id: true,
        },
      });

      let review: { user_request_id: string; reference_number: number } | null =
        null;
      if (registrationRequest) {
        review = await tx.userRequest.create({
          data: {
            kind: registrationRequest.kind,
            user_id: user.user_id,
            summary: registrationRequest.summary,
            id_front_url: registrationRequest.idFrontUrl ?? null,
            id_back_url: registrationRequest.idBackUrl ?? null,
            selfie_url: registrationRequest.selfieUrl ?? null,
            face_similarity: registrationRequest.faceSimilarity ?? null,
            document_url: registrationRequest.document?.url ?? null,
            document_name: registrationRequest.document?.name ?? null,
            document_mime: registrationRequest.document?.mime ?? null,
            document_size_bytes:
              registrationRequest.document?.sizeBytes ?? null,
            trail: {
              create: {
                label: 'Registration submitted from the mobile app',
                actor_name: registrationRequest.actorName,
              },
            },
          },
          select: { user_request_id: true, reference_number: true },
        });
      }

      return {
        user_id: user.user_id,
        account_id: account.account_id,
        user_biometric_id:
          user.user_verifications[0]?.user_biometric_id ?? null,
        /** The director's review filed with the sign-up, when it needs one. */
        registration_review: review,
      };
    });
  }

  /**
   * Creates a donor and the social identity that may sign in as them, in one
   * transaction — a donor row with no way to sign in would be unreachable.
   *
   * Donors have no school record and no biometric enrolment: they never present an ID
   * or a face scan, so those relations stay empty rather than being filled with stubs.
   */
  async createDonorFromOAuth(data: CreateDonorInput) {
    return await this.prisma.$transaction(async (tx) => {
      const role =
        (await tx.role.findFirst({
          where: { type: RoleType.DONOR },
          select: { role_id: true },
        })) ??
        (await tx.role.create({
          data: { type: RoleType.DONOR },
          select: { role_id: true },
        }));

      const user = await tx.user.create({
        data: {
          firstname: data.firstname,
          lastname: data.lastname,
          middle_name: data.middleName,
          gender: data.gender,
          current_address: data.currentAddress,
          phone_number: data.phoneNumber,
          avatar: data.avatar,
          role: { connect: { role_id: role.role_id } },
        },
        select: { user_id: true },
      });

      const account = await tx.account.create({
        data: {
          email: data.email,
          // The provider vouched for the address when the token was checked.
          email_verified_at: new Date(),
          user: { connect: { user_id: user.user_id } },
        },
        select: { account_id: true },
      });

      const identity = await tx.oAuthIdentity.create({
        data: {
          provider: data.provider,
          provider_user_id: data.providerUserId,
          email: data.email,
          user: { connect: { user_id: user.user_id } },
        },
        select: { oauth_identity_id: true },
      });

      return {
        user_id: user.user_id,
        account_id: account.account_id,
        oauth_identity_id: identity.oauth_identity_id,
      };
    });
  }

  /**
   * Creates a donor who signs in with a password instead of a provider. Same shape as
   * the OAuth variant minus the identity row — the account itself carries the credential.
   */
  async createDonorWithPassword(data: CreateDonorWithPasswordInput) {
    return await this.prisma.$transaction(async (tx) => {
      const role =
        (await tx.role.findFirst({
          where: { type: RoleType.DONOR },
          select: { role_id: true },
        })) ??
        (await tx.role.create({
          data: { type: RoleType.DONOR },
          select: { role_id: true },
        }));

      const user = await tx.user.create({
        data: {
          firstname: data.firstname,
          lastname: data.lastname,
          middle_name: data.middleName,
          gender: data.gender,
          current_address: data.currentAddress,
          phone_number: data.phoneNumber,
          role: { connect: { role_id: role.role_id } },
        },
        select: { user_id: true },
      });

      const account = await tx.account.create({
        data: {
          email: data.email,
          password: data.hashedPassword,
          // Only reached after the sign-up OTP.
          email_verified_at: new Date(),
          user: { connect: { user_id: user.user_id } },
        },
        select: { account_id: true },
      });

      return { user_id: user.user_id, account_id: account.account_id };
    });
  }

  /** Resolves a provider subject id to the CARES user it already signs in as. */
  async findOAuthIdentity(provider: AuthProvider, providerUserId: string) {
    return this.prisma.oAuthIdentity.findUnique({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: providerUserId,
        },
      },
      select: {
        oauth_identity_id: true,
        email: true,
        user: {
          select: {
            user_id: true,
            firstname: true,
            role: { select: { type: true } },
            user_interest: { select: { user_interest_id: true } },
            accounts: { select: { email: true }, take: 1 },
          },
        },
      },
    });
  }

  /**
   * Attaches a provider identity to a user who already exists — the case where someone
   * registered with an email and later taps the matching provider button.
   */
  async linkOAuthIdentity(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
    email: string,
  ) {
    return this.prisma.oAuthIdentity.upsert({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: providerUserId,
        },
      },
      create: {
        provider,
        provider_user_id: providerUserId,
        email,
        user: { connect: { user_id: userId } },
      },
      update: { email },
      select: { oauth_identity_id: true },
    });
  }

  /** Everything a session needs about a user resolved by something other than a password. */
  async findUserForSession(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        firstname: true,
        beneficiary_type: true,
        role: { select: { type: true } },
        user_interest: { select: { user_interest_id: true } },
        accounts: {
          select: {
            email: true,
            is_restricted: true,
            restriction_reason: true,
          },
          take: 1,
        },
      },
    });
  }

  async findPhoneNumberOwner(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phone_number: phoneNumber },
      select: { user_id: true },
    });
  }

  async findSchoolIdOwner(idNumber: string) {
    return this.prisma.userSchoolInfo.findUnique({
      where: { id_number: idNumber },
      select: { user_id: true },
    });
  }

  async findUserByEmail(email: string) {
    return await this.prisma.account.findUnique({
      where: {
        email,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * The latest sign-up review on the account (beneficiary or alumni), if it
   * registered through one.
   */
  async findRegistrationReview(userId: string) {
    return this.prisma.userRequest.findFirst({
      where: {
        user_id: userId,
        kind: { in: [...REGISTRATION_REVIEW_KINDS] },
      },
      orderBy: { createdAt: 'desc' },
      select: { kind: true, status: true, rejection_reason: true },
    });
  }

  /**
   * A registration review as the public status page shows it — looked up by the
   * id inside a signed status link, so nothing here is guessable from outside.
   */
  async findRegistrationStatus(userRequestId: string) {
    return this.prisma.userRequest.findFirst({
      where: {
        user_request_id: userRequestId,
        kind: { in: [...REGISTRATION_REVIEW_KINDS] },
      },
      select: {
        kind: true,
        status: true,
        reference_number: true,
        rejection_reason: true,
        decided_at: true,
        createdAt: true,
        user: { select: { firstname: true } },
      },
    });
  }

  async findAccountForLogin(email: string) {
    return this.prisma.account.findUnique({
      where: { email },
      select: {
        email: true,
        password: true,
        credential_expires_at: true,
        email_verified_at: true,
        is_restricted: true,
        restriction_reason: true,
        user: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            beneficiary_type: true,
            role: {
              select: { type: true },
            },
            user_interest: {
              select: { user_interest_id: true },
            },
          },
        },
      },
    });
  }

  /**
   * Password-reset write. `credential_expires_at` is cleared as well: an account the
   * administrator provisioned with a temporary credential now has one its owner chose,
   * so the expiry that forced the hand-over no longer applies.
   */
  async updatePasswordByEmail(email: string, hashedPassword: string) {
    return this.prisma.account.update({
      where: { email },
      data: {
        password: hashedPassword,
        credential_expires_at: null,
      },
      select: { account_id: true, email: true, user_id: true },
    });
  }

  async markEmailVerified(email: string) {
    return this.prisma.account.update({
      where: { email },
      data: { email_verified_at: new Date() },
      select: { account_id: true },
    });
  }

  async recordLoginIp(userId: string, ipAddress: string) {
    return this.prisma.account.updateMany({
      where: { user_id: userId },
      data: { last_login_ip: ipAddress },
    });
  }

  async findBlockedIp(ipAddress: string) {
    return this.prisma.blockedIp.findUnique({
      where: { ip_address: ipAddress },
      select: { ip_address: true },
    });
  }

  async findUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        firstname: true,
        lastname: true,
        accounts: {
          select: { email: true },
          take: 1,
        },
        role: {
          select: { type: true },
        },
      },
    });
  }

  private async findOrCreateDepartment(
    tx: Prisma.TransactionClient,
    name: string,
  ) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new NotFoundException('Department name is required');
    }

    const existing = await tx.department.findFirst({
      where: { name: normalizedName },
      select: { department_id: true },
    });

    if (existing) {
      return existing;
    }

    return tx.department.create({
      data: { name: normalizedName },
      select: { department_id: true },
    });
  }

  private async findOrCreateMajor(tx: Prisma.TransactionClient, name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new NotFoundException('Major name is required');
    }

    const existing = await tx.major.findFirst({
      where: { name: normalizedName },
      select: { major_id: true },
    });

    if (existing) {
      return existing;
    }

    return tx.major.create({
      data: { name: normalizedName },
      select: { major_id: true },
    });
  }

  private async findOrCreateYearLevel(
    tx: Prisma.TransactionClient,
    name: string,
  ) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new NotFoundException('Year level name is required');
    }

    const existing = await tx.yearLevel.findFirst({
      where: { name: normalizedName },
      select: { year_level_id: true },
    });

    if (existing) {
      return existing;
    }

    return tx.yearLevel.create({
      data: { name: normalizedName },
      select: { year_level_id: true },
    });
  }
}
