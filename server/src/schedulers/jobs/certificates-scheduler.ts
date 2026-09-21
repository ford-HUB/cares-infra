import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

/** Job names on the certificates queue — one catalogued sweep. */
export const CERTIFICATES_JOBS = {
  issueEventCertificates: 'issue-event-certificates',
} as const;

/**
 * Certificate generation on its own queue. A deployment is queued by a director in
 * the portal; this sweep is what turns it into sheets once the event is over and the
 * ruling and the questionnaire have settled who earned one.
 */
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
