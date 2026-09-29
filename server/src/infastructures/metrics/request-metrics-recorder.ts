import { Injectable } from '@nestjs/common';

/** One finished HTTP request, as the middleware hands it over. */
export interface RequestTiming {
  at: number;
  method: string;
  route: string;
  durationMs: number;
  status: number;
}

export interface WindowStats {
  requestsPerMinute: number;
  p50Ms: number;
  p95Ms: number;
}

export interface RouteStats {
  method: string;
  route: string;
  callsPerMinute: number;
  p50Ms: number;
  p95Ms: number;
  /** 0–1 share of calls that answered 5xx. */
  errorRate: number;
}

/** Requests older than this fall out of the buffer; every window reads inside it. */
const RETENTION_MS = 15 * 60 * 1000;

/** Hard cap on the buffer, so a burst cannot grow the heap without bound. */
const MAX_ENTRIES = 50_000;

/** How many per-minute p95 readings are kept per route — the table's sparkline. */
const TREND_POINTS = 12;

/**
 * Where every request's timing lands, in memory, for the performance page to read.
 * Nothing here touches Redis: the numbers describe *this* process, and a request
 * that is over in 40 ms should not spend another round-trip being recorded.
 */
@Injectable()
export class RequestMetricsRecorder {
  private entries: RequestTiming[] = [];
  private readonly trends = new Map<string, number[]>();

  record(timing: RequestTiming): void {
    this.entries.push(timing);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    }
  }

  /** Throughput and latency over the last `windowMs`. */
  window(windowMs: number, now = Date.now()): WindowStats {
    const recent = this.since(now - windowMs);
    const durations = recent.map((one) => one.durationMs);
    return {
      requestsPerMinute: Math.round((recent.length * 60_000) / windowMs),
      p50Ms: Math.round(percentile(durations, 0.5)),
      p95Ms: Math.round(percentile(durations, 0.95)),
    };
  }

  /** Per-route breakdown over the last `windowMs`, busiest first. */
  routes(windowMs: number, now = Date.now()): RouteStats[] {
    const groups = new Map<string, RequestTiming[]>();
    for (const one of this.since(now - windowMs)) {
      const key = routeKey(one.method, one.route);
      const group = groups.get(key);
      if (group) group.push(one);
      else groups.set(key, [one]);
    }

    return [...groups.values()]
      .map((group) => {
        const durations = group.map((one) => one.durationMs);
        return {
          method: group[0].method,
          route: group[0].route,
          callsPerMinute: Math.round((group.length * 60_000) / windowMs),
          p50Ms: Math.round(percentile(durations, 0.5)),
          p95Ms: Math.round(percentile(durations, 0.95)),
          errorRate:
            group.filter((one) => one.status >= 500).length / group.length,
        };
      })
      .sort((a, b) => b.callsPerMinute - a.callsPerMinute);
  }

  /**
   * Closes a one-minute bucket: appends each route's p95 for the minute to its trend
   * and drops entries past retention. The sampler calls this on its minute tick.
   */
  rollMinute(now = Date.now()): void {
    const minute = this.routes(60_000, now);
    const seen = new Set<string>();
    for (const route of minute) {
      const key = routeKey(route.method, route.route);
      seen.add(key);
      const trend = this.trends.get(key) ?? [];
      trend.push(route.p95Ms);
      this.trends.set(key, trend.slice(-TREND_POINTS));
    }
    // A route that went quiet reads as zero, not as its last busy minute forever.
    for (const [key, trend] of this.trends) {
      if (seen.has(key)) continue;
      trend.push(0);
      const trimmed = trend.slice(-TREND_POINTS);
      if (trimmed.every((value) => value === 0)) this.trends.delete(key);
      else this.trends.set(key, trimmed);
    }

    const cutoff = now - RETENTION_MS;
    const firstKept = this.entries.findIndex((one) => one.at >= cutoff);
    this.entries =
      firstKept === -1
        ? []
        : firstKept === 0
          ? this.entries
          : this.entries.slice(firstKept);
  }

  trend(method: string, route: string): number[] {
    return this.trends.get(routeKey(method, route)) ?? [];
  }

  private since(from: number): RequestTiming[] {
    // Entries arrive in time order, so the window is a suffix of the buffer.
    let start = this.entries.length;
    while (start > 0 && this.entries[start - 1].at >= from) start -= 1;
    return this.entries.slice(start);
  }
}

function routeKey(method: string, route: string): string {
  return `${method} ${route}`;
}

/** Nearest-rank percentile; zero for an empty set so an idle host reads as idle. */
export function percentile(values: number[], rank: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(rank * sorted.length) - 1),
  );
  return sorted[index];
}
