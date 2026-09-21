import { InjectQueue } from '@nestjs/bullmq';
import { getHeapStatistics } from 'node:v8';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../infastructures/prisma/prisma-service';
import { RedisService } from '../infastructures/redis/redis-service';
import {
  SCHEDULER_DEFINITIONS,
  SCHEDULER_QUEUES,
  SchedulerRunRecorder,
  type SchedulerQueueName,
} from './scheduler-registry';

export type DiagnosticStatus = 'ok' | 'warn' | 'fail';

export type DiagnosticGroup =
  | 'database'
  | 'cache'
  | 'microservice'
  | 'queue'
  | 'scheduler'
  | 'process';

/** One probe's verdict, in the words staff read on the Services screen. */
export interface DiagnosticCheck {
  id: string;
  group: DiagnosticGroup;
  name: string;
  status: DiagnosticStatus;
  /** Round-trip of the probe; null where nothing was timed. */
  latencyMs: number | null;
  detail: string;
}

export type DiagnosticOverall = 'healthy' | 'degraded' | 'down';

export interface DiagnosticReport {
  checkedAt: string;
  durationMs: number;
  overall: DiagnosticOverall;
  /** Whether the report came from the scheduled sweep or a staff-pressed check. */
  source: 'scheduled' | 'manual';
  checks: DiagnosticCheck[];
}

/** One line per past report — the strip under the diagnostics card. */
export interface DiagnosticHistoryEntry {
  checkedAt: string;
  overall: DiagnosticOverall;
  failing: number;
}

const LATEST_KEY = 'diagnostics:latest';
const HISTORY_KEY = 'diagnostics:history';
const HISTORY_MAX = 60;

/** A probe that takes longer than this is answered but flagged. */
const SLOW_MS = 1_000;
/** A probe still unanswered after this is failed. */
const PROBE_TIMEOUT_MS = 5_000;

/** A scheduler whose next fire is this far in the past is stuck, not just busy. */
const OVERDUE_GRACE_MS = 2 * 60 * 1000;

/** Queued work beyond this is a backlog the workers are not clearing. */
const BACKLOG_WARN = 100;

/**
 * A failure older than this is history, not a live warning. BullMQ keeps the last
 * `removeOnFail.count` failed jobs around, so the raw failed count would otherwise
 * hold a queue at "degraded" long after every later run has succeeded.
 */
const RECENT_FAILURE_MS = 60 * 60 * 1000;

/** Heap use above this share of the limit is the process running out of room. */
const HEAP_WARN_SHARE = 0.85;

const MICROSERVICES: {
  id: string;
  name: string;
  env: string;
  fallback: string;
}[] = [
  {
    id: 'fr-service',
    name: 'Face recognition',
    env: 'FR_SERVICE_URL',
    fallback: 'http://localhost:8001',
  },
  {
    id: 'ocr-service',
    name: 'OCR extraction',
    env: 'OCR_SERVICE_URL',
    fallback: 'http://localhost:8002',
  },
  {
    id: 'ucid-service',
    name: 'ID authenticity',
    env: 'UCID_SERVICE_URL',
    fallback: 'http://localhost:8003',
  },
  {
    id: 'nlp-service',
    name: 'NLP matching',
    env: 'NLP_SERVICE_URL',
    fallback: 'http://localhost:8004',
  },
  {
    id: 'gps-validator-service',
    name: 'GPS attendance validator',
    env: 'GPS_VALIDATOR_SERVICE_URL',
    fallback: 'http://localhost:8005',
  },
];

/**
 * Probes everything the schedulers depend on to keep running — the database, Redis,
 * the ML services, the queues and their workers, and the schedulers' own clocks —
 * and writes one report to Redis. The sweep on the diagnostics queue runs it every
 * minute; the Services screen can run it on demand and reads the latest either way.
 */
