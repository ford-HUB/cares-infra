import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

/** Job names on the cleanup queue — all of them are catalogued sweeps. */
export const CLEANUP_JOBS = {
  purgeSettledNotifications: 'purge-settled-notifications',
  purgeFinishedJobs: 'purge-finished-jobs',
} as const;

/**
 * Nightly housekeeping. Nothing enqueues onto this queue by hand; it exists so the
 * purges have their own worker and a failed purge cannot hold up a notification.
 */
@Injectable()
export class CleanupScheduler implements OnModuleInit {
  private readonly logger = new Logger(CleanupScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.cleanup)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.cleanup,
      this.recorder,
      this.logger,
    );
  }
}
