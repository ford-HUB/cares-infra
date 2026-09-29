import { ANSWER_STATUS_STYLES } from '../../../constants/evaluation'
import type { EvaluationResponse } from '../../../types/evaluation'

/** Dense badge sized for the answers grid — the same cut as `UserStatusBadge`. */
export function AnswerStatusBadge({ status }: { status: EvaluationResponse['status'] }) {
  const style = ANSWER_STATUS_STYLES[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
