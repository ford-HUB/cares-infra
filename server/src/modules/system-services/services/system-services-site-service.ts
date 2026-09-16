import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SCHEDULER_DEFINITIONS,
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  findSchedulerDefinition,
  upsertScheduler,
  type EffectiveDefinition,
  type SchedulerDefinition,
  type SchedulerQueueName,
  type SchedulerRunRecord,
  type SchedulerTrigger,
} from '../../../schedulers/scheduler.registry';
import type {
  ServiceLogEntryDto,
  ServiceTriggerDto,
  SystemServiceDto,
  UpdateServiceScheduleDto,
} from '../dto/system-services-site-dto';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** How long `triggerRun` waits for the worker to acknowledge before answering anyway. */
const RUN_ACK_WAIT_MS = 2500;
const RUN_ACK_POLL_MS = 100;

/** `M H * * *` — the one cron shape the portal shows as a plain "daily at". */
const DAILY_CRON = /^(\d{1,2}) (\d{1,2}) \* \* \*$/;

/**
 * The Services screen's view of the schedulers: the catalogue, joined with what
 * BullMQ knows (next fire time, jobs in flight) and what the run recorder kept
 * (recent outcomes, logs, pause and override flags). Controls act on the queue
 * directly and persist their intent in Redis so a restart re-applies it.
 */
@Injectable()
export class SystemServicesSiteService {
  private readonly queues: Record<SchedulerQueueName, Queue>;

  constructor(
    private readonly recorder: SchedulerRunRecorder,
    @InjectQueue(SCHEDULER_QUEUES.email) emailQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.notification) notificationQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.cleanup) cleanupQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.diagnostics) diagnosticsQueue: Queue,
  ) {
    this.queues = {
      email: emailQueue,
      notification: notificationQueue,
      cleanup: cleanupQueue,
      diagnostics: diagnosticsQueue,
    };
  }

  async listServices(): Promise<SystemServiceDto[]> {
    return Promise.all(
      SCHEDULER_DEFINITIONS.map((definition) => this.describe(definition)),
    );
  }

  async getServiceLogs(id: string): Promise<ServiceLogEntryDto[]> {
    this.requireDefinition(id);
    const lines = await this.recorder.logs(id);
    // Stored newest first; the viewer reads top to bottom.
    return lines.reverse().map((line, index) => ({
      id: `${line.runId}-${index}`,
      run_id: line.runId,
      at: line.at,
      level: line.level,
      message: line.message,
    }));
  }

  /** The 24/7 switch: pausing removes the scheduler, resuming re-arms it. */
  async setPaused(id: string, paused: boolean): Promise<SystemServiceDto[]> {
    const definition = this.requireDefinition(id);
    const queue = this.queues[definition.queue];

    await this.recorder.setPaused(id, paused);
    if (paused) {
      await queue.removeJobScheduler(id);
      await this.recorder.markOnDuty(id, null);
    } else {
      await upsertScheduler(queue, await this.recorder.effective(definition));
      await this.recorder.markOnDuty(id, new Date());
    }
    return this.listServices();
  }

  /** Fires a run outside the schedule; the next trigger is left where it was. */
  async triggerRun(id: string): Promise<SystemServiceDto[]> {
    const definition = this.requireDefinition(id);
    if (await this.recorder.active(id)) {
      throw new ConflictException('A run is already in progress');
    }

    const effective = await this.recorder.effective(definition);
    const before = (await this.recorder.runs(id))[0]?.id ?? null;
    await this.queues[definition.queue].add(
      id,
      {},
      {
        attempts: effective.attempts,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    );

    // The worker picks the job up a few milliseconds after it is queued, and a small
    // sweep is finished a few hundred later. Waiting briefly for either lets the
    // response show the run — as in flight, or as its new tick — rather than a roster
    // that looks as if nothing happened.
    await this.waitForRun(id, before);
    return this.listServices();
  }

  private async waitForRun(
    id: string,
    previousRunId: string | null,
  ): Promise<void> {
    const deadline = Date.now() + RUN_ACK_WAIT_MS;
    while (Date.now() < deadline) {
      if (await this.recorder.active(id)) return;
      const latest = (await this.recorder.runs(id))[0]?.id ?? null;
      if (latest && latest !== previousRunId) return;
      await new Promise((resolve) => setTimeout(resolve, RUN_ACK_POLL_MS));
    }
  }

  /**
   * A worker cannot be interrupted mid-run from outside; what can be stopped is a
   * queued manual run that has not started. Anything else is reported honestly.
   */
  async stopRun(id: string): Promise<SystemServiceDto[]> {
    const definition = this.requireDefinition(id);
    const queue = this.queues[definition.queue];

    const waiting = await queue.getJobs(['waiting', 'delayed', 'prioritized']);
    const removable = waiting.filter(
      (job) => job.name === id && !job.repeatJobKey,
    );
    if (removable.length === 0) {
      throw new BadRequestException(
        'The run in flight cannot be interrupted — it will stop at its runtime cap',
      );
    }

    await Promise.all(removable.map((job) => job.remove()));
    return this.listServices();
  }

  async updateSchedule(
    id: string,
    update: UpdateServiceScheduleDto,
  ): Promise<SystemServiceDto[]> {
    const definition = this.requireDefinition(id);

    await this.recorder.setOverride(id, {
      trigger: toTrigger(update.trigger),
      maxRuntimeMs: update.duration.max_runtime_minutes * MINUTE_MS,
      attempts: update.duration.retries + 1,
    });

    if (!(await this.recorder.isPaused(id))) {
      await upsertScheduler(
        this.queues[definition.queue],
        await this.recorder.effective(definition),
      );
    }
    return this.listServices();
  }

  // ------------------------------------------------------------------ mapping

  private async describe(
    definition: SchedulerDefinition,
  ): Promise<SystemServiceDto> {
    const queue = this.queues[definition.queue];
    const [effective, runs, active, paused, onDutySince, scheduler] =
      await Promise.all([
        this.recorder.effective(definition),
        this.recorder.runs(definition.id),
        this.recorder.active(definition.id),
        this.recorder.isPaused(definition.id),
        this.recorder.onDutySince(definition.id),
        queue.getJobScheduler(definition.id),
      ]);

    const latest = runs[0] ?? null;
    const state: SystemServiceDto['state'] = active
      ? 'running'
      : paused
        ? 'paused'
        : latest && latest.outcome !== 'success'
          ? 'failing'
          : 'scheduled';

    // Oldest first for the strip of ticks; the in-flight run is the last tick.
    const recentRuns: SystemServiceDto['recent_runs'] = [...runs]
      .reverse()
      .map((run) => ({
        id: run.id,
        started_at: run.startedAt,
        duration_seconds: roundSeconds(run.durationMs),
        outcome: run.outcome,
      }));
    if (active) {
      recentRuns.push({
        id: active.id,
        started_at: active.startedAt,
        duration_seconds: roundSeconds(
          Date.now() - new Date(active.startedAt).getTime(),
        ),
        outcome: 'running',
      });
    }

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      owner: definition.owner,
      state,
      trigger: toTriggerDto(effective),
      duration: {
        max_runtime_minutes: Math.max(
          1,
          Math.round(effective.maxRuntimeMs / MINUTE_MS),
        ),
        retries: Math.max(0, effective.attempts - 1),
        // One worker per queue with concurrency 1: an overdue trigger waits its turn.
        overlap_policy: 'queue',
      },
      average_runtime_seconds: medianRuntimeSeconds(runs),
      last_run_at: latest?.startedAt ?? active?.startedAt ?? null,
      next_run_at:
        paused || !scheduler?.next
          ? null
          : new Date(scheduler.next).toISOString(),
      current_run_started_at: active?.startedAt ?? null,
      on_duty_days:
        paused || !onDutySince
          ? 0
          : Math.floor((Date.now() - new Date(onDutySince).getTime()) / DAY_MS),
      recent_runs: recentRuns,
      last_error: latest && latest.outcome !== 'success' ? latest.error : null,
    };
  }

  private requireDefinition(id: string): SchedulerDefinition {
    const definition = findSchedulerDefinition(id);
    if (!definition) {
      throw new NotFoundException('Service not found');
    }
    return definition;
  }
}

