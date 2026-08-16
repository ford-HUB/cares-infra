import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RoleType,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  BlockUserIpDto,
  ListUsersQueryDto,
  ManagedUserDto,
  ManagedUserDetailDto,
  ManagedUserListDto,
  RestrictUserDto,
  UserAssetKind,
} from '../dto/users-site-dto';
import {
  UsersRepository,
  type ManagedUserRow,
  type UserDetailRow,
} from '../repositories/users-repository';

/** An admin sees every account; a director sees everyone except other admins. */
const VISIBLE_ROLES: Record<string, readonly RoleType[]> = {
  [RoleType.ADMIN]: Object.values(RoleType),
  [RoleType.DIRECTOR]: Object.values(RoleType).filter(
    (role) => role !== RoleType.ADMIN,
  ),
};

@Injectable()
export class UsersSiteService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly s3Service: S3Service,
  ) {}

  async listUsers(
    caller: JwtPayload,
    query: ListUsersQueryDto,
  ): Promise<ManagedUserListDto> {
    const visibleRoles = this.visibleRolesFor(caller);

    if (query.role !== 'all' && !visibleRoles.includes(query.role)) {
      throw new ForbiddenException('You cannot list users with that role');
    }

    const { rows, total } = await this.usersRepository.listUsers({
      search: query.search,
      role: query.role,
      status: query.status,
      skip: (query.page - 1) * query.page_size,
      take: query.page_size,
      visibleRoles,
    });

    return {
      items: rows.map(toManagedUser),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getUserDetail(
    caller: JwtPayload,
    userId: string,
  ): Promise<ManagedUserDetailDto> {
    await this.requireVisibleUser(caller, userId);

    const user = await this.usersRepository.findUserDetail(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toManagedUserDetail(user);
  }

  /** Streams another user's avatar or signature — portal staff only, gated by visibility. */
  async getUserAsset(caller: JwtPayload, userId: string, kind: UserAssetKind) {
    await this.requireVisibleUser(caller, userId);

    const user = await this.usersRepository.findUserDetail(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const storedUrl = kind === 'avatar' ? user.avatar : user.signature_url;
    if (!storedUrl) {
      throw new NotFoundException(
        `${kind === 'avatar' ? 'Profile photo' : 'Signature'} not found`,
      );
    }

    return this.s3Service.getObject(storedUrl);
  }

  async restrictUser(
    caller: JwtPayload,
    userId: string,
    data: RestrictUserDto,
  ): Promise<ManagedUserDto> {
    const target = await this.requireVisibleUser(caller, userId);

    if (target.user_id === caller.sub) {
      throw new BadRequestException('You cannot restrict your own account');
    }

    await this.usersRepository.setRestriction(userId, true, data.reason);
    return this.reload(userId);
  }

  async unrestrictUser(
    caller: JwtPayload,
    userId: string,
  ): Promise<ManagedUserDto> {
    await this.requireVisibleUser(caller, userId);
    await this.usersRepository.setRestriction(userId, false, null);
    return this.reload(userId);
  }

  async blockUserIp(
    caller: JwtPayload,
    userId: string,
    data: BlockUserIpDto,
  ): Promise<ManagedUserDto> {
    const target = await this.requireVisibleUser(caller, userId);
    const ipAddress = data.ip_address ?? target.last_login_ip;

    if (!ipAddress) {
      throw new BadRequestException(
        'No IP address to block — this account has no recorded sign-in',
      );
    }

    await this.usersRepository.upsertBlockedIp({
      ipAddress,
      userId,
      reason: data.reason ?? null,
      blockedByUserId: caller.sub,
    });

    return this.reload(userId);
  }

  async unblockUserIp(
    caller: JwtPayload,
    userId: string,
    ipAddress?: string,
  ): Promise<ManagedUserDto> {
    await this.requireVisibleUser(caller, userId);
    await this.usersRepository.deleteBlockedIpsForUser(userId, ipAddress);
    return this.reload(userId);
  }

  private visibleRolesFor(caller: JwtPayload): readonly RoleType[] {
    const roles = VISIBLE_ROLES[caller.role_type];
    if (!roles) {
      throw new ForbiddenException('You cannot manage users');
    }
    return roles;
  }

  private async requireVisibleUser(caller: JwtPayload, userId: string) {
    const user = await this.usersRepository.findManagedUser(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!this.visibleRolesFor(caller).includes(user.role.type)) {
      throw new ForbiddenException('You cannot manage this user');
    }
    return user;
  }

  private async reload(userId: string): Promise<ManagedUserDto> {
    const user = await this.usersRepository.findManagedUser(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toManagedUser(user);
  }
}

function toManagedUserDetail(row: UserDetailRow): ManagedUserDetailDto {
  const school = row.user_school_info[0];

  return {
    ...toManagedUser(row),
    middle_name: row.middle_name,
    gender: row.gender,
    age: row.age,
    phone_number: row.phone_number,
    current_address: row.current_address,
    address: {
      street: row.address_street,
      barangay: row.address_barangay,
      city: row.address_city,
      province: row.address_province,
    },
    has_avatar: Boolean(row.avatar),
    has_signature: Boolean(row.signature_url),
    restricted_at: row.restricted_at?.toISOString() ?? null,
    updated_at: row.updatedAt.toISOString(),
    school_info: school
      ? {
          id_number: school.id_number,
          department: school.department.name,
          major: school.major.name,
          year_level: school.year_level.name,
          graduation_date: `${school.graduation_year}-${pad(school.graduation_month)}-${pad(school.graduation_day)}`,
        }
      : null,
    verifications: row.user_verifications.map((verification) => ({
      status: verification.status,
      submitted_at: verification.createdAt.toISOString(),
    })),
    interests: toInterestLabels(row.user_interest?.selected),
    blocked_ip_details: row.blocked_ips.map((blocked) => ({
      ip_address: blocked.ip_address,
      reason: blocked.reason,
      blocked_at: blocked.createdAt.toISOString(),
    })),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `UserInterest.selected` is free-form JSON — accept an array of codes, ignore anything else. */
function toInterestLabels(selected: unknown): string[] {
  if (!Array.isArray(selected)) return [];
  return selected.filter((value): value is string => typeof value === 'string');
}

function toManagedUser(row: ManagedUserRow): ManagedUserDto {
  const hasPendingVerification =
    row.user_verifications[0]?.status === VerificationStatus.PENDING;

  return {
    user_id: row.user_id,
    firstname: row.firstname,
    lastname: row.lastname,
    email: row.accounts[0]?.email ?? '',
    role_type: row.role.type,
    department: row.portal_department,
    status: row.is_restricted
      ? 'restricted'
      : hasPendingVerification
        ? 'pending'
        : 'active',
    restriction_reason: row.restriction_reason,
    last_login_ip: row.last_login_ip,
    blocked_ips: row.blocked_ips.map((blocked) => blocked.ip_address),
    created_at: row.createdAt.toISOString(),
  };
}
