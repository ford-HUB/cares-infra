import { Module } from '@nestjs/common';
import { UserRequestsSiteController } from '../controllers/user-requests-site-controller';
import { UserRequestsRepository } from '../repositories/user-requests-repository';
import { UserRequestsSiteService } from '../services/user-requests-site-service';

/** Director-side review; accepting an event-join marks the request, never the attendance table. */
@Module({
  controllers: [UserRequestsSiteController],
  providers: [UserRequestsSiteService, UserRequestsRepository],
  exports: [UserRequestsSiteService],
})
export class UserRequestsSiteModule {}
