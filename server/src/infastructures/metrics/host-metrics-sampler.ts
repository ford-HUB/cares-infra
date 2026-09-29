import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../redis/redis-service';
import { RequestMetricsRecorder } from './request-metrics-recorder';

const execFileAsync = promisify(execFile);

/** One reading of the host, taken on the sampler's tick. */
export interface HostSample {
  at: string;
  /** Percentage points of total CPU capacity; the three sum to CPU busy. */
  cpuUser: number;
  cpuSystem: number;
  cpuIoWait: number;
  memoryPercent: number;
  requestsPerMinute: number;
  responseP50Ms: number;
  responseP95Ms: number;
}

export interface CoreLoad {
  id: number;
  usagePercent: number;
}

export type ProcessOwner =
  | 'server'
  | 'microservices'
  | 'database'
  | 'site'
  | 'other';

export interface ProcessLoad {
  id: string;
  name: string;
  owner: ProcessOwner;
  /** Share of total host capacity, so the column sums toward CPU busy. */
  cpuPercent: number;
  memoryMb: number;
  /** Null where the platform does not report it. */
  threads: number | null;
}

export interface HostInfo {
  name: string;
  region: string;
  vcpu: number;
  memoryGb: number;
  uptimeHours: number;
}

export type SampleRange = 'live' | 'hour' | 'day';

/** The window each range charts and how the stream behind it is sampled. */
export const SAMPLE_RANGES: Record<
  SampleRange,
  { points: number; stepSeconds: number }
> = {
  live: { points: 60, stepSeconds: 3 },
  hour: { points: 60, stepSeconds: 60 },
  day: { points: 72, stepSeconds: 1_200 },
};

/** How often the live reading is taken. The portal ticks at the same rate. */
export const SAMPLE_TICK_MS = SAMPLE_RANGES.live.stepSeconds * 1000;

/** The process list is a `ps` spawn, so it is refreshed less often than the CPU. */
const PROCESS_REFRESH_TICKS = 3;
const PROCESS_ROWS = 8;

/** Throughput and latency are read over the last minute, whatever the tick. */
const REQUEST_WINDOW_MS = 60_000;

interface CoreTimes {
  user: number;
  system: number;
  ioWait: number;
  idle: number;
}

/**
 * Samples the machine this server runs on and keeps three windows of readings —
 * live, hour and day — for the performance page. The live window is memory only;
 * the two aggregate windows are mirrored to Redis so a restart does not wipe the
 * day's history. Aggregates are means of the finer readings beneath them.
 */
