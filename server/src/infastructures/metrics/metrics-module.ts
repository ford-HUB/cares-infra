import { Global, Module } from '@nestjs/common';
import { HostMetricsSampler } from './host-metrics-sampler';
import { RequestMetricsRecorder } from './request-metrics-recorder';

/** Global: the middleware runs on every route. */
@Global()
@Module({
  providers: [RequestMetricsRecorder, HostMetricsSampler],
  exports: [RequestMetricsRecorder, HostMetricsSampler],
})
export class MetricsModule {}
