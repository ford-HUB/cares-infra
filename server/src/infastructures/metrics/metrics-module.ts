import { Global, Module } from '@nestjs/common';
import { HostMetricsSampler } from './host-metrics-sampler';
import { RequestMetricsRecorder } from './request-metrics-recorder';

/**
 * What the server knows about its own health: request timings from the middleware
 * and host readings from the sampler. Global because the middleware is applied to
 * every route from `app-module.ts`, and the performance module reads from here.
 */
@Global()
@Module({
  providers: [RequestMetricsRecorder, HostMetricsSampler],
  exports: [RequestMetricsRecorder, HostMetricsSampler],
})
export class MetricsModule {}
