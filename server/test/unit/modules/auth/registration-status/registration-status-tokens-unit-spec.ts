import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '../../../../../src/infastructures/jwt/jwt-service';
import { RegistrationStatusTokens } from '../../../../../src/modules/auth/services/registration-status-tokens';

const SECRET = 'test-secret-for-registration-status';

function makeJwt(): JwtService {
  const config = {
    get: (key: string) => ({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: '7d' })[key],
  } as unknown as ConfigService;
  return new JwtService(config);
}

describe('RegistrationStatusTokens', () => {
  const jwt = makeJwt();
  const tokens = new RegistrationStatusTokens(jwt);

  it('round-trips the review request id', () => {
    expect(tokens.verify(tokens.sign('request-123'))).toBe('request-123');
  });

  it('refuses a tampered or foreign token', () => {
    const token = tokens.sign('request-123');
    expect(tokens.verify(`${token}x`)).toBeNull();
    expect(tokens.verify('not-a-token')).toBeNull();
  });

  it('refuses a session token as a status link', () => {
    const session = jwt.sign({
      sub: 'user-1',
      email: 'a@b.c',
      role_type: 'BENEFICIARY',
    });
    expect(tokens.verify(session)).toBeNull();
  });

  it('can never be used as a session token', () => {
    const status = tokens.sign('request-123');
    expect(() => jwt.verify(status)).toThrow(UnauthorizedException);
  });

  it('links to the public status page with the token', () => {
    process.env.SITE_URL = 'https://portal.example.test/';
    const url = new URL(tokens.statusUrl('request-123'));
    expect(url.origin + url.pathname).toBe(
      'https://portal.example.test/registration-status',
    );
    expect(tokens.verify(url.searchParams.get('token') ?? '')).toBe(
      'request-123',
    );
    delete process.env.SITE_URL;
  });
});
