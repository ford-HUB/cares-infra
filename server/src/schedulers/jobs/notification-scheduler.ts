import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RoleType } from '../../infastructures/prisma/common/client';
import type { PublishNotificationInput } from '../../modules/notifications/dto/notifications-site-dto';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';
import { SchedulerRepository } from '../scheduler-repository';

/** The group decides the audience role. */
type EventNotice = Omit<
  PublishNotificationInput,
  'roles' | 'userIds' | 'audienceRole'
>;

export interface EventParticipantNotices {
  volunteers?: EventNotice;
  beneficiaries?: EventNotice;
  donors?: EventNotice;
}

/** Sweeps share their id with the catalogue. */
export const NOTIFICATION_JOBS = {
  publish: 'publish',
  eventStartReminders: 'event-start-reminders',
  reportDeadlineReminders: 'report-deadline-reminders',
  credentialExpiryAlerts: 'credential-expiry-alerts',
} as const;

/** `publish()` returns at once; fan-out and socket push run on the worker. */
@Injectable()
export class NotificationScheduler implements OnModuleInit {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.notification)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
    private readonly schedulerRepository: SchedulerRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.notification,
      this.recorder,
      this.logger,
    );
  }

  /** Fire-and-forget. */
  async publish(input: PublishNotificationInput): Promise<void> {
    await this.queue.add(NOTIFICATION_JOBS.publish, input, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5 * 1000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    });
  }

  /** Recipients are read now, so it can run just before the event is deleted. */
  async publishToEventParticipants(
    eventId: number,
    notices: EventParticipantNotices,
  ): Promise<void> {
    const participants =
      await this.schedulerRepository.findEventParticipantIds(eventId);
    const groups = [
      [notices.volunteers, participants.volunteers, RoleType.VOLUNTEER],
      [notices.beneficiaries, participants.beneficiaries, RoleType.BENEFICIARY],
      [notices.donors, participants.donors, RoleType.DONOR],
    ] as const;

    for (const [notice, userIds, audienceRole] of groups) {
      if (!notice || userIds.length === 0) continue;
      await this.publish({ ...notice, userIds: [...userIds], audienceRole });
    }
  }
}
