import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  PermissionKey,
  PermissionOverrideEffect,
  RoleType,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import {
  PERMISSION_CATALOG,
  defaultPermissionsFor,
} from '../../../shared/constants/permission-catalog';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import {
  generatePlaceholderPhone,
  generateTemporaryEmail,
  generateTemporaryPassword,
} from '../../../shared/utils/temporary-credential-utils';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { AccessControlRepository } from '../../access-control/repositories/access-control-repository';
import type { OverrideInput } from '../../access-control/repositories/access-control-repository';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import { LoginPolicyEnforcer } from '../../security-policy/services/login-policy-enforcer';
import { SecurityPolicyService } from '../../security-policy/services/security-policy-service';
import type {
  BlockUserIpDto,
  ListUsersQueryDto,
  ManagedUserDto,
  ManagedUserDetailDto,
  ManagedUserListDto,
  ProvisionUserDto,
  ProvisionedUserDto,
  ReissueCredentialsDto,
  RestrictUserDto,
  UserAssetKind,
} from '../dto/users-site-dto';
import {
  UsersRepository,
  type ManagedUserRow,
  type UserDetailRow,
} from '../repositories/users-repository';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Generated sign-in names are minted under a domain nothing is delivered to — the
 * credential is read out to the requester, not emailed. Overridable so a deployment
 * that owns a real domain can use it.
 */
const DEFAULT_PROVISIONED_EMAIL_DOMAIN = 'cares.local';

