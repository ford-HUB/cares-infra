import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { RedisService } from '../infastructures/redis/redis-service';

/** The BullMQ queues the server runs. Each has one processor under `processors/`. */
export const SCHEDULER_QUEUES = {
  email: 'email',
  notification: 'notification',
  cleanup: 'cleanup',
  diagnostics: 'diagnostics',
  attendance: 'attendance',
  events: 'events',
} as const;

export type SchedulerQueueName =
  (typeof SCHEDULER_QUEUES)[keyof typeof SCHEDULER_QUEUES];

/** Which deployable owns a worker — shown so staff know where to look on failure. */
export type SchedulerOwner = 'server' | 'microservices' | 'mobile-sync';

/**
 * How a job fires. `every` is milliseconds between runs; `pattern` is a cron
 * expression; neither means the job only runs when something enqueues it.
 */
export interface SchedulerTrigger {
  every?: number;
  pattern?: string;
}

/**
 * One scheduled job as the portal sees it. The id doubles as the BullMQ job
 * scheduler key and the job name, so the queue and this catalogue cannot drift.
 */
export interface SchedulerDefinition {
  id: string;
  queue: SchedulerQueueName;
  name: string;
  /** One line on what the job actually does, in staff language. */
  description: string;
  owner: SchedulerOwner;
  trigger: SchedulerTrigger;
  /** Hard cap on one run; a run still going past it is failed and retried. */
  maxRuntimeMs: number;
  /** Retries after a failed run before the job is flagged failing. */
  attempts: number;
}

const MINUTE = 60 * 1000;

/**
 * Every job the server schedules on its own clock. On-demand jobs (a single
 * `publish` or `send`) are not listed — they are what these sweeps enqueue.
 */
export const SCHEDULER_DEFINITIONS: SchedulerDefinition[] = [
  {
    id: 'event-start-reminders',
    queue: SCHEDULER_QUEUES.notification,
    name: 'Event start reminders',
    description:
      'Every 15 minutes, finds events starting within the next two hours and notifies the coordinators and directors who run them.',
    owner: 'server',
    trigger: { every: 15 * MINUTE },
    maxRuntimeMs: 2 * MINUTE,
    attempts: 2,
  },
  {
    id: 'report-deadline-reminders',
    queue: SCHEDULER_QUEUES.notification,
    name: 'Monthly report deadline reminders',
    description:
      'Each morning in the last five days of the month, reminds coordinators whose department has not yet filed its monthly report.',
    owner: 'server',
    trigger: { pattern: '0 8 * * *' },
    maxRuntimeMs: 2 * MINUTE,
    attempts: 2,
  },
  {
    id: 'credential-expiry-alerts',
    queue: SCHEDULER_QUEUES.notification,
    name: 'Credential expiry alerts',
    description:
      'Each morning, flags administrator-issued credentials that lapse within 24 hours to the account holder and to admins.',
    owner: 'server',
    trigger: { pattern: '0 9 * * *' },
    maxRuntimeMs: 2 * MINUTE,
    attempts: 2,
  },
  {
    id: 'unread-digest',
    queue: SCHEDULER_QUEUES.email,
    name: 'Unread notification digest',
    description:
      'Each morning, emails portal users who have urgent or attention-needed notifications they have not opened.',
    owner: 'server',
    trigger: { pattern: '0 7 * * *' },
    maxRuntimeMs: 10 * MINUTE,
    attempts: 1,
  },
  {
    id: 'purge-settled-notifications',
    queue: SCHEDULER_QUEUES.cleanup,
    name: 'Purge settled notifications',
    description:
      'Nightly, deletes notifications that were read or dismissed more than 90 days ago.',
    owner: 'server',
    trigger: { pattern: '0 2 * * *' },
    maxRuntimeMs: 5 * MINUTE,
    attempts: 1,
  },
  {
    id: 'purge-finished-jobs',
    queue: SCHEDULER_QUEUES.cleanup,
    name: 'Purge finished queue jobs',
    description:
      'Nightly, removes completed and failed BullMQ jobs older than seven days so the queues stay small.',
    owner: 'server',
    trigger: { pattern: '30 2 * * *' },
    maxRuntimeMs: 5 * MINUTE,
    attempts: 1,
  },
  {
    id: 'validate-ended-attendance',
    queue: SCHEDULER_QUEUES.attendance,
    name: 'Validate ended attendance',
    description:
      'Every five minutes, rules on volunteers still pending at events that have already ended, using the geofence coordinates they uploaded.',
    owner: 'server',
    trigger: { every: 5 * MINUTE },
    maxRuntimeMs: 4 * MINUTE,
    attempts: 2,
  },
  {
    id: 'advance-event-status',
    queue: SCHEDULER_QUEUES.events,
    name: 'Advance event status',
    description:
      'Every minute, marks events that have started as Ongoing and events past their end time as Completed, so the portal and the mobile app show the live phase.',
    owner: 'server',
    trigger: { every: 1 * MINUTE },
    maxRuntimeMs: 1 * MINUTE,
    attempts: 2,
  },
  {
    id: 'system-diagnostics',
    queue: SCHEDULER_QUEUES.diagnostics,
    name: 'System diagnostics',
    description:
      'Every minute, probes the database, Redis, the ML services, the queues and every scheduler above, and records what it found for the Services screen.',
    owner: 'server',
    trigger: { every: 1 * MINUTE },
    maxRuntimeMs: 1 * MINUTE,
    attempts: 1,
  },
];

