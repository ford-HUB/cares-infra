import type { ReactNode } from 'react'
import { AlertCircle, ClipboardList, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NEEDS_SURVEY_SOURCE_LABEL } from '../../../constants/residential-needs'

interface NeedsDataGateProps {
  loaded: boolean
  error: string | null
  empty: boolean
  onRetry: () => void
  /** Shown until the first fetch comes back. */
  skeleton: ReactNode
  children: ReactNode
}

/**
 * Stands in front of a Residential Needs screen: the skeleton on first load, the
 * error with a retry if that load failed, and an empty state until the first
 * beneficiary submits a survey. A later refetch keeps the screen up.
 */
export function NeedsDataGate({
  loaded,
  error,
  empty,
  onRetry,
  skeleton,
  children,
}: NeedsDataGateProps) {
  if (!loaded && error) {
    return (
      <Card size="sm" className="shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-gray-700">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RotateCw />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!loaded) return <>{skeleton}</>

  if (empty) {
    return (
      <Card size="sm" className="shadow-sm">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <ClipboardList className="h-7 w-7 text-gray-400" />
          <p className="text-sm font-semibold text-gray-900">No surveys submitted yet</p>
          <p className="max-w-md text-[13px] text-gray-500">
            Households appear here as soon as a beneficiary submits the{' '}
            {NEEDS_SURVEY_SOURCE_LABEL} from the mobile app.
          </p>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
