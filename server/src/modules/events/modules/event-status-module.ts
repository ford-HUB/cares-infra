import { Module } from '@nestjs/common';
import { EventsRepository } from '../repositories/events-repository';
import { EventStatusService } from '../services/event-status-service';

/** The status sweep alone — imported by the schedulers, no controller. */
@Module({
  providers: [EventStatusService, EventsRepository],
  exports: [EventStatusService],
})
export class EventStatusModule {}