@Injectable()
export class SystemDiagnosticsChecker {
  private readonly logger = new Logger(SystemDiagnosticsChecker.name);
  private readonly queues: Record<SchedulerQueueName, Queue>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly recorder: SchedulerRunRecorder,
    @InjectQueue(SCHEDULER_QUEUES.email) emailQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.notification) notificationQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.cleanup) cleanupQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.diagnostics) diagnosticsQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.attendance) attendanceQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.events) eventsQueue: Queue,
    @InjectQueue(SCHEDULER_QUEUES.certificates) certificatesQueue: Queue,
  ) {
    this.queues = {
      email: emailQueue,
      notification: notificationQueue,
      cleanup: cleanupQueue,
      diagnostics: diagnosticsQueue,
      attendance: attendanceQueue,
      events: eventsQueue,
      certificates: certificatesQueue,
    };
  }

  async run(source: DiagnosticReport['source']): Promise<DiagnosticReport> {
    const startedAt = Date.now();
    const groups = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMicroservices(),
      this.checkQueues(),
      this.checkSchedulers(),
      this.checkProcess(),
    ]);
    const checks = groups.flat();

    const report: DiagnosticReport = {
      checkedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      overall: overallOf(checks),
      source,
      checks,
    };

    try {
      await this.redisService.set(LATEST_KEY, report);
      await this.redisService.pushCapped(
        HISTORY_KEY,
        {
          checkedAt: report.checkedAt,
          overall: report.overall,
          failing: checks.filter((one) => one.status === 'fail').length,
        } satisfies DiagnosticHistoryEntry,
        HISTORY_MAX,
      );
    } catch (error) {
      // Redis being down is itself in the report; the caller still gets it.
      this.logger.warn(`report not stored: ${(error as Error).message}`);
    }

    return report;
  }

  async latest(): Promise<DiagnosticReport | null> {
    return this.redisService.get<DiagnosticReport>(LATEST_KEY);
  }

  /** Newest first. */
  async history(): Promise<DiagnosticHistoryEntry[]> {
    return this.redisService.listAll<DiagnosticHistoryEntry>(HISTORY_KEY);
  }

  // ---------------------------------------------------------------- probes

  private async checkDatabase(): Promise<DiagnosticCheck[]> {
    return [
      await probe('postgres', 'database', 'PostgreSQL', async () => {
        await this.prisma.$queryRaw`SELECT 1`;
        return 'Answering queries';
      }),
    ];
  }

  private async checkRedis(): Promise<DiagnosticCheck[]> {
    return [
      await probe('redis', 'cache', 'Redis', async () => {
        await this.redisService.ping();
        return 'Answering PING';
      }),
    ];
  }

  private async checkMicroservices(): Promise<DiagnosticCheck[]> {
    return Promise.all(
      MICROSERVICES.map((service) =>
        probe(service.id, 'microservice', service.name, async () => {
          const base = process.env[service.env] ?? service.fallback;
          const response = await fetch(`${base}/health`, {
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
          });
          if (!response.ok) {
            throw new Error(`/health answered ${response.status}`);
          }
          const body = (await response.json()) as {
            ok?: boolean;
            message?: string;
          };
          if (body.ok === false) {
            throw new Error(body.message ?? 'Service reports unhealthy');
          }
          return body.message ?? 'Service healthy';
        }),
      ),
    );
  }

  private async checkQueues(): Promise<DiagnosticCheck[]> {
    return Promise.all(
      (Object.keys(this.queues) as SchedulerQueueName[]).map(async (name) => {
        const queue = this.queues[name];
        const id = `queue-${name}`;
        const label = `${name} queue`;
        try {
          const [workers, counts, failedJobs] = await Promise.all([
            queue.getWorkers(),
            queue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
            queue.getFailed(0, 49),
          ]);
          const backlog = counts.waiting + counts.delayed;
          const since = Date.now() - RECENT_FAILURE_MS;
          const recentFailures = failedJobs.filter(
            (job) => (job.finishedOn ?? job.timestamp) >= since,
          ).length;
          const summary = `${workers.length} worker(s) · ${counts.active} active · ${backlog} queued · ${counts.failed} failed`;

          if (workers.length === 0) {
            return check(
              id,
              'queue',
              label,
              'fail',
              null,
              `No worker attached — ${summary}`,
            );
          }
          if (backlog > BACKLOG_WARN) {
            return check(
              id,
              'queue',
              label,
              'warn',
              null,
              `Backlog building — ${summary}`,
            );
          }
          if (recentFailures > 0) {
            return check(
              id,
              'queue',
              label,
              'warn',
              null,
              `${recentFailures} job(s) failed in the last hour — ${summary}`,
            );
          }
          return check(id, 'queue', label, 'ok', null, summary);
        } catch (error) {
          return check(
            id,
            'queue',
            label,
            'fail',
            null,
            (error as Error).message,
          );
        }
      }),
    );
  }

  /**
   * Each catalogued job against its own clock: a scheduler that should be armed but
   * is missing, a next fire well in the past, a run past its cap, or a last run
   * that failed. The diagnostics sweep does not judge itself — its verdict is this
   * report existing at all.
   */
  private async checkSchedulers(): Promise<DiagnosticCheck[]> {
    const now = Date.now();
    return Promise.all(
      SCHEDULER_DEFINITIONS.filter(
        (definition) => definition.queue !== SCHEDULER_QUEUES.diagnostics,
      ).map(async (definition) => {
        const id = `scheduler-${definition.id}`;
        try {
          const [effective, paused, active, runs, scheduler] =
            await Promise.all([
              this.recorder.effective(definition),
              this.recorder.isPaused(definition.id),
              this.recorder.active(definition.id),
              this.recorder.runs(definition.id),
              this.queues[definition.queue].getJobScheduler(definition.id),
            ]);

          if (paused) {
            return check(
              id,
              'scheduler',
              definition.name,
              'ok',
              null,
              'Paused by staff',
            );
          }
          if (active) {
            const elapsed = now - new Date(active.startedAt).getTime();
            if (elapsed > effective.maxRuntimeMs) {
              return check(
                id,
                'scheduler',
                definition.name,
                'warn',
                null,
                `Run started ${Math.round(elapsed / 1000)}s ago, past its ${Math.round(effective.maxRuntimeMs / 1000)}s cap`,
              );
            }
            return check(
              id,
              'scheduler',
              definition.name,
              'ok',
              null,
              'Run in progress',
            );
          }
          if (!effective.trigger) {
            return check(
              id,
              'scheduler',
              definition.name,
              'ok',
              null,
              'Manual only',
            );
          }
          if (!scheduler) {
            return check(
              id,
              'scheduler',
              definition.name,
              'fail',
              null,
              'Trigger set but no job scheduler is armed — resume the service to re-arm it',
            );
          }
          if (scheduler.next && now - scheduler.next > OVERDUE_GRACE_MS) {
            return check(
              id,
              'scheduler',
              definition.name,
              'fail',
              null,
              `Next fire was due ${Math.round((now - scheduler.next) / 60_000)} min ago and has not started`,
            );
          }
          const latest = runs[0];
          if (latest && latest.outcome !== 'success') {
            return check(
              id,
              'scheduler',
              definition.name,
              'warn',
              null,
              `Last run ${latest.outcome.replace('_', ' ')}: ${latest.error ?? 'no detail'}`,
            );
          }
          return check(
            id,
            'scheduler',
            definition.name,
            'ok',
            null,
            scheduler.next
              ? `Armed, next fire ${new Date(scheduler.next).toISOString()}`
              : 'Armed',
          );
        } catch (error) {
          return check(
            id,
            'scheduler',
            definition.name,
            'fail',
            null,
            (error as Error).message,
          );
        }
      }),
    );
  }

  private async checkProcess(): Promise<DiagnosticCheck[]> {
    const lag = await eventLoopLagMs();
    const memory = process.memoryUsage();
    // Against V8's ceiling, not `heapTotal` — the latter grows with use and is
    // always nearly full, which would make this a permanent false alarm.
    const heapLimit = getHeapStatistics().heap_size_limit;
    const heapShare = memory.heapUsed / heapLimit;
    const detail = `Heap ${Math.round(memory.heapUsed / 1024 ** 2)} MB of ${Math.round(heapLimit / 1024 ** 2)} MB limit · RSS ${Math.round(memory.rss / 1024 ** 2)} MB · up ${Math.round(process.uptime() / 60)} min`;

    return [
      check(
        'api-event-loop',
        'process',
        'API event loop',
        lag > SLOW_MS ? 'fail' : lag > 100 ? 'warn' : 'ok',
        Math.round(lag),
        lag > 100
          ? `Loop blocked for ${Math.round(lag)} ms — a request is holding the thread`
          : 'Responsive',
      ),
      check(
        'api-memory',
        'process',
        'API memory',
        heapShare > HEAP_WARN_SHARE ? 'warn' : 'ok',
        null,
        heapShare > HEAP_WARN_SHARE
          ? `Heap is ${Math.round(heapShare * 100)}% of its limit — ${detail}`
          : detail,
      ),
    ];
  }
}

