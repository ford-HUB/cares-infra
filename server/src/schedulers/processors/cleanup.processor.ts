import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { NotificationsRepository } from '../../modules/notifications/repositories/notifications-repository';
import { CLEANUP_JOBS } from '../jobs/cleanup.scheduler';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from '../scheduler.registry';
import { CatalogedProcessor } from './base.processor';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A read or dismissed notification older than this is gone for good. */
const NOTIFICATION_RETENTION_DAYS = 90;

/** Finished BullMQ jobs older than this are removed from every queue. */
const JOB_RETENTION_DAYS = 7;

/** How many jobs one `clean` call may remove — bounded so the sweep stays short. */
const CLEAN_BATCH = 1000;

/** Nightly housekeeping — see the catalogue for what each sweep promises. */
@Processor(SCHEDULER_QUEUES.cleanup)
export class CleanupProcessor extends CatalogedProcessor {
  protected readonly logger = new Logger(CleanupProcessor.name);

  constructor(
    protected readonly recorder: SchedulerRunRecorder,
    private readonly notificationsRepository: NotificationsRepository,
    @InjectQueue(SCHEDULER_QUEUES.email) private readonly emailQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.notification)
    private readonly notificationQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.cleanup) private readonly cleanupQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.diagnostics)
    private readonly diagnosticsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case CLEANUP_JOBS.purgeSettledNotifications:
        await this.withRuntimeCap(job, () =>
          this.purgeSettledNotifications(job),
        );
        return;
      case CLEANUP_JOBS.purgeFinishedJobs:
        await this.withRuntimeCap(job, () => this.purgeFinishedJobs(job));
        return;
      default:
        this.logger.warn(`unknown cleanup job "${job.name}" ignored`);
    }
  }

  private async purgeSettledNotifications(job: Job): Promise<void> {
    const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * DAY_MS);
    const removed =
      await this.notificationsRepository.purgeSettledBefore(cutoff);
    await this.note(
      job,
      `${removed} notification(s) settled before ${cutoff.toISOString().slice(0, 10)} removed`,
    );
  }

  private async purgeFinishedJobs(job: Job): Promise<void> {
    const grace = JOB_RETENTION_DAYS * DAY_MS;
    let removed = 0;

    for (const queue of [
      this.emailQueue,
      this.notificationQueue,
      this.cleanupQueue,
      this.diagnosticsQueue,
    ]) {
      const completed = await queue.clean(grace, CLEAN_BATCH, 'completed');
      const failed = await queue.clean(grace, CLEAN_BATCH, 'failed');
      removed += completed.length + failed.length;
      await this.note(
        job,
        `${queue.name}: ${completed.length} completed, ${failed.length} failed removed`,
      );
    }
    await this.note(job, `${removed} job(s) removed in total`);
  }
}