export function findSchedulerDefinition(
  id: string,
): SchedulerDefinition | undefined {
  return SCHEDULER_DEFINITIONS.find((definition) => definition.id === id);
}

export interface SchedulerOverride {
  trigger: SchedulerTrigger | null;
  maxRuntimeMs: number;
  attempts: number;
}

/** A definition whose trigger may be null — a job staff set to manual. */
export type EffectiveDefinition = Omit<SchedulerDefinition, 'trigger'> & {
  trigger: SchedulerTrigger | null;
};

export type SchedulerRunOutcome = 'success' | 'failed' | 'timed_out';

/** One finished run, as kept in Redis for the portal's recent-runs strip. */
export interface SchedulerRunRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  outcome: SchedulerRunOutcome;
  error: string | null;
}

/** A run that has started and not yet finished. */
export interface SchedulerActiveRun {
  id: string;
  startedAt: string;
}

export type SchedulerLogLevel = 'info' | 'warn' | 'error';

export interface SchedulerLogLine {
  runId: string;
  at: string;
  level: SchedulerLogLevel;
  message: string;
}

/** How many finished runs and log lines are kept per job. */
const RUN_HISTORY_MAX = 12;
const LOG_HISTORY_MAX = 200;

/**
 * Where the processors write what happened and the Services screen reads it.
 * BullMQ keeps its own job records, but they are pruned and keyed by queue; this is
 * the per-job history staff actually look at, kept small and in one place.
 */
@Injectable()
export class SchedulerRunRecorder {
  constructor(private readonly redisService: RedisService) {}

  async start(jobId: string, runId: string): Promise<void> {
    const active: SchedulerActiveRun = {
      id: runId,
      startedAt: new Date().toISOString(),
    };
    await this.redisService.set(this.activeKey(jobId), active);
    await this.log(jobId, runId, 'info', 'Run started');
  }

  async finish(
    jobId: string,
    runId: string,
    outcome: SchedulerRunOutcome,
    error?: string,
  ): Promise<void> {
    const active = await this.redisService.get<SchedulerActiveRun>(
      this.activeKey(jobId),
    );
    const startedAt = active?.startedAt ?? new Date().toISOString();
    const finishedAt = new Date();

    const record: SchedulerRunRecord = {
      id: runId,
      startedAt,
      finishedAt: finishedAt.toISOString(),
      durationMs: Math.max(
        0,
        finishedAt.getTime() - new Date(startedAt).getTime(),
      ),
      outcome,
      error: error ?? null,
    };

    await this.redisService.pushCapped(
      this.runsKey(jobId),
      record,
      RUN_HISTORY_MAX,
    );
    await this.redisService.delete(this.activeKey(jobId));
    await this.log(
      jobId,
      runId,
      outcome === 'success' ? 'info' : 'error',
      outcome === 'success'
        ? `Run finished in ${(record.durationMs / 1000).toFixed(1)}s`
        : `Run ${outcome.replace('_', ' ')}: ${error ?? 'no detail'}`,
    );
  }

  async log(
    jobId: string,
    runId: string,
    level: SchedulerLogLevel,
    message: string,
  ): Promise<void> {
    const line: SchedulerLogLine = {
      runId,
      at: new Date().toISOString(),
      level,
      message,
    };
    await this.redisService.pushCapped(
      this.logsKey(jobId),
      line,
      LOG_HISTORY_MAX,
    );
  }

  /** Newest first. */
  async runs(jobId: string): Promise<SchedulerRunRecord[]> {
    return this.redisService.listAll<SchedulerRunRecord>(this.runsKey(jobId));
  }