// -------------------------------------------------------------------- helpers

function check(
  id: string,
  group: DiagnosticGroup,
  name: string,
  status: DiagnosticStatus,
  latencyMs: number | null,
  detail: string,
): DiagnosticCheck {
  return { id, group, name, status, latencyMs, detail };
}

/** Times one probe; a slow answer is a warning, an error or timeout a failure. */
async function probe(
  id: string,
  group: DiagnosticGroup,
  name: string,
  work: () => Promise<string>,
): Promise<DiagnosticCheck> {
  const startedAt = Date.now();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`No answer within ${PROBE_TIMEOUT_MS / 1000}s`)),
      PROBE_TIMEOUT_MS,
    );
  });

  try {
    const detail = await Promise.race([work(), timeout]);
    const latencyMs = Date.now() - startedAt;
    return check(
      id,
      group,
      name,
      latencyMs > SLOW_MS ? 'warn' : 'ok',
      latencyMs,
      latencyMs > SLOW_MS ? `${detail}, but slowly` : detail,
    );
  } catch (error) {
    return check(
      id,
      group,
      name,
      'fail',
      Date.now() - startedAt,
      (error as Error).message,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** How late a zero-delay timer fires — the thread's backlog right now. */
function eventLoopLagMs(): Promise<number> {
  const startedAt = process.hrtime.bigint();
  return new Promise((resolve) =>
    setImmediate(() =>
      resolve(Number(process.hrtime.bigint() - startedAt) / 1e6),
    ),
  );
}

function overallOf(checks: DiagnosticCheck[]): DiagnosticOverall {
  if (checks.some((one) => one.status === 'fail')) {
    // The database or Redis failing takes everything with it; anything else is a
    // degraded service, not an outage.
    const core = checks.filter(
      (one) => one.group === 'database' || one.group === 'cache',
    );
    return core.some((one) => one.status === 'fail') ? 'down' : 'degraded';
  }
  return checks.some((one) => one.status === 'warn') ? 'degraded' : 'healthy';
}