@Injectable()
export class HostMetricsSampler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HostMetricsSampler.name);
  private readonly rings: Record<SampleRange, HostSample[]> = {
    live: [],
    hour: [],
    day: [],
  };
  private cores: CoreLoad[] = [];
  private processes: ProcessLoad[] = [];
  private previousTimes: CoreTimes[] | null = null;
  private previousOwnCpu = process.cpuUsage();
  private previousOwnAt = Date.now();
  private tickCount = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly requests: RequestMetricsRecorder,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.restore();
    // Prime the CPU counters so the first real tick has a delta to work from.
    this.previousTimes = await readCoreTimes();
    this.timer = setInterval(() => void this.tick(), SAMPLE_TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  host(): HostInfo {
    return {
      name: os.hostname(),
      region: process.env.HOST_REGION ?? `${os.platform()} ${os.arch()}`,
      vcpu: os.cpus().length,
      memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      uptimeHours: os.uptime() / 3600,
    };
  }

  /** Oldest first; the last entry is "now". */
  samples(range: SampleRange): HostSample[] {
    return this.rings[range];
  }

  latest(): HostSample | null {
    const live = this.rings.live;
    return live[live.length - 1] ?? null;
  }

  coreLoads(): CoreLoad[] {
    return this.cores;
  }

  processLoads(): ProcessLoad[] {
    return this.processes;
  }

  loadAverage(): [number, number, number] {
    const [one, five, fifteen] = os.loadavg();
    return [round2(one), round2(five), round2(fifteen)];
  }

  // -------------------------------------------------------------- sampling

  private async tick(): Promise<void> {
    try {
      const now = Date.now();
      const times = await readCoreTimes();
      const { cores, total } = diffTimes(this.previousTimes, times);
      this.previousTimes = times;
      this.cores = cores;

      const window = this.requests.window(REQUEST_WINDOW_MS, now);
      const sample: HostSample = {
        at: new Date(now).toISOString(),
        cpuUser: round1(total.user),
        cpuSystem: round1(total.system),
        cpuIoWait: round1(total.ioWait),
        memoryPercent: round1(
          ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
        ),
        requestsPerMinute: window.requestsPerMinute,
        responseP50Ms: window.p50Ms,
        responseP95Ms: window.p95Ms,
      };
      push(this.rings.live, sample, SAMPLE_RANGES.live.points);

      this.tickCount += 1;
      if (this.tickCount % PROCESS_REFRESH_TICKS === 1) {
        this.processes = await this.readProcesses();
      }

      const ticksPerMinute =
        SAMPLE_RANGES.hour.stepSeconds / SAMPLE_RANGES.live.stepSeconds;
      if (this.tickCount % ticksPerMinute === 0) {
        this.requests.rollMinute(now);
        await this.close('hour', this.rings.live.slice(-ticksPerMinute));
      }

      const minutesPerBucket =
        SAMPLE_RANGES.day.stepSeconds / SAMPLE_RANGES.hour.stepSeconds;
      if (this.tickCount % (ticksPerMinute * minutesPerBucket) === 0) {
        await this.close('day', this.rings.hour.slice(-minutesPerBucket));
      }
    } catch (error) {
      this.logger.warn(`sample skipped: ${(error as Error).message}`);
    }
  }

  /** Closes one aggregate bucket from the finer readings inside it. */
  private async close(
    range: 'hour' | 'day',
    inside: HostSample[],
  ): Promise<void> {
    if (inside.length === 0) return;
    const sample = mean(inside);
    push(this.rings[range], sample, SAMPLE_RANGES[range].points);
    await this.redisService.pushCapped(
      this.ringKey(range),
      sample,
      SAMPLE_RANGES[range].points,
    );
  }

  private async restore(): Promise<void> {
    for (const range of ['hour', 'day'] as const) {
      const stored = await this.redisService.listAll<HostSample>(
        this.ringKey(range),
      );
      // Stored newest first; the ring reads oldest first.
      this.rings[range] = stored.reverse();
    }
  }

  private ringKey(range: 'hour' | 'day'): string {
    return `metrics:samples:${range}`;
  }

  /**
   * Top processes by CPU. On Linux this is what `ps` sees from inside the container
   * — the API and whatever shares its namespace. Elsewhere only this process is
   * measured, from its own CPU counters, because there is no portable process table.
   */
  private async readProcesses(): Promise<ProcessLoad[]> {
    if (os.platform() === 'linux') {
      try {
        return await readLinuxProcesses();
      } catch (error) {
        this.logger.debug(`ps unavailable: ${(error as Error).message}`);
      }
    }
    return [this.ownProcess()];
  }

  private ownProcess(): ProcessLoad {
    const now = Date.now();
    const usage = process.cpuUsage(this.previousOwnCpu);
    const elapsedMicros = Math.max(1, (now - this.previousOwnAt) * 1000);
    this.previousOwnCpu = process.cpuUsage();
    this.previousOwnAt = now;

    return {
      id: String(process.pid),
      name: 'cares-api (node)',
      owner: 'server',
      cpuPercent: round1(
        ((usage.user + usage.system) / elapsedMicros / os.cpus().length) * 100,
      ),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 ** 2),
      threads: null,
    };
  }
}

// -------------------------------------------------------------------- helpers