function toTriggerDto(definition: EffectiveDefinition): ServiceTriggerDto {
  const trigger = definition.trigger;
  const base: ServiceTriggerDto = {
    mode: 'manual',
    interval_minutes: 15,
    daily_at: '08:00',
    cron_expression: '',
  };

  if (!trigger) return base;

  if (trigger.every) {
    return {
      ...base,
      mode: 'interval',
      interval_minutes: Math.max(1, Math.round(trigger.every / MINUTE_MS)),
    };
  }

  if (trigger.pattern) {
    const daily = DAILY_CRON.exec(trigger.pattern);
    if (daily) {
      const [, minute, hour] = daily;
      return {
        ...base,
        mode: 'daily',
        daily_at: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
        cron_expression: trigger.pattern,
      };
    }
    return { ...base, mode: 'cron', cron_expression: trigger.pattern };
  }

  return base;
}

function toTrigger(dto: ServiceTriggerDto): SchedulerTrigger | null {
  switch (dto.mode) {
    case 'interval':
      return { every: dto.interval_minutes * MINUTE_MS };
    case 'daily': {
      const [hour, minute] = dto.daily_at.split(':').map(Number);
      return { pattern: `${minute} ${hour} * * *` };
    }
    case 'cron':
      return { pattern: dto.cron_expression };
    case 'manual':
      return null;
  }
}

/** Median across finished runs; the bar's expected length. Zero until there is history. */
function medianRuntimeSeconds(runs: SchedulerRunRecord[]): number {
  const durations = runs
    .filter((run) => run.outcome === 'success')
    .map((run) => run.durationMs)
    .sort((a, b) => a - b);
  if (durations.length === 0) return 0;
  const middle = Math.floor(durations.length / 2);
  const median =
    durations.length % 2 === 0
      ? (durations[middle - 1] + durations[middle]) / 2
      : durations[middle];
  return roundSeconds(median);
}

/** Seconds to one decimal — a 300 ms sweep reads as 0.3s, not as nothing. */
function roundSeconds(ms: number): number {
  return Math.round(ms / 100) / 10;
}
