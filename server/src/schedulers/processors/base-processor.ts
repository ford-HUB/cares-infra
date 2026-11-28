import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  SchedulerRunRecorder,
  findSchedulerDefinition,
} from '../scheduler-registry';

/** Records catalogued runs for the Services screen; on-demand jobs (`publish`, `send`) pass through. */
export abstract class CatalogedProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;
  protected abstract readonly recorder: SchedulerRunRecorder;

  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    if (!findSchedulerDefinition(job.name)) return;
    await this.recorder.start(job.name, runIdOf(job));
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job): Promise<void> {
    if (!findSchedulerDefinition(job.name)) return;
    await this.recorder.finish(job.name, runIdOf(job), 'success');
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (!job || !findSchedulerDefinition(job.name)) {
      this.logger.error(`job failed: ${error.message}`, error.stack);
      return;
    }
    const timedOut = /timed out|timeout/i.test(error.message);
    await this.recorder.finish(
      job.name,
      runIdOf(job),
      timedOut ? 'timed_out' : 'failed',
      error.message,
    );
  }

  protected async note(job: Job, message: string): Promise<void> {
    if (!findSchedulerDefinition(job.name)) return;
    await this.recorder.log(job.name, runIdOf(job), 'info', message);
  }

  /** BullMQ has no per-job timeout, so the cap is enforced here as a failed run. */
  protected async withRuntimeCap<T>(
    job: Job,
    work: () => Promise<T>,
  ): Promise<T> {
    const catalogued = findSchedulerDefinition(job.name);
    if (!catalogued) return work();
    const definition = await this.recorder.effective(catalogued);

    let timer: NodeJS.Timeout | undefined;
    const cap = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `Run timed out after ${Math.round(definition.maxRuntimeMs / 1000)}s`,
            ),
          ),
        definition.maxRuntimeMs,
      );
    });

    try {
      return await Promise.race([work(), cap]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

/** Unique per queue; repeat jobs embed their fire time. */
export function runIdOf(job: Job): string {
  return job.id ?? `${job.name}-${job.timestamp}`;
}
