import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventAttendanceValidationService } from '../../modules/event-attendance/services/event-attendance-validation-service';
import { ATTENDANCE_JOBS } from '../jobs/attendance-scheduler';
import { SCHEDULER_QUEUES, SchedulerRunRecorder } from '../scheduler-registry';
import { CatalogedProcessor } from './base-processor';

/** Rules on every finished event that still has pending volunteers. */
@Processor(SCHEDULER_QUEUES.attendance)
export class AttendanceProcessor extends CatalogedProcessor {
  protected readonly logger = new Logger(AttendanceProcessor.name);

  constructor(
    protected readonly recorder: SchedulerRunRecorder,
    private readonly validation: EventAttendanceValidationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== ATTENDANCE_JOBS.validateEndedAttendance) {
      this.logger.warn(`unknown attendance job "${job.name}" ignored`);
      return;
    }

    await this.withRuntimeCap(job, async () => {
      const summaries = await this.validation.sweepEndedEvents();
      if (summaries.length === 0) {
        await this.note(job, 'No finished events with pending volunteers');
        return;
      }
      for (const one of summaries) {
        await this.note(
          job,
          `event ${one.eventId}: ${one.completed} completed, ${one.absent} absent, ${one.awaitingSync} awaiting sync${one.skipped ? `, ${one.skipped} skipped (no geofence)` : ''}`,
        );
      }
    });
  }
}
