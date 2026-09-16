import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler.registry';

/** Job names on the diagnostics queue — one catalogued sweep. */
export const DIAGNOSTICS_JOBS = {
  systemDiagnostics: 'system-diagnostics',
} as const;

/**
 * The health sweep's own queue, kept apart from the work queues so a stalled
 * notification worker cannot also stall the check that would report it stalled.
 */
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
