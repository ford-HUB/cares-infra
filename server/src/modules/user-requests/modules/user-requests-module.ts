import { Module } from '@nestjs/common';
import { UserRequestsMobileModule } from './user-requests-mobile-module';
import { UserRequestsSiteModule } from './user-requests-site-module';

@Module({
  imports: [UserRequestsMobileModule, UserRequestsSiteModule],
})
export class UserRequestsModule {}
