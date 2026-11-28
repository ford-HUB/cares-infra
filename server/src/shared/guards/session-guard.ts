import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionRecord } from 'src/modules/sessions/services/session-registry';
import { SessionRegistry } from 'src/modules/sessions/services/session-registry';
import { SecurityPolicyService } from 'src/modules/security-policy/services/security-policy-service';
import { AccessControlSiteService } from 'src/modules/access-control/services/access-control-site-service';
import { PermissionKey } from '../../infastructures/prisma/common/client';
import { isStaffVolunteerRole } from '../constants/mobile-role-types';
import { IS_PUBLIC_KEY } from '../decorators/public-decorator';
import { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Accepts a JWT only while its session record exists, so revocation is immediate.
 * Runs after `JwtAuthGuard`. Enforces the policy's idle/lifetime limits against the record,
 * since the policy can change after minting.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionRegistry: SessionRegistry,
    private readonly securityPolicyService: SecurityPolicyService,
    private readonly accessControlSiteService: AccessControlSiteService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Pre-session tokens have no `sid` and can't be revoked, so they're refused.
    if (!user.sid) {
      throw new UnauthorizedException('Session ended — please sign in again');
    }

    const session = await this.sessionRegistry.find(user.sid);
    if (!session) {
      throw new UnauthorizedException('Session ended — please sign in again');
    }

    await this.assertWithinPolicyLimits(session);
    await this.assertMobileAccessHeld(session);

    await this.sessionRegistry.touch(session);
    return true;
  }

  /** Staff app sessions need "Use the mobile app"; revoking it ends them on the next request. */
  private async assertMobileAccessHeld(session: SessionRecord): Promise<void> {
    if (
      session.source !== 'MOBILE' ||
      !isStaffVolunteerRole(session.role_type)
    ) {
      return;
    }

    const held = await this.accessControlSiteService.effectivePermissionsFor(
      session.user_id,
    );
    if (!held.includes(PermissionKey.MOBILE_APP_ACCESS)) {
      await this.sessionRegistry.revoke(session.session_id);
      throw new UnauthorizedException(
        'Mobile app access was turned off for this account — ask an administrator',
      );
    }
  }

  /** Revokes the session, not just the request. 0 defers to token expiry. */
  private async assertWithinPolicyLimits(
    session: SessionRecord,
  ): Promise<void> {
    const policy = await this.securityPolicyService.getPolicy();
    const now = Date.now();

    const idleLimit = policy.session_idle_timeout_minutes;
    if (
      idleLimit > 0 &&
      now - new Date(session.last_seen_at).getTime() > idleLimit * 60 * 1000
    ) {
      await this.sessionRegistry.revoke(session.session_id);
      throw new UnauthorizedException(
        'Signed out after a period of inactivity — please sign in again',
      );
    }

    const maxDuration = policy.session_max_duration_hours;
    if (
      maxDuration > 0 &&
      now - new Date(session.created_at).getTime() > maxDuration * 3600 * 1000
    ) {
      await this.sessionRegistry.revoke(session.session_id);
      throw new UnauthorizedException(
        'This session has reached its maximum length — please sign in again',
      );
    }
  }
}
