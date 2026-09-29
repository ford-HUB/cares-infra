import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infastructures/redis/redis-service';

/** One screen load as the portal reported it. */
export interface PageTimingRecord {
  label: string;
  ttfbMs: number;
  domReadyMs: number;
  interactiveMs: number;
  at: string;
}

export interface PageTimingHistory {
  route: string;
  records: PageTimingRecord[];
}

/** Loads kept per screen — enough for a stable median, small enough to read whole. */
const PAGE_HISTORY_MAX = 100;

const PAGE_KEY_PREFIX = 'metrics:page:';

/**
 * Browser-side load times live in Redis rather than memory: they are reported by
 * many tabs over days, and a restart must not reset the medians to nothing.
 */
@Injectable()
export class SystemPerformanceRepository {
  constructor(private readonly redisService: RedisService) {}

  async recordPageTiming(
    route: string,
    record: PageTimingRecord,
  ): Promise<void> {
    await this.redisService.pushCapped(
      `${PAGE_KEY_PREFIX}${route}`,
      record,
      PAGE_HISTORY_MAX,
    );
  }

  async listPageTimings(): Promise<PageTimingHistory[]> {
    const keys = await this.redisService.scanKeys(`${PAGE_KEY_PREFIX}*`);
    return Promise.all(
      keys.map(async (key) => ({
        route: key.slice(PAGE_KEY_PREFIX.length),
        records: await this.redisService.listAll<PageTimingRecord>(key),
      })),
    );
  }
}
