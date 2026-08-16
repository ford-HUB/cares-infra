import { Module } from '@nestjs/common';
import { AuthMobileModule } from './auth-mobile-module';
import { AuthSiteModule } from './auth-site-module';

@Module({
  imports: [AuthMobileModule, AuthSiteModule],
})
export class AuthModule {}
