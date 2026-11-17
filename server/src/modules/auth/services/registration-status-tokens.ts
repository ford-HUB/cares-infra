import { Injectable } from '@nestjs/common';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { portalUrl } from 'src/shared/utils/environment-utils';

const AUDIENCE = 'registration-status';

/**
 * Signs the "Check status" link mailed after a reviewed sign-up. The token names
 * only the review request, so the public status page can show that one request
 * without the registrant signing in — they cannot sign in until it is approved.
 * It lasts long enough to outlive any review queue.
 */
@Injectable()
export class RegistrationStatusTokens {
  constructor(private readonly jwtService: JwtService) {}

  sign(userRequestId: string): string {
    return this.jwtService.signScoped(userRequestId, AUDIENCE, '180d');
  }

  /** The review request the token names, or null when it is invalid or expired. */
  verify(token: string): string | null {
    return this.jwtService.verifyScoped(token, AUDIENCE);
  }

  /** The public page on the site that shows the request's status. */
  statusUrl(userRequestId: string): string {
    return `${portalUrl()}/registration-status?token=${encodeURIComponent(
      this.sign(userRequestId),
    )}`;
  }
}
