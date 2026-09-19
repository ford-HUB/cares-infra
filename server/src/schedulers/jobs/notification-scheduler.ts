import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { PublishNotificationInput } from '../../modules/notifications/dto/notifications-site-dto';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

/** Job names on the notification queue. Sweeps share their id with the catalogue. */
export const NOTIFICATION_JOBS = {
  publish: 'publish',
  eventStartReminders: 'event-start-reminders',
  reportDeadlineReminders: 'report-deadline-reminders',
  credentialExpiryAlerts: 'credential-expiry-alerts',
} as const;

/**
 * The write side of portal notifications. Features call `publish()` and get on with
 * their request; the fan-out to one row per recipient and the socket push happen on
 * the worker, so a notice addressed to every coordinator never slows the request
 * that raised it. The sweeps registered here are what generate the scheduled notices.
 */
@Injectable()
export class NotificationScheduler implements OnModuleInit {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.notification)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.notification,
      this.recorder,
      this.logger,
    );
  }

  /** Fire-and-forget: the row(s) exist once the worker has picked the job up. */
  async publish(input: PublishNotificationInput): Promise<void> {
    await this.queue.add(NOTIFICATION_JOBS.publish, input, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5 * 1000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    });
  }
}
