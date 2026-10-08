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
 * Turns the stateless token into a revocable one: the JWT is only accepted while its
 * session record still exists, so revoking a device — or signing out — ends access on
 * the very next request instead of at token expiry.
 *
 * Runs after `JwtAuthGuard`, which is what puts `request.user` in place.
 *
 * It is also where the security policy's session limits land: a session that has sat
 * idle too long, or has simply been open too long, is revoked here on its next use.
 * Both are checked against the record rather than the token, because the policy can
 * change after a token was minted.
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

    // Tokens minted before sessions existed carry no `sid`. They cannot be revoked,
    // so they are refused and the holder signs in again once.
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

  /**
   * A director or coordinator signed in to the app keeps that session only while they
   * hold "Use the mobile app" — an admin revoking it in Access Control signs them out
   * of the app on its next request rather than when the token expires. Their portal
   * sessions are untouched.
   */
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

  /**
   * Ends the session — not just this request — when it falls outside the policy's
   * idle or lifetime limits, so the holder has to sign in again rather than being
   * refused one call at a time. Either limit set to 0 leaves it to the token's expiry.
   */
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
