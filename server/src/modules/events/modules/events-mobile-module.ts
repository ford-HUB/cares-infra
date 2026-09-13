import { Module } from '@nestjs/common';
import { InterestsMobileModule } from '../../interests/modules/interests-mobile-module';
import { EventsMobileController } from '../controllers/events-mobile-controller';
import { EventsRepository } from '../repositories/events-repository';
import { EventsMobileService } from '../services/events-mobile-service';

@Module({
  imports: [InterestsMobileModule],
  controllers: [EventsMobileController],
  providers: [EventsMobileService, EventsRepository],
  exports: [EventsMobileService],
})
export class EventsMobileModule {}
