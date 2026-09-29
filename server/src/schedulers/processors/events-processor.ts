import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventStatusService } from '../../modules/events/services/event-status-service';
import { EVENTS_JOBS } from '../jobs/events-scheduler';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from '../scheduler-registry';
import { CatalogedProcessor } from './base-processor';

/** Moves event statuses forward on the clock. */
@Processor(SCHEDULER_QUEUES.events)
export class EventsProcessor extends CatalogedProcessor {
  protected readonly logger = new Logger(EventsProcessor.name);

  constructor(
    protected readonly recorder: SchedulerRunRecorder,
    private readonly eventStatus: EventStatusService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== EVENTS_JOBS.advanceEventStatus) {
      this.logger.warn(`unknown events job "${job.name}" ignored`);
      return;
    }

    await this.withRuntimeCap(job, async () => {
      const { ongoing, completed } = await this.eventStatus.sweep();
      if (ongoing === 0 && completed === 0) {
        await this.note(job, 'No events changed phase');
        return;
      }
      await this.note(
        job,
        `${ongoing} now ongoing, ${completed} now completed`,
      );
    });
  }
}
