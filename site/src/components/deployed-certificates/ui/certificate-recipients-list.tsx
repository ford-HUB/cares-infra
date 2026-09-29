import { CheckCircle2, Circle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateShort, formatNumber } from '../../../constants/formatting'
import type { CertificateRecipient } from '../../../types/deployed-certificate'

interface CertificateRecipientsListProps {
  recipients: CertificateRecipient[] | null
  error: string | null
  /** True while the deployment's event has not finished — nothing can be issued yet. */
  scheduled: boolean
}

/**
 * Who the issuing sweep has reached, in the detail modal's column. Each row is one
 * generated certificate; the tick is whether the volunteer has opened it in the app.
 */
export function CertificateRecipientsList({
  recipients,
  error,
  scheduled,
}: CertificateRecipientsListProps) {
  return (
    <div className="space-y-1 border-t border-gray-100 pt-3">
      <p className="flex items-baseline justify-between text-[11px] tracking-wider text-gray-500 uppercase">
        <span>Recipients</span>
        {recipients && recipients.length > 0 && (
          <span className="font-normal normal-case tracking-normal text-gray-400">
            {formatNumber(recipients.length)} issued
          </span>
        )}
      </p>

      {error ? (
        <p className="text-[12px] text-red-600">{error}</p>
      ) : recipients === null ? (
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      ) : recipients.length === 0 ? (
        <p className="text-[12px] text-gray-400">
          {scheduled
            ? 'Certificates are generated once the event has finished.'
            : 'No participant has qualified yet — a certificate is issued once attendance is confirmed and the post-event questionnaire is answered.'}
        </p>
      ) : (
        <ul className="max-h-48 space-y-0.5 overflow-y-auto pr-1">
          {recipients.map((recipient) => (
            <li
              key={recipient.id}
              className="flex items-center gap-2"
              title={
                recipient.claimedAt
                  ? `Opened ${formatDateShort(recipient.claimedAt)}`
                  : 'Not opened yet'
              }
            >
              {recipient.claimedAt ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-gray-300" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-gray-700">
                  {recipient.name}
                </span>
                <span className="block truncate font-mono text-[10px] text-gray-400">
                  {recipient.certificateNumber} · issued{' '}
                  {formatDateShort(recipient.issuedAt)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