function push<T>(ring: T[], value: T, max: number): void {
  ring.push(value);
  if (ring.length > max) ring.splice(0, ring.length - max);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Mean of every field; `at` is the bucket's close, the last reading's time. */
function mean(samples: HostSample[]): HostSample {
  const average = (pick: (sample: HostSample) => number) =>
    round1(samples.reduce((sum, one) => sum + pick(one), 0) / samples.length);
  return {
    at: samples[samples.length - 1].at,
    cpuUser: average((s) => s.cpuUser),
    cpuSystem: average((s) => s.cpuSystem),
    cpuIoWait: average((s) => s.cpuIoWait),
    memoryPercent: average((s) => s.memoryPercent),
    requestsPerMinute: Math.round(average((s) => s.requestsPerMinute)),
    responseP50Ms: Math.round(average((s) => s.responseP50Ms)),
    responseP95Ms: Math.round(average((s) => s.responseP95Ms)),
  };
}

/**
 * Cumulative CPU time per core. Linux is read from `/proc/stat`, the only source
 * that reports I/O wait; everywhere else `os.cpus()` is used and I/O wait is zero.
 */
async function readCoreTimes(): Promise<CoreTimes[]> {
  if (os.platform() === 'linux') {
    try {
      const stat = await readFile('/proc/stat', 'utf8');
      const cores = stat
        .split('\n')
        .filter((line) => /^cpu\d+\s/.test(line))
        .map((line) => {
          const [, user, nice, system, idle, ioWait, irq, softIrq, steal] = line
            .trim()
            .split(/\s+/)
            .map(Number);
          return {
            user: user + nice,
            system: system + irq + softIrq + (steal || 0),
            ioWait,
            idle,
          };
        });
      if (cores.length > 0) return cores;
    } catch {
      // Fall through to the portable reading.
    }
  }

  return os.cpus().map(({ times }) => ({
    user: times.user + times.nice,
    system: times.sys + times.irq,
    ioWait: 0,
    idle: times.idle,
  }));
}

/** Percentage of each core, and of the host, spent in each band since the last read. */
function diffTimes(
  previous: CoreTimes[] | null,
  current: CoreTimes[],
): {
  cores: CoreLoad[];
  total: { user: number; system: number; ioWait: number };
} {
  const sum = { user: 0, system: 0, ioWait: 0 };
  const cores = current.map((now, index) => {
    const before = previous?.[index] ?? {
      user: 0,
      system: 0,
      ioWait: 0,
      idle: 0,
    };
    const user = now.user - before.user;
    const system = now.system - before.system;
    const ioWait = now.ioWait - before.ioWait;
    const idle = now.idle - before.idle;
    const total = Math.max(1, user + system + ioWait + idle);

    sum.user += user / total;
    sum.system += system / total;
    sum.ioWait += ioWait / total;
    return {
      id: index,
      usagePercent: round1(((user + system + ioWait) / total) * 100),
    };
  });

  const count = Math.max(1, cores.length);
  return {
    cores,
    total: {
      user: (sum.user / count) * 100,
      system: (sum.system / count) * 100,
      ioWait: (sum.ioWait / count) * 100,
    },
  };
}

async function readLinuxProcesses(): Promise<ProcessLoad[]> {
  const { stdout } = await execFileAsync('ps', [
    '-eo',
    'pid=,pcpu=,rss=,nlwp=,comm=',
    '--sort=-pcpu',
  ]);
  const vcpu = os.cpus().length;

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, PROCESS_ROWS)
    .map((line) => {
      const [pid, pcpu, rss, nlwp, ...comm] = line.split(/\s+/);
      const name = comm.join(' ');
      return {
        id: pid,
        name,
        owner: ownerOf(name),
        // `ps` reports percent of one core; the page reads percent of the host.
        cpuPercent: round1(Number(pcpu) / vcpu),
        memoryMb: Math.round(Number(rss) / 1024),
        threads: Number(nlwp) || null,
      };
    });
}

function ownerOf(name: string): ProcessOwner {
  const lower = name.toLowerCase();
  if (lower.includes('node')) return 'server';
  if (/python|uvicorn|gunicorn/.test(lower)) return 'microservices';
  if (lower.includes('postgres')) return 'database';
  if (/nginx|caddy|httpd/.test(lower)) return 'site';
  return 'other';
}
