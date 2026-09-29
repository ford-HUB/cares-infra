import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionKey } from '../../infastructures/prisma/common/client';
import { AccessControlSiteService } from '../../modules/access-control/services/access-control-site-service';
import { PERMISSION_CATALOG } from '../constants/permission-catalog';
import { PERMISSIONS_KEY } from '../decorators/require-permission-decorator';
import { AuthenticatedRequest } from '../types/authenticated-request';

const LABELS = new Map(PERMISSION_CATALOG.map((entry) => [entry.key, entry]));

/**
 * Runs after `RolesGuard`: the role says which portal a person belongs to, the
 * rights say what they may do in it. A route with no `@RequirePermission` is left
 * to the role check alone.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlSiteService: AccessControlSiteService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const held = new Set(
      await this.accessControlSiteService.effectivePermissionsFor(user.sub),
    );
    const missing = required.filter((permission) => !held.has(permission));

    if (missing.length > 0) {
      const entry = LABELS.get(missing[0]);
      throw new ForbiddenException(
        entry
          ? `This needs the "${entry.label}" right under ${entry.module}`
          : 'Insufficient permissions',
      );
    }

    return true;
  }
}
