import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events-repository';

export interface EventStatusSweepSummary {
  ongoing: number;
  completed: number;
}

/** Moves `Event.status` with the clock after create/edit set it once. */
@Injectable()
export class EventStatusService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async sweep(now = new Date()): Promise<EventStatusSweepSummary> {
    return this.eventsRepository.advanceStatuses(now);
  }
}
