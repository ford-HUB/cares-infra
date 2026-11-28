import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

export const CERTIFICATES_JOBS = {
  issueEventCertificates: 'issue-event-certificates',
} as const;

/** Turns queued deployments into sheets once the event, ruling and questionnaire settle. */
@Injectable()
export class CertificatesScheduler implements OnModuleInit {
  private readonly logger = new Logger(CertificatesScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.certificates)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.certificates,
      this.recorder,
      this.logger,
    );
  }
}
