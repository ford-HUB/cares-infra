import { Module } from '@nestjs/common';
import { AuthMobileModule } from '../../auth/modules/auth-mobile-module';
import { UserRequestsMobileController } from '../controllers/user-requests-mobile-controller';
import { UserRequestsRepository } from '../repositories/user-requests-repository';
import { UserRequestsMobileService } from '../services/user-requests-mobile-service';

/** Needs the auth service to read the registration session a role request is backed by. */
@Module({
  imports: [AuthMobileModule],
  controllers: [UserRequestsMobileController],
  providers: [UserRequestsMobileService, UserRequestsRepository],
  exports: [UserRequestsMobileService],
})
export class UserRequestsMobileModule {}
