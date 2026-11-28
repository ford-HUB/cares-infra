import { Module } from '@nestjs/common';
import { PassportModule as NestPassportModule } from '@nestjs/passport';
import { DonorOAuthGuard } from './guards/donor-oauth-guard';
import { GmailOAuthGuard } from './guards/gmail-oauth-guard';
import { FacebookIdentityStrategy } from './strategies/facebook-identity-strategy';
import { GmailStrategy } from './strategies/gmail-strategy';
import { GoogleIdentityStrategy } from './strategies/google-identity-strategy';

/** `GmailStrategy` only links a mailbox; identity strategies authenticate donors. Stateless (own JWT). */
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
