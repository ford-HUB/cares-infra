import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

/** Sweeps share their id with the catalogue. */
export const EMAIL_JOBS = {
  send: 'send',
  unreadDigest: 'unread-digest',
} as const;

/** Rendered from `shared/templates`. */
export interface SendEmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  replyTo?: string;
}

/** Non-blocking mail only; mail whose outcome must be reported (credentials, OTP) uses `NodemailerService` directly. */
@Injectable()
export class EmailScheduler implements OnModuleInit {
  private readonly logger = new Logger(EmailScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.email)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.email,
      this.recorder,
      this.logger,
    );
  }

  async enqueue(mail: SendEmailJobData): Promise<void> {
    await this.queue.add(EMAIL_JOBS.send, mail, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60 * 1000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    });
  }
}
