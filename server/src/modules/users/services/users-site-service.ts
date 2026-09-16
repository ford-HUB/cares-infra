import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { promises as dns } from 'dns';
import { z } from 'zod';
import {
  NotificationCategory,
  NotificationTone,
  PermissionKey,
  PermissionOverrideEffect,
  RoleType,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import { NodemailerService } from '../../../infastructures/nodemailer/nodemailer-service';
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
import { TemplateUtils } from '../../../shared/utils/templete-utils';
import { NotificationScheduler } from '../../../schedulers/jobs/notification.scheduler';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { AccessControlRepository } from '../../access-control/repositories/access-control-repository';
import type { OverrideInput } from '../../access-control/repositories/access-control-repository';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import { LoginPolicyEnforcer } from '../../security-policy/services/login-policy-enforcer';
import { SecurityPolicyService } from '../../security-policy/services/security-policy-service';
import { SessionRegistry } from '../../sessions/services/session-registry';
import type {
  BlockUserIpDto,
  ListUsersQueryDto,
  ManagedUserDto,
  ManagedUserDetailDto,
  ManagedUserListDto,
  ProvisionEmailCheckDto,
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

/** Where a restricted user is told to appeal; the same inbox that reads access requests. */
const DEFAULT_SUPPORT_EMAIL = 'careeesadmin@gmail.com';

/** Where the credential mail's sign-in button points when SITE_URL is unset. */
const DEFAULT_PORTAL_URL = 'http://localhost:5173';

/**
 * Provisioned accounts are minted under a domain nothing is delivered to (see
 * `DEFAULT_PROVISIONED_EMAIL_DOMAIN`); mailing them would only bounce.
 */
const UNDELIVERABLE_EMAIL_DOMAINS = new Set([DEFAULT_PROVISIONED_EMAIL_DOMAIN]);

/**
 * An admin sees every account; a director sees everyone except other admins; a
 * coordinator granted "View accounts" sees the app-side roles and other
 * coordinators — never the people above them.
 */
const VISIBLE_ROLES: Record<string, readonly RoleType[]> = {
  [RoleType.ADMIN]: Object.values(RoleType),
  [RoleType.DIRECTOR]: Object.values(RoleType).filter(
    (role) => role !== RoleType.ADMIN,
  ),
  [RoleType.COORDINATOR]: Object.values(RoleType).filter(
    (role) => role !== RoleType.ADMIN && role !== RoleType.DIRECTOR,
  ),
};

@Injectable()
export class UsersSiteService {
  private readonly logger = new Logger(UsersSiteService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly s3Service: S3Service,
    private readonly auditLogRecorder: AuditLogRecorder,
    private readonly accessControlRepository: AccessControlRepository,
    private readonly securityPolicyService: SecurityPolicyService,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
    private readonly configService: ConfigService,
    private readonly sessionRegistry: SessionRegistry,
    private readonly nodemailerService: NodemailerService,
    private readonly notificationScheduler: NotificationScheduler,
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

    const storedUrl =
      kind === 'avatar' ? user.avatar : user.accounts[0]?.signature_url;
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

    const restrictedAt = new Date();
    await this.usersRepository.setRestriction(userId, true, data.reason);

    // The login check only stops the *next* sign-in. Anything already signed in — on
    // the portal or the app — holds a token `SessionGuard` will keep honouring until
    // its record is gone, so every live session is ended here, in the same request.
    const revoked = await this.sessionRegistry.revokeAllForUser(userId);

    const email = target.accounts[0]?.email ?? null;
    const notified = await this.sendRestrictionNotice(
      target,
      email,
      data.reason,
      restrictedAt,
      caller,
    );

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
      metadata: {
        role: target.role.type,
        sessions_revoked: String(revoked),
        // Whether the person was actually told — a bounce or an undeliverable
        // address is what an operator wants to know when the user says "nobody
        // told me".
        notified: String(notified),
      },
    });

    return this.reload(userId);
  }

  /**
   * Mails the person the reason they were restricted. Best-effort: the restriction
   * and the sign-out already happened, and a mail failure must not roll them back or
   * turn the action into an error. Returns whether the notice was delivered to SMTP.
   */
  private async sendRestrictionNotice(
    target: ManagedUserRow,
    email: string | null,
    reason: string,
    restrictedAt: Date,
    caller: JwtPayload,
  ): Promise<boolean> {
    if (!email || !isDeliverableEmail(email)) {
      return false;
    }

    const supportEmail =
      this.configService.get<string>('ACCESS_REQUEST_EMAIL')?.trim() ||
      DEFAULT_SUPPORT_EMAIL;

    try {
      const html = await TemplateUtils.compileTemplate(
        'account-restricted.html',
        {
          username: `${target.firstname} ${target.lastname}`.trim() || email,
          email,
          reason,
          restrictedAt: formatNoticeDate(restrictedAt),
          restrictedBy: `A CARES ${caller.role_type.toLowerCase()}`,
          supportEmail,
        },
      );

      await this.nodemailerService.sendEmail(
        email,
        'Your CARES account has been restricted',
        html,
        { replyTo: supportEmail },
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to send the restriction notice to ${email} for user ${target.user_id}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
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
      reason: target.accounts[0]?.restriction_reason ?? null,
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
    const ipAddress = data.ip_address ?? target.accounts[0]?.last_login_ip;

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

    // Every admin hears about a block, not just the one who placed it — a second
    // pair of eyes on the address is the point of surfacing it.
    await this.notificationScheduler.publish({
      title: `${ipAddress} blocked for ${displayName(target)}`,
      description: `${data.reason?.trim() || 'No reason given.'} Sign-ins from this address are refused until it is unblocked.`,
      category: NotificationCategory.SECURITY,
      tone: NotificationTone.ATTENTION,
      href: '/admin/login-activity',
      roles: [RoleType.ADMIN],
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

    const recipientEmail = data.recipient_email.trim().toLowerCase();
    const emailCheck = await this.checkRecipientEmail(recipientEmail);
    if (!emailCheck.valid) {
      throw new BadRequestException(
        emailCheck.reason ?? 'The recipient email address is not valid',
      );
    }

    // The form no longer asks for a name — the inbox the credential goes to is the
    // best stand-in until the person completes their own profile.
    const { firstname, lastname } = nameFromEmail(recipientEmail);
    const email =
      data.mode === 'manual'
        ? await this.claimManualEmail(data.email)
        : await this.mintUnusedEmail(firstname, lastname);

    const { password, passwordHash } = await this.issuePassword();
    const expiresAt = expiryFromNow(data.expires_in_hours);
    const role = await this.usersRepository.findOrCreateRole(data.role_type);
    const department = data.department?.trim() || null;

    const created = await this.usersRepository.createProvisionedUser({
      firstname,
      lastname,
      roleId: role.role_id,
      department,
      // `User.phone_number` is unique and required; nobody's real number is known here.
      phoneNumber: generatePlaceholderPhone(),
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

    const sent = await this.sendCredentialsMail({
      recipientEmail,
      signInEmail: email,
      password,
      roleType: data.role_type,
      department,
      expiresAt,
      expiresInHours: data.expires_in_hours,
    });

    await this.auditLogRecorder.record({
      action: 'user.provisioned',
      description: `Created a ${data.role_type.toLowerCase()} account for ${recipientEmail}`,
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
        department: department ?? 'none',
        recipient_email: recipientEmail,
        credentials_mailed: String(sent),
        granted: String(scopeChanges.granted),
        revoked: String(scopeChanges.revoked),
      },
    });

    await this.notificationScheduler.publish({
      title: `${data.role_type.toLowerCase()} account issued to ${recipientEmail}`,
      description: `Signs in as ${email}${department ? ` · ${department}` : ''}. Credentials ${
        sent ? 'were emailed and' : 'were NOT emailed —'
      } expire ${formatNoticeDate(expiresAt)}.`,
      category: NotificationCategory.USER_REQUEST,
      tone: sent ? NotificationTone.INFO : NotificationTone.ATTENTION,
      href: '/admin/manage-users',
      roles: [RoleType.ADMIN],
      dedupeKey: `user-provisioned:${created.user_id}`,
    });

    return {
      user: await this.reload(created.user_id),
      credentials: { email, password, expires_at: expiresAt.toISOString() },
      delivery: { recipient: recipientEmail, sent },
    };
  }

  /**
   * The pre-check behind the add-user form's recipient field, and the gate `provisionUser`
   * re-runs before it writes anything. Shape first, then a domain that can actually
   * receive mail (an MX or A record), then no account already on the address.
   */
  async checkRecipientEmail(
    candidate: string,
  ): Promise<ProvisionEmailCheckDto> {
    const email = candidate.trim().toLowerCase();
    const reject = (reason: string): ProvisionEmailCheckDto => ({
      email,
      valid: false,
      reason,
    });

    if (!z.email().safeParse(email).success) {
      return reject('Enter a valid email address, e.g. name@uclm.edu.ph');
    }

    if (!isDeliverableEmail(email)) {
      return reject('That domain cannot receive email');
    }

    const domain = email.split('@')[1];
    if (!(await domainAcceptsMail(domain))) {
      return reject(`No mail server was found for ${domain}`);
    }

    if (await this.usersRepository.findAccountByEmail(email)) {
      return reject('An account already uses that email address');
    }

    return { email, valid: true, reason: null };
  }

  /**
   * Mails the issued credential to the inbox the administrator named. Best-effort:
   * the account exists by now, and the dialog shows the same credential, so a mail
   * failure is reported back rather than turning the creation into an error.
   */
  private async sendCredentialsMail(input: {
    recipientEmail: string;
    signInEmail: string;
    password: string;
    roleType: RoleType;
    department: string | null;
    expiresAt: Date;
    expiresInHours: number;
  }): Promise<boolean> {
    const supportEmail =
      this.configService.get<string>('ACCESS_REQUEST_EMAIL')?.trim() ||
      DEFAULT_SUPPORT_EMAIL;
    const portalUrl =
      this.configService.get<string>('SITE_URL')?.trim() || DEFAULT_PORTAL_URL;

    try {
      const html = await TemplateUtils.compileTemplate(
        'temporary-account-credentials.html',
        {
          recipientEmail: input.recipientEmail,
          signInEmail: input.signInEmail,
          password: input.password,
          role: input.roleType.toLowerCase(),
          department: input.department,
          expiresAt: formatNoticeDate(input.expiresAt),
          expiresInHours: input.expiresInHours,
          portalUrl,
          supportEmail,
        },
      );

      await this.nodemailerService.sendEmail(
        input.recipientEmail,
        'Your temporary CARES portal account',
        html,
        { replyTo: supportEmail },
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to mail the issued credentials for ${input.signInEmail} to ${input.recipientEmail}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
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
      // A re-issue is read out by the administrator; nothing is mailed.
      delivery: null,
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

function isDeliverableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return Boolean(domain) && !UNDELIVERABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Whether anything answers for the domain — an MX record, or failing that an A/AAAA
 * record, which SMTP falls back to. A lookup error (no such domain, DNS unreachable)
 * counts as "no": the point is to catch a typo before a credential is mailed into it.
 */
async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return true;
  } catch {
    // Fall through to the address lookup.
  }

  try {
    const addresses = await dns.lookup(domain, { all: true });
    return addresses.length > 0;
  } catch {
    return false;
  }
}

/**
 * A placeholder name from the recipient address, e.g. `jay.delacruz@…` → Jay Delacruz.
 * `User.firstname`/`lastname` are required columns, and the form deliberately stops
 * asking for them — the person corrects this the first time they open their profile.
 */
function nameFromEmail(email: string): { firstname: string; lastname: string } {
  const capitalise = (part: string) =>
    part ? part[0].toUpperCase() + part.slice(1) : part;
  const [first = '', ...rest] = email
    .split('@')[0]
    .split(/[._\-+]+/)
    .map((part) => part.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean);

  return {
    firstname: capitalise(first) || 'New',
    lastname: rest.map(capitalise).join(' ') || 'User',
  };
}

/** e.g. "10 September 2026, 14:05 (Asia/Manila)" — a person reads this, not a parser. */
function formatNoticeDate(date: Date): string {
  const timeZone = process.env.TZ || 'Asia/Manila';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
  return `${formatted} (${timeZone})`;
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
    has_signature: Boolean(row.accounts[0]?.signature_url),
    restricted_at: row.accounts[0]?.restricted_at?.toISOString() ?? null,
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
    row.user_verifications[0]?.status === VerificationStatus.N;
  const account = row.accounts[0];
  const credentialExpiresAt = account?.credential_expires_at ?? null;
  // A lapsed credential is reported ahead of a pending verification: it is the reason
  // the account cannot sign in, and the one an administrator can act on from here.
  const credentialExpired =
    credentialExpiresAt !== null && credentialExpiresAt.getTime() <= Date.now();

  return {
    user_id: row.user_id,
    firstname: row.firstname,
    lastname: row.lastname,
    email: account?.email ?? '',
    role_type: row.role.type,
    department: row.portal_department,
    status: account?.is_restricted
      ? 'restricted'
      : credentialExpired
        ? 'expired'
        : hasPendingVerification
          ? 'pending'
          : 'active',
    credential_expires_at: credentialExpiresAt?.toISOString() ?? null,
    restriction_reason: account?.restriction_reason ?? null,
    last_login_ip: account?.last_login_ip ?? null,
    blocked_ips: row.blocked_ips.map((blocked) => blocked.ip_address),
    created_at: row.createdAt.toISOString(),
  };
}
