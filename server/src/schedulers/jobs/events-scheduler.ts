import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

export const EVENTS_JOBS = {
  advanceEventStatus: 'advance-event-status',
} as const;

/** Advances status through Ongoing and Completed after the save sets it once. */
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
