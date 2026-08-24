import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PermissionKey,
  PermissionOverrideEffect,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import {
  PERMISSION_CATALOG,
  PERMISSION_MODULES,
  defaultPermissionsFor,
} from '../../../shared/constants/permission-catalog';
import {
  PORTAL_ROLE_TYPES,
  type PortalRoleType,
} from '../../../shared/constants/portal-role-types';
import { isProtectedAdminEmail } from '../../../shared/constants/protected-admin';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type { AuditLogChangeDto } from '../../audit-logs/dto/audit-logs-site-dto';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type {
  AccessCatalogDto,
  AccessUserDetailDto,
  AccessUserDto,
  AccessUserListDto,
  ListAccessUsersQueryDto,
  RolePermissionsDto,
  SuspendActionsDto,
  UpdateRolePermissionsDto,
  UpdateUserPermissionsDto,
} from '../dto/access-control-site-dto';
import {
  AccessControlRepository,
  type AccessUserRow,
  type OverrideInput,
} from '../repositories/access-control-repository';

/** Catalog order, so every response lists permissions the same way the portal draws them. */
const PERMISSION_ORDER = new Map(
  PERMISSION_CATALOG.map((entry, index) => [entry.key, index]),
);

function sortPermissions(
  permissions: Iterable<PermissionKey>,
): PermissionKey[] {
  return [...permissions].sort(
    (a, b) => (PERMISSION_ORDER.get(a) ?? 0) - (PERMISSION_ORDER.get(b) ?? 0),
  );
}

