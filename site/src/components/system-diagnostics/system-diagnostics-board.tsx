import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  DIAGNOSTIC_GROUP_HINTS,
  DIAGNOSTIC_GROUP_LABELS,
  DIAGNOSTIC_GROUP_ORDER,
  DIAGNOSTIC_STATUS_DOT_STYLES,
  DIAGNOSTIC_STATUS_LABELS,
  DIAGNOSTIC_STATUS_TEXT_STYLES,
} from '../../constants/system-diagnostics'
import type { DiagnosticCheck, DiagnosticGroup } from '../../types/system-diagnostics'

interface SystemDiagnosticsBoardProps {
  checks: DiagnosticCheck[]
}

const RANK = { fail: 0, warn: 1, ok: 2 } as const

/**
 * Every probe, grouped by what it watches, with the failing ones lifted to the top
 * of their group. A group card carries its worst status in its header so the eye
 * lands on the broken area before reading a single row.
 */
export function SystemDiagnosticsBoard({ checks }: SystemDiagnosticsBoardProps) {
  const grouped = new Map<DiagnosticGroup, DiagnosticCheck[]>()
  for (const check of checks) {
    const group = grouped.get(check.group) ?? []
    group.push(check)
    grouped.set(check.group, group)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {DIAGNOSTIC_GROUP_ORDER.filter((group) => grouped.has(group)).map((group) => {
        const rows = [...(grouped.get(group) ?? [])].sort(
          (a, b) => RANK[a.status] - RANK[b.status],
        )
        const worst = rows[0]?.status ?? 'ok'
        const failing = rows.filter((one) => one.status === 'fail').length
        const warning = rows.filter((one) => one.status === 'warn').length

        return (
          <Card key={group} size="sm" className="shadow-sm">
            <CardContent className="space-y-3">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        DIAGNOSTIC_STATUS_DOT_STYLES[worst],
                      )}
                      aria-label={DIAGNOSTIC_STATUS_LABELS[worst]}
                    />
                    {DIAGNOSTIC_GROUP_LABELS[group]}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {DIAGNOSTIC_GROUP_HINTS[group]}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-[11px] tabular-nums',
                    worst === 'ok' ? 'text-gray-400' : DIAGNOSTIC_STATUS_TEXT_STYLES[worst],
                  )}
                >
                  {failing > 0
                    ? `${failing} failing`
                    : warning > 0
                      ? `${warning} warning`
                      : `${rows.length} ok`}
                </span>
              </header>

              <ul className="divide-y divide-gray-100">
                {rows.map((check) => (
                  <li
                    key={check.id}
                    className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0"
                  >
                    <span
                      className={cn(
                        'mt-[5px] h-2 w-2 shrink-0 rounded-full',
                        DIAGNOSTIC_STATUS_DOT_STYLES[check.status],
                      )}
                      aria-label={DIAGNOSTIC_STATUS_LABELS[check.status]}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-gray-800">
                          {check.name}
                        </span>
                        {check.latencyMs !== null && (
                          <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
                            {check.latencyMs} ms
                          </span>
                        )}
                      </p>
                      <p
                        className={cn(
                          'text-[12px] leading-snug break-words',
                          DIAGNOSTIC_STATUS_TEXT_STYLES[check.status],
                        )}
                      >
                        {check.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
