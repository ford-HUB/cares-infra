import { RoleType } from '../../infastructures/prisma/common/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role_type: RoleType;
  /**
   * Identifies the signed-in device, so a token can be revoked without rotating the
   * signing secret. Optional on the type because tokens issued before sessions
   * existed carry no `sid`; `SessionGuard` rejects those on the next request.
   */
  sid?: string;
}
