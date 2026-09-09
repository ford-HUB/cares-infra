import { Module } from '@nestjs/common';
import { AuthDonorModule } from './auth-donor-module';
import { AuthMobileModule } from './auth-mobile-module';
import { AuthSiteModule } from './auth-site-module';

@Module({
  imports: [AuthMobileModule, AuthDonorModule, AuthSiteModule],
})
export class AuthModule {}
