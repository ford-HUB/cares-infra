import { Injectable } from '@nestjs/common';
import { EventsRepository } from '../repositories/events-repository';

export interface EventStatusSweepSummary {
  ongoing: number;
  completed: number;
}

/**
 * Keeps `Event.status` in step with the clock. Create and edit derive the status
 * once; this sweep is what moves it afterwards, so the portal, the mobile feed and
 * the registration guard all agree on which events have started or finished.
 */
@Injectable()
export class EventStatusService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async sweep(now = new Date()): Promise<EventStatusSweepSummary> {
    return this.eventsRepository.advanceStatuses(now);
  }
}
