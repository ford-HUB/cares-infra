import { Module } from '@nestjs/common';
import { EventsMobileModule } from '../../events/modules/events-mobile-module';
import { UserRequestsSiteController } from '../controllers/user-requests-site-controller';
import { UserRequestsRepository } from '../repositories/user-requests-repository';
import { UserRequestsSiteService } from '../services/user-requests-site-service';

/** Accepting an event-join request books the slot through the events service. */
@Module({
  imports: [EventsMobileModule],
  controllers: [UserRequestsSiteController],
  providers: [UserRequestsSiteService, UserRequestsRepository],
  exports: [UserRequestsSiteService],
})
export class UserRequestsSiteModule {}
