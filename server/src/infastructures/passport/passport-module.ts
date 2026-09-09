import { Module } from '@nestjs/common';
import { PassportModule as NestPassportModule } from '@nestjs/passport';
import { DonorOAuthGuard } from './guards/donor-oauth-guard';
import { GmailOAuthGuard } from './guards/gmail-oauth-guard';
import { FacebookIdentityStrategy } from './strategies/facebook-identity-strategy';
import { GmailStrategy } from './strategies/gmail-strategy';
import { GoogleIdentityStrategy } from './strategies/google-identity-strategy';

/**
 * Every third-party strategy, in two kinds. `GmailStrategy` *links* a mailbox and grants
 * no access on its own; the identity strategies *authenticate* — a donor who passes one
 * gets a CARES session. Sessions stay off: CARES is stateless and issues its own JWT.
 */
@Module({
  imports: [NestPassportModule.register({ session: false })],
  providers: [
    GmailStrategy,
    GmailOAuthGuard,
    GoogleIdentityStrategy,
    FacebookIdentityStrategy,
    DonorOAuthGuard,
  ],
  exports: [
    NestPassportModule,
    GmailStrategy,
    GmailOAuthGuard,
    GoogleIdentityStrategy,
    FacebookIdentityStrategy,
    DonorOAuthGuard,
  ],
})
export class PassportModule {}
