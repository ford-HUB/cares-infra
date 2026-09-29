import { BellOff, BellRing } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  browserNotificationPermission,
  requestBrowserNotificationPermission,
  type BrowserNotificationPermission,
} from '../../../utils/browser-notifications'

/**
 * The one control for desktop alerts. Browsers only honour the permission prompt
 * from a click, so the ask lives on a button; once granted or refused there is
 * nothing more the page can do, and the button says so instead of hiding.
 */
export function DesktopAlertsButton() {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() =>
    browserNotificationPermission(),
  )

  if (permission === 'unsupported') return null

  if (permission === 'granted') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-emerald-700">
              <BellRing className="h-3.5 w-3.5" />
              Desktop alerts on
            </span>
          </TooltipTrigger>
          <TooltipContent>
            New notices pop up on your desktop while the portal is open. Turn them off in
            your browser&apos;s site settings.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (permission === 'denied') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-gray-400">
              <BellOff className="h-3.5 w-3.5" />
              Desktop alerts blocked
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Your browser has blocked alerts for this site. Allow notifications in the site
            settings to turn them back on.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        void requestBrowserNotificationPermission().then(setPermission)
      }}
    >
      <BellRing data-icon="inline-start" />
      Enable desktop alerts
    </Button>
  )
}
