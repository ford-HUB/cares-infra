import { Injectable } from '@nestjs/common';
import {
  SystemDiagnosticsChecker,
  type DiagnosticCheck,
  type DiagnosticHistoryEntry,
  type DiagnosticReport,
} from '../../../schedulers/scheduler.diagnostics';
import type {
  DiagnosticCheckDto,
  SystemDiagnosticsDto,
} from '../dto/system-diagnostics-site-dto';

/**
 * The Diagnostics screen's view of the health sweep: the last report the minutely
 * job wrote, or a fresh one when staff press "Check now". The probes themselves
 * live with the schedulers, because that is what they exist to watch over.
 */
@Injectable()
export class SystemDiagnosticsSiteService {
  constructor(private readonly checker: SystemDiagnosticsChecker) {}

  /** The last sweep's report, with the strip of past verdicts under it. */
  async getDiagnostics(): Promise<SystemDiagnosticsDto> {
    const [latest, history] = await Promise.all([
      this.checker.latest(),
      this.checker.history(),
    ]);
    return toDiagnosticsDto(latest, history);
  }

  /** Runs every probe now and answers with the fresh report. */
  async runDiagnostics(): Promise<SystemDiagnosticsDto> {
    const report = await this.checker.run('manual');
    return toDiagnosticsDto(report, await this.checker.history());
  }
}

function toDiagnosticsDto(
  report: DiagnosticReport | null,
  history: DiagnosticHistoryEntry[],
): SystemDiagnosticsDto {
  return {
    report: report
      ? {
          checked_at: report.checkedAt,
          duration_ms: report.durationMs,
          overall: report.overall,
          source: report.source,
          checks: report.checks.map(toCheckDto),
        }
      : null,
    // Stored newest first; the strip reads oldest to newest.
    history: [...history].reverse().map((entry) => ({
      checked_at: entry.checkedAt,
      overall: entry.overall,
      failing: entry.failing,
    })),
  };
}

function toCheckDto(check: DiagnosticCheck): DiagnosticCheckDto {
  return {
    id: check.id,
    group: check.group,
    name: check.name,
    status: check.status,
    latency_ms: check.latencyMs,
    detail: check.detail,
  };
}
