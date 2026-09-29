import { useState } from 'react'
import dayjs from 'dayjs'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { MaintenanceMode } from '../../../types/maintenance'

interface DowntimeNoticeDialogProps {
  /** The current switch state; `null` keeps the dialog closed. */
  mode: MaintenanceMode | null
  saving: boolean
  onClose: () => void
  onSubmit: (
    patch: Pick<MaintenanceMode, 'message' | 'allowAdmins' | 'estimatedEndAt'>,
  ) => void
}

/** `datetime-local` wants wall-clock text, not an ISO instant. */
const toLocalInput = (iso: string | null) =>
  iso ? dayjs(iso).format('YYYY-MM-DDTHH:mm') : ''

/**
 * What users see while CARES is closed. It is edited apart from the switch itself so
 * the wording can be settled ahead of time — nobody should be writing copy at 1 AM
 * with the system already down.
 */
export function DowntimeNoticeDialog({
  mode,
  saving,
  onClose,
  onSubmit,
}: DowntimeNoticeDialogProps) {
  const [message, setMessage] = useState(mode?.message ?? '')
  const [allowAdmins, setAllowAdmins] = useState(mode?.allowAdmins ?? true)
  const [estimatedEndAt, setEstimatedEndAt] = useState(
    toLocalInput(mode?.estimatedEndAt ?? null),
  )

  if (!mode) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Downtime notice</DialogTitle>
          <DialogDescription>
            Shown on every closed surface in place of the app. Say what is happening and
            when it ends — that is what stops the support tickets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="downtime-message">Message</Label>
            <Textarea
              id="downtime-message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="CARES is briefly offline for scheduled maintenance…"
            />
            <p className="text-[12px] text-gray-500">
              Volunteers read this on their phones. Tell them whether their offline
              attendance is safe.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="downtime-eta">Expected back at</Label>
            <Input
              id="downtime-eta"
              type="datetime-local"
              value={estimatedEndAt}
              onChange={(event) => setEstimatedEndAt(event.target.value)}
            />
            <p className="text-[12px] text-gray-500">
              Leave empty only if you truly cannot say — an open-ended notice reads as
              an outage.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-4">
            <div className="min-w-0">
              <Label htmlFor="downtime-allow-admins">Admins keep portal access</Label>
              <p className="mt-0.5 text-[12px] text-gray-500">
                Off means the switch locks you out too — you would need the server to
                turn it back on.
              </p>
            </div>
            <Switch
              id="downtime-allow-admins"
              checked={allowAdmins}
              onCheckedChange={setAllowAdmins}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                message: message.trim(),
                allowAdmins,
                estimatedEndAt: estimatedEndAt
                  ? new Date(estimatedEndAt).toISOString()
                  : null,
              })
            }
            disabled={saving || message.trim().length === 0}
          >
            {saving && <Loader2 className="animate-spin" />}
            Save notice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
