import { NotFoundException, Injectable } from '@nestjs/common';
import {
  AuthProvider,
  GenderType,
  Prisma,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { CreateUserDto } from '../dto/auth-mobile-dto';

export interface CreateDonorInput {
  firstname: string;
  lastname: string;
  middleName: string;
  gender: GenderType;
  phoneNumber: string;
  currentAddress: string;
  avatar: string | null;
  email: string;
  provider: AuthProvider;
  providerUserId: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
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
          role: {
            connect: {
              role_id: role.role_id,
            },
          },
          user_school_info: {
            create: {
              id_number: data.school_info.id_number,
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
          user_biometrics: {
            create: {
              face_url: data.biometric.face_url,
              embedding: data.biometric.embedding,
              embedding_type: data.biometric.embedding_type,
              isActive: data.biometric.isActive,
            },
          },
        },
        select: {
          user_id: true,
          user_biometrics: {
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

      return {
        user_id: user.user_id,
        account_id: account.account_id,
        user_biometric_id: user.user_biometrics[0].user_biometric_id,
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
        is_restricted: true,
        restriction_reason: true,
        role: { select: { type: true } },
        user_interest: { select: { user_interest_id: true } },
        accounts: { select: { email: true }, take: 1 },
      },
    });
  }

  async findPhoneNumberOwner(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phone_number: phoneNumber },
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

  async findAccountForLogin(email: string) {
    return this.prisma.account.findUnique({
      where: { email },
      select: {
        email: true,
        password: true,
        credential_expires_at: true,
        user: {
          select: {
            user_id: true,
            firstname: true,
            lastname: true,
            is_restricted: true,
            restriction_reason: true,
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

  async recordLoginIp(userId: string, ipAddress: string) {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { last_login_ip: ipAddress },
      select: { user_id: true },
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
