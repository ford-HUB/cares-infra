import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  registerQueueSchedulers,
} from '../scheduler-registry';

/** Job names on the attendance queue — one catalogued sweep. */
export const ATTENDANCE_JOBS = {
  validateEndedAttendance: 'validate-ended-attendance',
} as const;

/**
 * The geofence ruling's own queue. Uploads already trigger a ruling for the one
 * volunteer who pushed; this sweep catches everyone else once an event is over.
 */
@Injectable()
export class AttendanceScheduler implements OnModuleInit {
  private readonly logger = new Logger(AttendanceScheduler.name);

  constructor(
    @InjectQueue(SCHEDULER_QUEUES.attendance)
    private readonly queue: Queue,
    private readonly recorder: SchedulerRunRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await registerQueueSchedulers(
      this.queue,
      SCHEDULER_QUEUES.attendance,
      this.recorder,
      this.logger,
    );
  }
}
