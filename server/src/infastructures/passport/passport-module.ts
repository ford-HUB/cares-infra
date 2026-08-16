import { Module } from '@nestjs/common';
import { PassportModule as NestPassportModule } from '@nestjs/passport';
import { GmailOAuthGuard } from './guards/gmail-oauth-guard';
import { GmailStrategy } from './strategies/gmail-strategy';

/**
 * OAuth strategies for linking third-party accounts. Sessions stay off — CARES is
 * stateless and authenticates its own users with the JWT infrastructure.
 */
@Module({
  imports: [NestPassportModule.register({ session: false })],
  providers: [GmailStrategy, GmailOAuthGuard],
  exports: [NestPassportModule, GmailStrategy, GmailOAuthGuard],
})
export class PassportModule {}