  async active(jobId: string): Promise<SchedulerActiveRun | null> {
    return this.redisService.get<SchedulerActiveRun>(this.activeKey(jobId));
  }

  /** Newest first. */
  async logs(jobId: string): Promise<SchedulerLogLine[]> {
    return this.redisService.listAll<SchedulerLogLine>(this.logsKey(jobId));
  }

  /** When the job was last resumed — the start of its current on-duty streak. */
  async onDutySince(jobId: string): Promise<string | null> {
    return this.redisService.get<string>(this.dutyKey(jobId));
  }

  async markOnDuty(jobId: string, since: Date | null): Promise<void> {
    if (since) {
      await this.redisService.set(this.dutyKey(jobId), since.toISOString());
    } else {
      await this.redisService.delete(this.dutyKey(jobId));
    }
  }

  /**
   * Staff-set trigger and limits, replacing the catalogue defaults until cleared.
   * `trigger: null` means "manual" — the job only runs when someone presses Run.
   */
  async getOverride(jobId: string): Promise<SchedulerOverride | null> {
    return this.redisService.get<SchedulerOverride>(this.overrideKey(jobId));
  }

  async setOverride(jobId: string, override: SchedulerOverride): Promise<void> {
    await this.redisService.set(this.overrideKey(jobId), override);
  }

  /** The catalogue entry with any staff override applied — what actually runs. */
  async effective(
    definition: SchedulerDefinition,
  ): Promise<EffectiveDefinition> {
    const override = await this.getOverride(definition.id);
    if (!override) return { ...definition, trigger: definition.trigger };
    return {
      ...definition,
      trigger: override.trigger,
      maxRuntimeMs: override.maxRuntimeMs,
      attempts: override.attempts,
    };
  }

  private overrideKey(jobId: string): string {
    return `scheduler:override:${jobId}`;
  }

  /** Staff switched the job off; survives a restart so it is not silently re-armed. */
  async isPaused(jobId: string): Promise<boolean> {
    return (
      (await this.redisService.get<boolean>(this.pausedKey(jobId))) === true
    );
  }

  async setPaused(jobId: string, paused: boolean): Promise<void> {
    if (paused) {
      await this.redisService.set(this.pausedKey(jobId), true);
    } else {
      await this.redisService.delete(this.pausedKey(jobId));
    }
  }

  private pausedKey(jobId: string): string {
    return `scheduler:paused:${jobId}`;
  }

  private runsKey(jobId: string): string {
    return `scheduler:runs:${jobId}`;
  }

  private activeKey(jobId: string): string {
    return `scheduler:active:${jobId}`;
  }

  private logsKey(jobId: string): string {
    return `scheduler:logs:${jobId}`;
  }

  private dutyKey(jobId: string): string {
    return `scheduler:on-duty-since:${jobId}`;
  }
}

/**
 * Registers every catalogued job for a queue as a BullMQ job scheduler. Idempotent:
 * an existing scheduler with the same id is updated in place, so a restart never
 * doubles a job up. A job that staff paused stays paused — its scheduler was removed
 * and only `resume` on the Services screen brings it back.
 */
export async function registerQueueSchedulers(
  queue: Queue,
  queueName: SchedulerQueueName,
  recorder: SchedulerRunRecorder,
  logger: Logger,
): Promise<void> {
  for (const definition of SCHEDULER_DEFINITIONS) {
    if (definition.queue !== queueName) continue;

    if (await recorder.isPaused(definition.id)) {
      await queue.removeJobScheduler(definition.id);
      logger.log(`"${definition.id}" stays paused on ${queueName}`);
      continue;
    }

    await upsertScheduler(queue, await recorder.effective(definition));
    if (!(await recorder.onDutySince(definition.id))) {
      await recorder.markOnDuty(definition.id, new Date());
    }
    logger.log(`scheduled "${definition.id}" on ${queueName}`);
  }
}

export async function upsertScheduler(
  queue: Queue,
  definition: EffectiveDefinition,
): Promise<void> {
  const trigger = definition.trigger;
  const repeat = trigger?.pattern
    ? { pattern: trigger.pattern, tz: process.env.TZ || 'Asia/Manila' }
    : trigger?.every
      ? { every: trigger.every }
      : null;

  if (!repeat) {
    await queue.removeJobScheduler(definition.id);
    return;
  }

  await queue.upsertJobScheduler(definition.id, repeat, {
    name: definition.id,
    data: {},
    opts: {
      attempts: definition.attempts,
      backoff: { type: 'exponential', delay: 30 * 1000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
    },
  });
}
