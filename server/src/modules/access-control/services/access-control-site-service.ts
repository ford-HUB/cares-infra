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
import type { JwtPayload } from 'src/shared/types/jwt-payload';
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

    await this.accessControlRepository.replaceUserOverrides(
      userId,
      overrides,
      caller.sub,
    );

    return this.getUserDetail(userId);
  }

  async updateRolePermissions(
    caller: JwtPayload,
    roleType: PortalRoleType,
    data: UpdateRolePermissionsDto,
  ): Promise<RolePermissionsDto> {
    if (roleType === RoleType.ADMIN) {
      throw new BadRequestException(
        'The admin baseline is fixed — admins hold every right by definition',
      );
    }

    const permissions = sortPermissions(new Set(data.permissions));
    await this.accessControlRepository.replaceRoleDefaults(
      roleType,
      permissions,
    );

    return { role_type: roleType, permissions };
  }

  async suspendActions(
    caller: JwtPayload,
    userId: string,
    data: SuspendActionsDto,
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

    await this.accessControlRepository.createSuspensions({
      userId,
      permissions: [...new Set(data.permissions)],
      reason: data.reason,
      issuedByUserId: caller.sub,
      expiresAt,
    });

    return this.getUserDetail(userId);
  }

  async liftSuspension(
    caller: JwtPayload,
    userId: string,
    suspensionId: string,
  ): Promise<AccessUserDetailDto> {
    await this.requirePortalUser(userId);

    const suspension =
      await this.accessControlRepository.findSuspension(suspensionId);

    if (!suspension || suspension.user_id !== userId) {
      throw new NotFoundException('Suspension not found');
    }
    if (suspension.lifted_at) {
      throw new BadRequestException('That suspension has already been lifted');
    }

    await this.accessControlRepository.liftSuspension(suspensionId, caller.sub);
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
