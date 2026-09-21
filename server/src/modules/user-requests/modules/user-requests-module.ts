import { Module } from '@nestjs/common';
import { UserRequestsMobileModule } from './user-requests-mobile-module';
import { UserRequestsSiteModule } from './user-requests-site-module';

/** Mobile files role-access and event-join requests; the portal rules on them. */
@Module({
  imports: [UserRequestsMobileModule, UserRequestsSiteModule],
})
export class UserRequestsModule {}
