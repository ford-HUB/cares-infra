import { Injectable } from '@nestjs/common';
import {
  SystemDiagnosticsChecker,
  type DiagnosticCheck,
  type DiagnosticHistoryEntry,
  type DiagnosticReport,
} from '../../../schedulers/scheduler-diagnostics';
import type {
  DiagnosticCheckDto,
  SystemDiagnosticsDto,
} from '../dto/system-diagnostics-site-dto';

/** Last minutely report, or a fresh one on "Check now". Probes live with the schedulers. */
@Injectable()
export class SystemDiagnosticsSiteService {
  constructor(private readonly checker: SystemDiagnosticsChecker) {}

  async getDiagnostics(): Promise<SystemDiagnosticsDto> {
    const [latest, history] = await Promise.all([
      this.checker.latest(),
      this.checker.history(),
    ]);
    return toDiagnosticsDto(latest, history);
  }

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
    // Stored newest first; the strip reads oldest first.
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