@Injectable()
export class AccessControlSiteService {
  constructor(
    private readonly accessControlRepository: AccessControlRepository,
    private readonly configService: ConfigService,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  private isProtected(row: AccessUserRow): boolean {
    return isProtectedAdminEmail(row.accounts[0]?.email, this.configService);
  }

  async getCatalog(): Promise<AccessCatalogDto> {
    const stored = await this.accessControlRepository.findAllRoleDefaults();

    const byRole = new Map<RoleType, Set<PermissionKey>>();
    for (const row of stored) {
      const existing = byRole.get(row.role_type) ?? new Set<PermissionKey>();
      existing.add(row.permission);
      byRole.set(row.role_type, existing);
    }

    return {
      permissions: PERMISSION_CATALOG.map((entry) => ({ ...entry })),
      modules: [...PERMISSION_MODULES],
      roles: PORTAL_ROLE_TYPES.map((role) => ({
        role_type: role,
        permissions: sortPermissions(byRole.get(role) ?? []),
      })),
    };
  }

  async listUsers(query: ListAccessUsersQueryDto): Promise<AccessUserListDto> {
    const { rows, total } = await this.accessControlRepository.listUsers({
      search: query.search,
      role: query.role,
      rights: query.rights,
      skip: (query.page - 1) * query.page_size,
      take: query.page_size,
      portalRoles: PORTAL_ROLE_TYPES,
    });

    const baselines = await this.baselinesByRole();

    return {
      items: rows.map((row) =>
        toAccessUser(
          row,
          baselines.get(row.role.type) ?? [],
          this.isProtected(row),
        ),
      ),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getUserDetail(userId: string): Promise<AccessUserDetailDto> {
    const row = await this.requirePortalUser(userId);
    const baseline = await this.baselineFor(row.role.type);

    return toAccessUserDetail(row, baseline, this.isProtected(row));
  }

  /**
   * Takes the complete set of actions the user should end up with and stores only the
   * departures from the role baseline, so a later baseline change still reaches users
   * who were never customised.
   */
  async updateUserPermissions(
    caller: JwtPayload,
    userId: string,
    data: UpdateUserPermissionsDto,
    context: RequestContextDto = {},
  ): Promise<AccessUserDetailDto> {
    const row = await this.requirePortalUser(userId);

    if (row.user_id === caller.sub) {
      throw new BadRequestException('You cannot change your own rights');
    }

    const baseline = new Set(await this.baselineFor(row.role.type));
    const desired = new Set(data.permissions);
    const reason = data.reason?.trim() || null;

    const overrides: OverrideInput[] = [];
    for (const entry of PERMISSION_CATALOG) {
      const inBaseline = baseline.has(entry.key);
      const wanted = desired.has(entry.key);

      if (wanted && !inBaseline) {
        overrides.push({
          permission: entry.key,
          effect: PermissionOverrideEffect.GRANT,
          reason,
        });
      } else if (!wanted && inBaseline) {
        overrides.push({
          permission: entry.key,
          effect: PermissionOverrideEffect.REVOKE,
          reason,
        });
      }
    }

    // Read before writing, so the trail records the rights the user actually held
    // rather than the baseline the form happened to start from.
    const detail = await this.getUserDetail(userId);
    const changes = diffPermissions(detail.effective_permissions, [...desired]);

    await this.accessControlRepository.replaceUserOverrides(
      userId,
      overrides,
      caller.sub,
    );

    const updated = await this.getUserDetail(userId);

    await this.auditLogRecorder.record({
      action: 'access-control.user-permissions.updated',
      description: changes.length
        ? `Updated the rights of ${targetName(row)} (${changes.length} change${changes.length === 1 ? '' : 's'})`
        : `Saved the rights of ${targetName(row)} with no changes`,
      category: 'ACCESS_CONTROL',
      // Widening what an account may do is exactly what a review of the trail looks
      // for, so it stays above the ordinary INFO line even when it went through.
      severity: 'NOTICE',
      actor: caller,
      targetType: 'user',
      targetLabel: targetName(row),
      targetId: row.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason,
      changes,
      metadata: { role: row.role.type },
    });

    return updated;
  }

  async updateRolePermissions(
    caller: JwtPayload,
    roleType: PortalRoleType,
    data: UpdateRolePermissionsDto,
    context: RequestContextDto = {},
  ): Promise<RolePermissionsDto> {
    if (roleType === RoleType.ADMIN) {
      throw new BadRequestException(
        'The admin baseline is fixed — admins hold every right by definition',
      );
    }

    const previous = await this.baselineFor(roleType);
    const permissions = sortPermissions(new Set(data.permissions));

    await this.accessControlRepository.replaceRoleDefaults(
      roleType,
      permissions,
    );

    const changes = diffPermissions(previous, permissions);

    await this.auditLogRecorder.record({
      action: 'access-control.role-baseline.updated',
      description: changes.length
        ? `Updated the ${roleType} baseline (${changes.length} change${changes.length === 1 ? '' : 's'})`
        : `Saved the ${roleType} baseline with no changes`,
      category: 'ACCESS_CONTROL',
      // A baseline reaches every account holding the role, so it outranks a
      // single-user override.
      severity: 'WARNING',
      actor: caller,
      // The baseline is a role, not a record — it has no id to point at.
      targetType: 'role',
      targetLabel: `${roleType} baseline`,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes,
    });

    return { role_type: roleType, permissions };
  }

  async suspendActions(
    caller: JwtPayload,
    userId: string,
    data: SuspendActionsDto,
    context: RequestContextDto = {},
  ): Promise<AccessUserDetailDto> {
    const row = await this.requirePortalUser(userId);

    if (row.user_id === caller.sub) {
      throw new BadRequestException('You cannot suspend your own actions');
    }

    if (this.isProtected(row)) {
      throw new ForbiddenException(
        'The root administrator account cannot have its actions suspended',
      );
    }

    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('The expiry must be in the future');
    }

    const permissions = [...new Set(data.permissions)];

    await this.accessControlRepository.createSuspensions({
      userId,
      permissions,
      reason: data.reason,
      issuedByUserId: caller.sub,
      expiresAt,
    });

    await this.auditLogRecorder.record({
      action: 'access-control.actions.suspended',
      description: `Suspended ${permissions.length} action${permissions.length === 1 ? '' : 's'} for ${targetName(row)}`,
      category: 'ACCESS_CONTROL',
      severity: 'WARNING',
      actor: caller,
      targetType: 'user',
      targetLabel: targetName(row),
      targetId: row.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: data.reason,
      changes: permissions.map((permission) => ({
        field: permission,
        before: 'allowed',
        after: 'suspended',
      })),
      metadata: {
        // "never" rather than an omitted key: an open-ended suspension is the
        // heavier of the two, and it should be visible without reading the code.
        expires_at: expiresAt ? expiresAt.toISOString() : 'never',
      },
    });

    return this.getUserDetail(userId);
  }

  async liftSuspension(
    caller: JwtPayload,
    userId: string,
    suspensionId: string,
    context: RequestContextDto = {},
  ): Promise<AccessUserDetailDto> {
    const row = await this.requirePortalUser(userId);

    const suspension =
      await this.accessControlRepository.findSuspension(suspensionId);

    if (!suspension || suspension.user_id !== userId) {
      throw new NotFoundException('Suspension not found');
    }
    if (suspension.lifted_at) {
      throw new BadRequestException('That suspension has already been lifted');
    }

    await this.accessControlRepository.liftSuspension(suspensionId, caller.sub);

    await this.auditLogRecorder.record({
      action: 'access-control.suspension.lifted',
      description: `Lifted the suspension on ${suspension.permission} for ${targetName(row)}`,
      category: 'ACCESS_CONTROL',
      severity: 'NOTICE',
      actor: caller,
      targetType: 'user',
      targetLabel: targetName(row),
      targetId: row.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: suspension.reason,
      changes: [
        { field: suspension.permission, before: 'suspended', after: 'allowed' },
      ],
      metadata: { suspension_id: suspensionId },
    });

    return this.getUserDetail(userId);
  }

  /**
   * Stored baseline for a role, falling back to the catalog default when the role has
   * no rows yet — a database that predates the access-control seeder still behaves.
   */
  private async baselineFor(role: RoleType): Promise<readonly PermissionKey[]> {
    const stored = await this.accessControlRepository.findRoleDefaults(role);
    if (stored.length === 0) {
      return sortPermissions(defaultPermissionsFor(role));
    }
    return sortPermissions(stored.map((row) => row.permission));
  }

  private async baselinesByRole(): Promise<
    Map<RoleType, readonly PermissionKey[]>
  > {
    const stored = await this.accessControlRepository.findAllRoleDefaults();
    const baselines = new Map<RoleType, readonly PermissionKey[]>();

    for (const role of PORTAL_ROLE_TYPES) {
      const rows = stored.filter((row) => row.role_type === role);
      baselines.set(
        role,
        rows.length === 0
          ? sortPermissions(defaultPermissionsFor(role))
          : sortPermissions(rows.map((row) => row.permission)),
      );
    }

    return baselines;
  }

  private async requirePortalUser(userId: string): Promise<AccessUserRow> {
    const row = await this.accessControlRepository.findUser(userId);
    if (!row) {
      throw new NotFoundException('User not found');
    }
    if (!(PORTAL_ROLE_TYPES as readonly RoleType[]).includes(row.role.type)) {
      throw new BadRequestException(
        'Only portal accounts carry feature rights',
      );
    }
    return row;
  }
}

/** The name the trail shows for the account acted on, denormalised at write time. */
function targetName(row: AccessUserRow): string {
  const name = `${row.firstname} ${row.lastname}`.trim();
  return name || (row.accounts[0]?.email ?? row.user_id);
}

/**
 * One before/after pair per permission that moved, so the trail says which rights
 * changed rather than restating the whole set on both sides.
 */
function diffPermissions(
  previous: readonly PermissionKey[],
  next: readonly PermissionKey[],
): AuditLogChangeDto[] {
  const before = new Set(previous);
  const after = new Set(next);

  return PERMISSION_CATALOG.flatMap((entry) => {
    const had = before.has(entry.key);
    const has = after.has(entry.key);
    if (had === has) return [];

    return [
      {
        field: entry.key,
        before: had ? 'allowed' : 'denied',
        after: has ? 'allowed' : 'denied',
      },
    ];
  });
}

interface SuspensionView {
  suspension_id: string;
  permission: PermissionKey;
  reason: string;
  issued_by_user_id: string;
  issued_at: string;
  expires_at: string | null;
  lifted_at: string | null;
  active: boolean;
}

function toSuspensionViews(row: AccessUserRow, now: number): SuspensionView[] {
  return row.action_suspensions.map((suspension) => ({
    suspension_id: suspension.user_action_suspension_id,
    permission: suspension.permission,
    reason: suspension.reason,
    issued_by_user_id: suspension.issued_by_user_id,
    issued_at: suspension.createdAt.toISOString(),
    expires_at: suspension.expires_at?.toISOString() ?? null,
    lifted_at: suspension.lifted_at?.toISOString() ?? null,
    active:
      suspension.lifted_at === null &&
      (suspension.expires_at === null || suspension.expires_at.getTime() > now),
  }));
}

/** baseline + grants − revokes − active suspensions. */
function resolveEffective(
  row: AccessUserRow,
  baseline: readonly PermissionKey[],
  suspensions: SuspensionView[],
): {
  effective: PermissionKey[];
  granted: number;
  revoked: number;
} {
  const effective = new Set(baseline);
  let granted = 0;
  let revoked = 0;

  for (const override of row.permission_overrides) {
    if (override.effect === PermissionOverrideEffect.GRANT) {
      effective.add(override.permission);
      granted += 1;
    } else {
      effective.delete(override.permission);
      revoked += 1;
    }
  }

  for (const suspension of suspensions) {
    if (suspension.active) {
      effective.delete(suspension.permission);
    }
  }

  return { effective: sortPermissions(effective), granted, revoked };
}

function toAccessUser(
  row: AccessUserRow,
  baseline: readonly PermissionKey[],
  isProtected: boolean,
): AccessUserDto {
  const now = Date.now();
  const suspensions = toSuspensionViews(row, now);
  const active = suspensions.filter((suspension) => suspension.active);
  const { effective, granted, revoked } = resolveEffective(
    row,
    baseline,
    suspensions,
  );

  return {
    user_id: row.user_id,
    firstname: row.firstname,
    lastname: row.lastname,
    email: row.accounts[0]?.email ?? '',
    role_type: row.role.type,
    department: row.portal_department,
    is_restricted: row.is_restricted,
    is_protected: isProtected,
    effective_permissions: effective,
    granted_count: granted,
    revoked_count: revoked,
    suspended_count: active.length,
    latest_suspension_reason: active[0]?.reason ?? null,
  };
}

function toAccessUserDetail(
  row: AccessUserRow,
  baseline: readonly PermissionKey[],
  isProtected: boolean,
): AccessUserDetailDto {
  const now = Date.now();

  return {
    ...toAccessUser(row, baseline, isProtected),
    role_permissions: [...baseline],
    overrides: row.permission_overrides.map((override) => ({
      permission: override.permission,
      effect: override.effect,
      reason: override.reason,
      granted_by_user_id: override.granted_by_user_id,
      updated_at: override.updatedAt.toISOString(),
    })),
    suspensions: toSuspensionViews(row, now),
  };
}