/** A minted address collides only by chance; a few attempts is more than enough. */
const EMAIL_GENERATION_ATTEMPTS = 5;

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
    private readonly auditLogRecorder: AuditLogRecorder,
    private readonly accessControlRepository: AccessControlRepository,
    private readonly securityPolicyService: SecurityPolicyService,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
    private readonly configService: ConfigService,
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
    context: RequestContextDto = {},
  ): Promise<ManagedUserDto> {
    const target = await this.requireVisibleUser(caller, userId);

    if (target.user_id === caller.sub) {
      throw new BadRequestException('You cannot restrict your own account');
    }

    await this.usersRepository.setRestriction(userId, true, data.reason);

    await this.auditLogRecorder.record({
      action: 'user.restricted',
      description: `Restricted the account of ${displayName(target)}`,
      category: 'USER_MANAGEMENT',
      // The account can no longer sign in, so this is the heaviest thing the user
      // management screen can do short of blocking a network.
      severity: 'WARNING',
      actor: caller,
      targetType: 'user',
      targetLabel: displayName(target),
      targetId: target.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: data.reason,
      changes: [{ field: 'is_restricted', before: 'false', after: 'true' }],
      metadata: { role: target.role.type },
    });

    return this.reload(userId);
  }

  async unrestrictUser(
    caller: JwtPayload,
    userId: string,
    context: RequestContextDto = {},
  ): Promise<ManagedUserDto> {
    const target = await this.requireVisibleUser(caller, userId);
    await this.usersRepository.setRestriction(userId, false, null);

    await this.auditLogRecorder.record({
      action: 'user.unrestricted',
      description: `Lifted the restriction on ${displayName(target)}`,
      category: 'USER_MANAGEMENT',
      severity: 'NOTICE',
      actor: caller,
      targetType: 'user',
      targetLabel: displayName(target),
      targetId: target.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      // The reason the account was restricted for is worth carrying over — it is
      // cleared by the write, so the trail is the only place it survives.
      reason: target.restriction_reason,
      changes: [{ field: 'is_restricted', before: 'true', after: 'false' }],
      metadata: { role: target.role.type },
    });

    return this.reload(userId);
  }

  async blockUserIp(
    caller: JwtPayload,
    userId: string,
    data: BlockUserIpDto,
    context: RequestContextDto = {},
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

    await this.auditLogRecorder.record({
      action: 'user.ip.blocked',
      description: `Blocked ${ipAddress} for ${displayName(target)}`,
      category: 'USER_MANAGEMENT',
      severity: 'WARNING',
      actor: caller,
      targetType: 'user',
      targetLabel: displayName(target),
      targetId: target.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: data.reason ?? null,
      changes: [{ field: 'blocked_ip', before: null, after: ipAddress }],
      metadata: {
        // Whether the operator typed the address or took the account's last known
        // one changes how the entry reads on review.
        source: data.ip_address ? 'explicit' : 'last-sign-in',
      },
    });

    return this.reload(userId);
  }

  async unblockUserIp(
    caller: JwtPayload,
    userId: string,
    ipAddress?: string,
    context: RequestContextDto = {},
  ): Promise<ManagedUserDto> {
    const target = await this.requireVisibleUser(caller, userId);
    // Read before writing: an unblock-all clears rows the trail would otherwise
    // have no way to name.
    const cleared = ipAddress
      ? [ipAddress]
      : target.blocked_ips.map((blocked) => blocked.ip_address);

    await this.usersRepository.deleteBlockedIpsForUser(userId, ipAddress);

    await this.auditLogRecorder.record({
      action: 'user.ip.unblocked',
      description: ipAddress
        ? `Unblocked ${ipAddress} for ${displayName(target)}`
        : `Unblocked every address for ${displayName(target)} (${cleared.length})`,
      category: 'USER_MANAGEMENT',
      severity: 'NOTICE',
      actor: caller,
      targetType: 'user',
      targetLabel: displayName(target),
      targetId: target.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes: cleared.map((address) => ({
        field: 'blocked_ip',
        before: address,
        after: null,
      })),
    });

    return this.reload(userId);
  }

  /**
   * Creates a portal account for someone whose access request was approved, and hands
   * back the one credential they sign in with. The password is generated in both modes
   * and returned in plaintext exactly once — it is bcrypt-hashed before it is stored,
   * so nothing can read it back afterwards.
   */
  async provisionUser(
    caller: JwtPayload,
    data: ProvisionUserDto,
    context: RequestContextDto = {},
  ): Promise<ProvisionedUserDto> {
    const visibleRoles = this.visibleRolesFor(caller);
    if (!visibleRoles.includes(data.role_type)) {
      throw new ForbiddenException(
        'You cannot create an account with that role',
      );
    }

    const firstname = data.firstname.trim();
    const lastname = data.lastname.trim();
    const email =
      data.mode === 'manual'
        ? await this.claimManualEmail(data.email)
        : await this.mintUnusedEmail(firstname, lastname);

    const phoneNumber = await this.claimPhoneNumber(data.phone_number);
    const { password, passwordHash } = await this.issuePassword();
    const expiresAt = expiryFromNow(data.expires_in_hours);
    const role = await this.usersRepository.findOrCreateRole(data.role_type);

    const created = await this.usersRepository.createProvisionedUser({
      firstname,
      lastname,
      roleId: role.role_id,
      department: data.department?.trim() || null,
      phoneNumber,
      email,
      passwordHash,
      credentialExpiresAt: expiresAt,
      provisionedByUserId: caller.sub,
    });

    const scopeChanges = await this.applyScope(
      caller,
      created.user_id,
      data.role_type,
      data.permissions,
    );

    await this.auditLogRecorder.record({
      action: 'user.provisioned',
      description:
        `Created a ${data.role_type.toLowerCase()} account for ${firstname} ${lastname}`.trim(),
      category: 'USER_MANAGEMENT',
      // A new account with portal rights is the heaviest thing this screen creates —
      // it is reviewed on the same footing as handing out a restriction.
      severity: 'WARNING',
      actor: caller,
      targetType: 'user',
      targetLabel: email,
      targetId: created.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes: [
        { field: 'email', before: null, after: email },
        { field: 'role', before: null, after: data.role_type },
        {
          field: 'credential_expires_at',
          before: null,
          after: expiresAt.toISOString(),
        },
      ],
      metadata: {
        // Whether the address was typed from the request or minted by the server
        // changes what the entry means on review.
        email_source: data.mode,
        department: data.department?.trim() || 'none',
        granted: String(scopeChanges.granted),
        revoked: String(scopeChanges.revoked),
      },
    });

    return {
      user: await this.reload(created.user_id),
      credentials: { email, password, expires_at: expiresAt.toISOString() },
    };
  }

  /**
   * Replaces the credential on an account whose temporary one lapsed — or was never
   * collected. The email is left alone: it is the sign-in name the requester was
   * already given.
   */
  async reissueCredentials(
    caller: JwtPayload,
    userId: string,
    data: ReissueCredentialsDto,
    context: RequestContextDto = {},
  ): Promise<ProvisionedUserDto> {
    const target = await this.requireVisibleUser(caller, userId);

    if (target.user_id === caller.sub) {
      throw new BadRequestException(
        'You cannot re-issue credentials for your own account',
      );
    }

    const account = await this.usersRepository.findProvisionedAccount(userId);
    if (!account) {
      throw new NotFoundException('This user has no sign-in account');
    }

    const { password, passwordHash } = await this.issuePassword();
    const expiresAt = expiryFromNow(data.expires_in_hours);

    await this.usersRepository.replaceAccountCredential({
      accountId: account.account_id,
      passwordHash,
      credentialExpiresAt: expiresAt,
      provisionedByUserId: caller.sub,
    });

    await this.auditLogRecorder.record({
      action: 'user.credentials.reissued',
      description: `Issued new sign-in credentials for ${displayName(target)}`,
      category: 'USER_MANAGEMENT',
      severity: 'WARNING',
      actor: caller,
      targetType: 'user',
      targetLabel: account.email,
      targetId: target.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes: [
        {
          field: 'credential_expires_at',
          before: account.credential_expires_at?.toISOString() ?? null,
          after: expiresAt.toISOString(),
        },
      ],
      metadata: { role: target.role.type },
    });

    return {
      user: await this.reload(userId),
      credentials: {
        email: account.email,
        password,
        expires_at: expiresAt.toISOString(),
      },
    };
  }

  private async claimManualEmail(candidate?: string): Promise<string> {
    const email = candidate?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('An email address is required');
    }

    if (await this.usersRepository.findAccountByEmail(email)) {
      throw new BadRequestException(
        'An account with that email already exists',
      );
    }

    return email;
  }

  private async mintUnusedEmail(
    firstname: string,
    lastname: string,
  ): Promise<string> {
    const domain =
      this.configService.get<string>('PROVISIONED_EMAIL_DOMAIN')?.trim() ||
      DEFAULT_PROVISIONED_EMAIL_DOMAIN;

    for (let attempt = 0; attempt < EMAIL_GENERATION_ATTEMPTS; attempt += 1) {
      const email = generateTemporaryEmail(firstname, lastname, domain);
      if (!(await this.usersRepository.findAccountByEmail(email))) {
        return email;
      }
    }

    throw new BadRequestException(
      'Could not generate an unused email address — try again',
    );
  }

  /**
   * `User.phone_number` is unique and required. An account provisioned from an emailed
   * request usually has no phone behind it, so one is stubbed until the person fills
   * their own profile in.
   */
  private async claimPhoneNumber(candidate?: string): Promise<string> {
    const phone = candidate?.trim();
    if (!phone) {
      return generatePlaceholderPhone();
    }

    if (await this.usersRepository.findUserByPhone(phone)) {
      throw new BadRequestException(
        'Another account already uses that phone number',
      );
    }

    return phone;
  }

  /** Generated against the live policy, then re-checked through the same gate a typed password passes. */
  private async issuePassword(): Promise<{
    password: string;
    passwordHash: string;
  }> {
    const policy = await this.securityPolicyService.getPolicy();
    const password = generateTemporaryPassword(policy);

    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(password);

    return { password, passwordHash: await bcrypt.hash(password, 10) };
  }

  /**
   * Stores the departures from the role baseline, exactly as the access-control screen
   * does — an omitted selection leaves the account on its role's rights, so a later
   * baseline change still reaches it.
   */
  private async applyScope(
    caller: JwtPayload,
    userId: string,
    roleType: RoleType,
    permissions?: PermissionKey[],
  ): Promise<{ granted: number; revoked: number }> {
    if (!permissions) {
      return { granted: 0, revoked: 0 };
    }

    const stored =
      await this.accessControlRepository.findRoleDefaults(roleType);
    const baseline = new Set(
      stored.length === 0
        ? defaultPermissionsFor(roleType)
        : stored.map((row) => row.permission),
    );
    const desired = new Set(permissions);

    const overrides: OverrideInput[] = [];
    for (const entry of PERMISSION_CATALOG) {
      const inBaseline = baseline.has(entry.key);
      const wanted = desired.has(entry.key);

      if (wanted && !inBaseline) {
        overrides.push({
          permission: entry.key,
          effect: PermissionOverrideEffect.GRANT,
          reason: 'Scope set when the account was created',
        });
      } else if (!wanted && inBaseline) {
        overrides.push({
          permission: entry.key,
          effect: PermissionOverrideEffect.REVOKE,
          reason: 'Scope set when the account was created',
        });
      }
    }

    if (overrides.length > 0) {
      await this.accessControlRepository.replaceUserOverrides(
        userId,
        overrides,
        caller.sub,
      );
    }

    return {
      granted: overrides.filter(
        (override) => override.effect === PermissionOverrideEffect.GRANT,
      ).length,
      revoked: overrides.filter(
        (override) => override.effect === PermissionOverrideEffect.REVOKE,
      ).length,
    };
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

/** The name the trail shows for the account acted on, denormalised at write time. */
function displayName(row: ManagedUserRow): string {
  const name = `${row.firstname} ${row.lastname}`.trim();
  return name || (row.accounts[0]?.email ?? row.user_id);
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

function expiryFromNow(hours: number): Date {
  return new Date(Date.now() + hours * MS_PER_HOUR);
}

function toManagedUser(row: ManagedUserRow): ManagedUserDto {
  const hasPendingVerification =
    row.user_verifications[0]?.status === VerificationStatus.PENDING;
  const credentialExpiresAt = row.accounts[0]?.credential_expires_at ?? null;
  // A lapsed credential is reported ahead of a pending verification: it is the reason
  // the account cannot sign in, and the one an administrator can act on from here.
  const credentialExpired =
    credentialExpiresAt !== null && credentialExpiresAt.getTime() <= Date.now();

  return {
    user_id: row.user_id,
    firstname: row.firstname,
    lastname: row.lastname,
    email: row.accounts[0]?.email ?? '',
    role_type: row.role.type,
    department: row.portal_department,
    status: row.is_restricted
      ? 'restricted'
      : credentialExpired
        ? 'expired'
        : hasPendingVerification
          ? 'pending'
          : 'active',
    credential_expires_at: credentialExpiresAt?.toISOString() ?? null,
    restriction_reason: row.restriction_reason,
    last_login_ip: row.last_login_ip,
    blocked_ips: row.blocked_ips.map((blocked) => blocked.ip_address),
    created_at: row.createdAt.toISOString(),
  };
}
