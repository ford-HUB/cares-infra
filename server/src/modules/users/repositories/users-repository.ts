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
  status: 'all' | 'active' | 'restricted' | 'pending';
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
  is_restricted: true,
  restriction_reason: true,
  last_login_ip: true,
  createdAt: true,
  accounts: { select: { email: true }, take: 1 },
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

export type UserDetailRow = NonNullable<
  Awaited<ReturnType<UsersRepository['findUserDetail']>>
>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(filter: ListUsersFilter) {
    const where = buildWhere(filter);

    const [rows, total] = await this.prisma.$transaction([
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
        signature_url: true,
        address_street: true,
        address_barangay: true,
        address_city: true,
        address_province: true,
        restricted_at: true,
        updatedAt: true,
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
    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        is_restricted: restricted,
        restricted_at: restricted ? new Date() : null,
        restriction_reason: reason,
      },
      select: { user_id: true },
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

  if (filter.status === 'restricted') {
    where.is_restricted = true;
  }

  if (filter.status === 'pending') {
    where.is_restricted = false;
    where.user_verifications = {
      some: { status: VerificationStatus.PENDING },
    };
  }

  if (filter.status === 'active') {
    where.is_restricted = false;
    where.user_verifications = {
      none: { status: VerificationStatus.PENDING },
    };
  }

  return where;
}
