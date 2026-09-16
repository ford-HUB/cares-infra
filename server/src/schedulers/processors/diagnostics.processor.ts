import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DIAGNOSTICS_JOBS } from '../jobs/diagnostics.scheduler';
import { SystemDiagnosticsChecker } from '../scheduler.diagnostics';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from '../scheduler.registry';
import { CatalogedProcessor } from './base.processor';

/** Runs the diagnostics sweep and notes its verdict in the job's log. */
@Processor(SCHEDULER_QUEUES.diagnostics)
export class DiagnosticsProcessor extends CatalogedProcessor {
  protected readonly logger = new Logger(DiagnosticsProcessor.name);

  constructor(
    protected readonly recorder: SchedulerRunRecorder,
    private readonly checker: SystemDiagnosticsChecker,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== DIAGNOSTICS_JOBS.systemDiagnostics) {
      this.logger.warn(`unknown diagnostics job "${job.name}" ignored`);
      return;
    }

    await this.withRuntimeCap(job, async () => {
      const report = await this.checker.run('scheduled');
      const failing = report.checks.filter((one) => one.status === 'fail');
      const warning = report.checks.filter((one) => one.status === 'warn');

      await this.note(
        job,
        `${report.overall}: ${report.checks.length} check(s) in ${report.durationMs} ms — ${failing.length} failing, ${warning.length} warning`,
      );
      for (const one of [...failing, ...warning]) {
        await this.note(job, `${one.name}: ${one.detail}`);
      }
    });
  }
}
