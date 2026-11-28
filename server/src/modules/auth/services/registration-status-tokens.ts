import { Injectable } from '@nestjs/common';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { portalUrl } from 'src/shared/utils/environment-utils';

const AUDIENCE = 'registration-status';

/** Signs the "Check status" link; names only the review request, outlasting any queue. */
@Injectable()
export class RegistrationStatusTokens {
  constructor(private readonly jwtService: JwtService) {}

  sign(userRequestId: string): string {
    return this.jwtService.signScoped(userRequestId, AUDIENCE, '180d');
  }

  /** Null when invalid or expired. */
  verify(token: string): string | null {
    return this.jwtService.verifyScoped(token, AUDIENCE);
  }

  statusUrl(userRequestId: string): string {
    return `${portalUrl()}/registration-status?token=${encodeURIComponent(
      this.sign(userRequestId),
    )}`;
  }
}
