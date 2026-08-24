import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PermissionKey,
  PermissionOverrideEffect,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface ListAccessUsersFilter {
  search?: string;
  role: RoleType | 'all';
  rights: 'all' | 'customised' | 'suspended';
  skip: number;
  take: number;
  /** Roles that hold portal rights — app-side accounts never appear on this page. */
  portalRoles: readonly RoleType[];
}

/** A suspension counts as in force until it is lifted or its expiry passes. */
export function activeSuspensionWhere(
  now: Date,
): Prisma.UserActionSuspensionWhereInput {
  return {
    lifted_at: null,
    OR: [{ expires_at: null }, { expires_at: { gt: now } }],
  };
}

export interface OverrideInput {
  permission: PermissionKey;
  effect: PermissionOverrideEffect;
  reason: string | null;
}

const accessUserSelect = {
  user_id: true,
  firstname: true,
  lastname: true,
  portal_department: true,
  is_restricted: true,
  accounts: { select: { email: true }, take: 1 },
  role: { select: { type: true } },
  permission_overrides: {
    select: {
      permission: true,
      effect: true,
      reason: true,
      granted_by_user_id: true,
      updatedAt: true,
    },
  },
  action_suspensions: {
    select: {
      user_action_suspension_id: true,
      permission: true,
      reason: true,
      issued_by_user_id: true,
      expires_at: true,
      lifted_at: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.UserSelect;

export type AccessUserRow = Prisma.UserGetPayload<{
  select: typeof accessUserSelect;
}>;

@Injectable()
export class AccessControlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(filter: ListAccessUsersFilter) {
    const where = buildWhere(filter);

    // Two independent reads, so they run concurrently rather than holding a
    // transaction slot open — a paged read needs no atomicity.
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: accessUserSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { rows, total };
  }

  async findUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: accessUserSelect,
    });
  }

  async findRoleDefaults(roleType: RoleType) {
    return this.prisma.rolePermissionDefault.findMany({
      where: { role_type: roleType },
      select: { permission: true },
    });
  }

  async findAllRoleDefaults() {
    return this.prisma.rolePermissionDefault.findMany({
      select: { role_type: true, permission: true },
    });
  }

  /** Replaces a role's baseline wholesale — the caller sends the complete set. */
  async replaceRoleDefaults(roleType: RoleType, permissions: PermissionKey[]) {
    await this.prisma.$transaction([
      this.prisma.rolePermissionDefault.deleteMany({
        where: { role_type: roleType },
      }),
      this.prisma.rolePermissionDefault.createMany({
        data: permissions.map((permission) => ({
          role_type: roleType,
          permission,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  /** Replaces every override for one user; an empty list drops them back to baseline. */
  async replaceUserOverrides(
    userId: string,
    overrides: OverrideInput[],
    grantedByUserId: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.userPermissionOverride.deleteMany({
        where: { user_id: userId },
      }),
      this.prisma.userPermissionOverride.createMany({
        data: overrides.map((override) => ({
          user_id: userId,
          permission: override.permission,
          effect: override.effect,
          reason: override.reason,
          granted_by_user_id: grantedByUserId,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  async createSuspensions(params: {
    userId: string;
    permissions: PermissionKey[];
    reason: string;
    issuedByUserId: string;
    expiresAt: Date | null;
  }) {
    // Re-suspending an action supersedes the standing one rather than stacking.
    await this.prisma.$transaction([
      this.prisma.userActionSuspension.updateMany({
        where: {
          user_id: params.userId,
          permission: { in: params.permissions },
          lifted_at: null,
        },
        data: {
          lifted_at: new Date(),
          lifted_by_user_id: params.issuedByUserId,
        },
      }),
      this.prisma.userActionSuspension.createMany({
        data: params.permissions.map((permission) => ({
          user_id: params.userId,
          permission,
          reason: params.reason,
          issued_by_user_id: params.issuedByUserId,
          expires_at: params.expiresAt,
        })),
      }),
    ]);
  }

  async findSuspension(suspensionId: string) {
    return this.prisma.userActionSuspension.findUnique({
      where: { user_action_suspension_id: suspensionId },
      select: {
        user_action_suspension_id: true,
        user_id: true,
        lifted_at: true,
        // Both are read for the audit entry: lifting a suspension has to say which
        // action came back, and why it was suspended in the first place.
        permission: true,
        reason: true,
      },
    });
  }

  async liftSuspension(suspensionId: string, liftedByUserId: string) {
    return this.prisma.userActionSuspension.update({
      where: { user_action_suspension_id: suspensionId },
      data: { lifted_at: new Date(), lifted_by_user_id: liftedByUserId },
      select: { user_action_suspension_id: true },
    });
  }
}

function buildWhere(filter: ListAccessUsersFilter): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    role: {
      type:
        filter.role === 'all' ? { in: [...filter.portalRoles] } : filter.role,
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

  if (filter.rights === 'customised') {
    where.permission_overrides = { some: {} };
  }

  if (filter.rights === 'suspended') {
    where.action_suspensions = { some: activeSuspensionWhere(new Date()) };
  }

  return where;
}
