import { Injectable } from '@nestjs/common';
import {
  HostMetricsSampler,
  type CoreLoad,
  type HostSample,
  type ProcessLoad,
  type SampleRange,
} from '../../../infastructures/metrics/host-metrics-sampler';
import {
  RequestMetricsRecorder,
  percentile,
} from '../../../infastructures/metrics/request-metrics-recorder';
import type {
  CpuCoreDto,
  EndpointLatencyDto,
  PageLoadTimingDto,
  PerformanceSampleDto,
  PerformanceSnapshotDto,
  PerformanceTickDto,
  ProcessLoadDto,
  ReportPageTimingDto,
} from '../dto/system-performance-site-dto';
import {
  SystemPerformanceRepository,
  type PageTimingHistory,
} from '../repositories/system-performance-repository';

/** The endpoint table reads over the last five minutes — long enough to see a p95. */
const ENDPOINT_WINDOW_MS = 5 * 60 * 1000;

/** Rows the endpoint table is given; it sorts and scrolls the rest itself. */
const ENDPOINT_ROWS = 20;

/**
 * The performance page's view of the host: the sampler's readings joined with the
 * request recorder's per-route figures and the page timings the portal reported.
 */
@Injectable()
export class SystemPerformanceSiteService {
  constructor(
    private readonly sampler: HostMetricsSampler,
    private readonly requests: RequestMetricsRecorder,
    private readonly repository: SystemPerformanceRepository,
  ) {}

  async getSnapshot(range: SampleRange): Promise<PerformanceSnapshotDto> {
    const samples = this.sampler.samples(range);
    const latest = this.sampler.latest();
    const host = this.sampler.host();

    return {
      captured_at: latest?.at ?? new Date().toISOString(),
      host: {
        name: host.name,
        region: host.region,
        vcpu: host.vcpu,
        memory_gb: host.memoryGb,
        uptime_hours: Math.round(host.uptimeHours * 10) / 10,
      },
      samples: samples.map(toSampleDto),
      cores: this.sampler.coreLoads().map(toCoreDto),
      processes: this.sampler.processLoads().map(toProcessDto),
      endpoints: this.endpoints(),
      pages: toPageDtos(await this.repository.listPageTimings()),
      load_average: this.sampler.loadAverage(),
    };
  }

  /** The live tick — the newest reading only, with the breakdown it drives. */
  getTick(): PerformanceTickDto {
    const latest = this.sampler.latest();
    return {
      sample: latest ? toSampleDto(latest) : null,
      cores: this.sampler.coreLoads().map(toCoreDto),
      processes: this.sampler.processLoads().map(toProcessDto),
      load_average: this.sampler.loadAverage(),
    };
  }

  async recordPageTiming(report: ReportPageTimingDto): Promise<void> {
    await this.repository.recordPageTiming(report.route, {
      label: report.label,
      ttfbMs: Math.round(report.ttfb_ms),
      domReadyMs: Math.round(report.dom_ready_ms),
      interactiveMs: Math.round(report.interactive_ms),
      at: new Date().toISOString(),
    });
  }

  private endpoints(): EndpointLatencyDto[] {
    return this.requests
      .routes(ENDPOINT_WINDOW_MS)
      .slice(0, ENDPOINT_ROWS)
      .map((route) => ({
        id: `${route.method} ${route.route}`,
        method: route.method,
        route: route.route,
        calls_per_minute: route.callsPerMinute,
        p50_ms: route.p50Ms,
        p95_ms: route.p95Ms,
        error_rate: Math.round(route.errorRate * 1000) / 1000,
        trend: this.requests.trend(route.method, route.route),
      }));
  }
}

function toSampleDto(sample: HostSample): PerformanceSampleDto {
  return {
    at: sample.at,
    cpu_user: sample.cpuUser,
    cpu_system: sample.cpuSystem,
    cpu_io_wait: sample.cpuIoWait,
    memory_percent: sample.memoryPercent,
    requests_per_minute: sample.requestsPerMinute,
    response_p50_ms: sample.responseP50Ms,
    response_p95_ms: sample.responseP95Ms,
  };
}

function toCoreDto(core: CoreLoad): CpuCoreDto {
  return { id: core.id, usage_percent: core.usagePercent };
}

function toProcessDto(load: ProcessLoad): ProcessLoadDto {
  return {
    id: load.id,
    name: load.name,
    owner: load.owner,
    cpu_percent: load.cpuPercent,
    memory_mb: load.memoryMb,
    threads: load.threads,
  };
}

/** Medians per screen, slowest first — the label is the latest one reported. */
function toPageDtos(histories: PageTimingHistory[]): PageLoadTimingDto[] {
  return histories
    .filter((history) => history.records.length > 0)
    .map((history) => ({
      id: history.route,
      label: history.records[0].label,
      ttfb_ms: Math.round(
        percentile(
          history.records.map((one) => one.ttfbMs),
          0.5,
        ),
      ),
      dom_ready_ms: Math.round(
        percentile(
          history.records.map((one) => one.domReadyMs),
          0.5,
        ),
      ),
      interactive_ms: Math.round(
        percentile(
          history.records.map((one) => one.interactiveMs),
          0.5,
        ),
      ),
      samples: history.records.length,
    }))
    .sort((a, b) => b.interactive_ms - a.interactive_ms);
}
