import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

/** Job names on the events queue — one catalogued sweep. */
export const EVENTS_JOBS = {
  advanceEventStatus: 'advance-event-status',
} as const;

/**
 * Event lifecycle on its own queue. Status is derived once when staff save an
 * event; this sweep is what carries it through Ongoing and Completed afterwards.
 */
@Injectable()
export class EventsScheduler implements OnModuleInit {
  private readonly logger = new Logger(EventsScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.events)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.events,
      this.recorder,
      this.logger,
    );
  }
}
