import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RoleType,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface ListUsersFilter {
  search?: string;
  role: RoleType | 'all';
  status: 'all' | 'active' | 'restricted' | 'pending' | 'expired';
  skip: number;
  take: number;
  /** Roles the caller is allowed to see — a director never lists admins. */
  visibleRoles: readonly RoleType[];
}

const managedUserSelect = {
  user_id: true,
  firstname: true,
  lastname: true,
  portal_department: true,
  createdAt: true,
  accounts: {
    select: {
      email: true,
      credential_expires_at: true,
      is_restricted: true,
      restriction_reason: true,
      last_login_ip: true,
    },
    take: 1,
  },
  role: { select: { type: true } },
  blocked_ips: { select: { ip_address: true } },
  user_verifications: {
    select: { status: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.UserSelect;

export type ManagedUserRow = Prisma.UserGetPayload<{
  select: typeof managedUserSelect;
}>;

export interface CreateProvisionedUserInput {
  firstname: string;
  lastname: string;
  roleId: string;
  department: string | null;
  phoneNumber: string;
  email: string;
  passwordHash: string;
  credentialExpiresAt: Date;
  provisionedByUserId: string;
}

export type UserDetailRow = NonNullable<
  Awaited<ReturnType<UsersRepository['findUserDetail']>>
>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(filter: ListUsersFilter) {
    const where = buildWhere(filter);

    // Two independent reads, so they run concurrently rather than holding a
    // transaction slot open — a paged read needs no atomicity.
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: managedUserSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { rows, total };
  }

  async findUserDetail(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        ...managedUserSelect,
        middle_name: true,
        gender: true,
        age: true,
        current_address: true,
        phone_number: true,
        avatar: true,
        address_street: true,
        address_barangay: true,
        address_city: true,
        address_province: true,
        updatedAt: true,
        accounts: {
          select: {
            ...managedUserSelect.accounts.select,
            signature_url: true,
            restricted_at: true,
          },
          take: 1,
        },
        user_school_info: {
          select: {
            id_number: true,
            graduation_year: true,
            graduation_month: true,
            graduation_day: true,
            department: { select: { name: true } },
            major: { select: { name: true } },
            year_level: { select: { name: true } },
          },
          take: 1,
        },
        user_verifications: {
          select: { status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        user_interest: { select: { selected: true } },
        blocked_ips: {
          select: { ip_address: true, reason: true, createdAt: true },
        },
      },
    });
  }

  async findManagedUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: managedUserSelect,
    });
  }

  async setRestriction(
    userId: string,
    restricted: boolean,
    reason: string | null,
  ) {
    return this.prisma.account.updateMany({
      where: { user_id: userId },
      data: {
        is_restricted: restricted,
        restricted_at: restricted ? new Date() : null,
        restriction_reason: reason,
      },
    });
  }

  async upsertBlockedIp(params: {
    ipAddress: string;
    userId: string;
    reason: string | null;
    blockedByUserId: string;
  }) {
    return this.prisma.blockedIp.upsert({
      where: { ip_address: params.ipAddress },
      create: {
        ip_address: params.ipAddress,
        user_id: params.userId,
        reason: params.reason,
        blocked_by_user_id: params.blockedByUserId,
      },
      update: {
        user_id: params.userId,
        reason: params.reason,
        blocked_by_user_id: params.blockedByUserId,
      },
      select: { ip_address: true },
    });
  }

  async deleteBlockedIpsForUser(userId: string, ipAddress?: string) {
    return this.prisma.blockedIp.deleteMany({
      where: {
        user_id: userId,
        ...(ipAddress ? { ip_address: ipAddress } : {}),
      },
    });
  }

  async findBlockedIp(ipAddress: string) {
    return this.prisma.blockedIp.findUnique({
      where: { ip_address: ipAddress },
      select: { ip_address: true },
    });
  }

  async findUserByPhone(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phone_number: phoneNumber },
      select: { user_id: true },
    });
  }

  async findAccountByEmail(email: string) {
    return this.prisma.account.findUnique({
      where: { email },
      select: { account_id: true, user_id: true },
    });
  }

  /**
   * `Role` has no unique constraint on `type`, so a role is looked up before it is
   * created — the same shape the admin seeder uses.
   */
  async findOrCreateRole(type: RoleType) {
    const existing = await this.prisma.role.findFirst({
      where: { type },
      select: { role_id: true },
    });

    return (
      existing ??
      this.prisma.role.create({ data: { type }, select: { role_id: true } })
    );
  }

  /** The user and its account are one write — an account-less user cannot sign in. */
  async createProvisionedUser(input: CreateProvisionedUserInput) {
    return this.prisma.user.create({
      data: {
        firstname: input.firstname,
        lastname: input.lastname,
        // Age and address belong to the person, not to the administrator filling this
        // in from an emailed request. They stay blank until the account completes its
        // own profile.
        age: 0,
        current_address: '',
        phone_number: input.phoneNumber,
        portal_department: input.department,
        role_id: input.roleId,
        accounts: {
          create: {
            email: input.email,
            password: input.passwordHash,
            credential_expires_at: input.credentialExpiresAt,
            provisioned_by_user_id: input.provisionedByUserId,
          },
        },
      },
      select: { user_id: true },
    });
  }

  async findProvisionedAccount(userId: string) {
    return this.prisma.account.findFirst({
      where: { user_id: userId },
      select: {
        account_id: true,
        email: true,
        credential_expires_at: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async replaceAccountCredential(params: {
    accountId: string;
    passwordHash: string;
    credentialExpiresAt: Date;
    provisionedByUserId: string;
  }) {
    return this.prisma.account.update({
      where: { account_id: params.accountId },
      data: {
        password: params.passwordHash,
        credential_expires_at: params.credentialExpiresAt,
        provisioned_by_user_id: params.provisionedByUserId,
      },
      select: { account_id: true },
    });
  }
}

function buildWhere(filter: ListUsersFilter): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    role: {
      type:
        filter.role === 'all' ? { in: [...filter.visibleRoles] } : filter.role,
    },
  };

  if (filter.search) {
    where.OR = [
      { firstname: { contains: filter.search, mode: 'insensitive' } },
      { lastname: { contains: filter.search, mode: 'insensitive' } },
      {
        accounts: {
          some: { email: { contains: filter.search, mode: 'insensitive' } },
        },
      },
    ];
  }

  // Restriction lives on the account row — see `Account.is_restricted`.
  if (filter.status === 'restricted') {
    where.accounts = { some: { is_restricted: true } };
  }

  if (filter.status === 'pending') {
    where.accounts = { none: { is_restricted: true } };
    where.user_verifications = {
      some: { status: VerificationStatus.N },
    };
  }

  if (filter.status === 'active') {
    where.user_verifications = {
      none: { status: VerificationStatus.N },
    };
    // An outstanding credential that has lapsed reads as `expired`, not `active` —
    // the account cannot sign in either way.
    where.accounts = {
      none: {
        OR: [
          { is_restricted: true },
          { credential_expires_at: { lt: new Date() } },
        ],
      },
    };
  }

  if (filter.status === 'expired') {
    where.accounts = {
      some: { is_restricted: false, credential_expires_at: { lt: new Date() } },
    };
  }

  return where;
}
