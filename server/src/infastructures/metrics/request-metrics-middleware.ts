import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestMetricsRecorder } from './request-metrics-recorder';

/** A uuid, a bare number, or a long opaque token in a path segment. */
const ID_SEGMENT =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+|[A-Za-z0-9_-]{24,})$/i;

/**
 * The page's own reads are left out: a viewer polling every three seconds would
 * otherwise top the "busiest" list and measure nothing but itself.
 */
const EXCLUDED_PREFIX = '/api/v1/system-performance';

/**
 * Times every request from arrival to the last byte and hands it to the recorder.
 * Routes are normalised here rather than read from Express, which has not matched
 * the route yet when middleware runs: ids collapse to `:id` so one endpoint is one
 * row in the table, not one row per record.
 */
@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  constructor(private readonly recorder: RequestMetricsRecorder) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();
    const at = Date.now();

    res.on('finish', () => {
      const path = req.originalUrl.split('?')[0];
      // CORS preflights are the browser's, not the portal's — they would only pad
      // the call counts.
      if (req.method === 'OPTIONS' || path.startsWith(EXCLUDED_PREFIX)) return;

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      this.recorder.record({
        at,
        method: req.method,
        route: normaliseRoute(path),
        durationMs,
        status: res.statusCode,
      });
    });

    next();
  }
}

export function normaliseRoute(path: string): string {
  return path
    .split('/')
    .map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment))
    .join('/');
}
