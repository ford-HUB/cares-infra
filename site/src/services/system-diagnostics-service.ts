import type {
  DiagnosticCheck,
  DiagnosticReport,
  SystemDiagnostics,
} from '../types/system-diagnostics'
import { apiClient, parseApiError } from './api-client'

interface DiagnosticCheckApiResponse {
  id: string
  group: DiagnosticCheck['group']
  name: string
  status: DiagnosticCheck['status']
  latency_ms: number | null
  detail: string
}

interface SystemDiagnosticsApiResponse {
  report: {
    checked_at: string
    duration_ms: number
    overall: DiagnosticReport['overall']
    source: DiagnosticReport['source']
    checks: DiagnosticCheckApiResponse[]
  } | null
  history: {
    checked_at: string
    overall: DiagnosticReport['overall']
    failing: number
  }[]
}

function mapDiagnostics(data: SystemDiagnosticsApiResponse): SystemDiagnostics {
  return {
    report: data.report
      ? {
          checkedAt: data.report.checked_at,
          durationMs: data.report.duration_ms,
          overall: data.report.overall,
          source: data.report.source,
          checks: data.report.checks.map((check) => ({
            id: check.id,
            group: check.group,
            name: check.name,
            status: check.status,
            latencyMs: check.latency_ms,
            detail: check.detail,
          })),
        }
      : null,
    history: data.history.map((entry) => ({
      checkedAt: entry.checked_at,
      overall: entry.overall,
      failing: entry.failing,
    })),
  }
}

async function diagnosticsRequest(
  request: () => Promise<{ data: { ok: true; data: SystemDiagnosticsApiResponse } }>,
): Promise<SystemDiagnostics> {
  try {
    const { data: body } = await request()
    return mapDiagnostics(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export function fetchSystemDiagnostics(): Promise<SystemDiagnostics> {
  return diagnosticsRequest(() => apiClient.get('/api/v1/system-diagnostics'))
}

export function runSystemDiagnostics(): Promise<SystemDiagnostics> {
  return diagnosticsRequest(() =>
    apiClient.post('/api/v1/system-diagnostics/check'),
  )
}
