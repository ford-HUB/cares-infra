import { Module } from '@nestjs/common';
import { EventsRepository } from '../repositories/events-repository';
import { EventStatusService } from '../services/event-status-service';

@Module({
  providers: [EventStatusService, EventsRepository],
  exports: [EventStatusService],
})
export class EventStatusModule {}
