import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

export const DIAGNOSTICS_JOBS = {
  systemDiagnostics: 'system-diagnostics',
} as const;

/** Separate queue so a stalled worker can't stall its own health check. */
@Injectable()
export class DiagnosticsScheduler implements OnModuleInit {
  private readonly logger = new Logger(DiagnosticsScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.diagnostics)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.diagnostics,
      this.recorder,
      this.logger,
    );
  }
}
