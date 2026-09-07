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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  MAINTENANCE_SURFACES,
  NOTICE_LEAD_PRESETS,
  SURFACE_HINTS,
  SURFACE_LABELS,
  formatNoticeLead,
  formatWindowLength,
} from '../../../constants/maintenance'
import type { MaintenanceWindowDraft } from '../../../services/maintenance-service'
import type { MaintenanceSurface, MaintenanceWindow } from '../../../types/maintenance'

interface MaintenanceWindowDialogProps {
  /** `null` keeps the dialog closed; a window without an id is a new booking. */
  window: MaintenanceWindow | null
  saving: boolean
  onClose: () => void
  onSubmit: (draft: MaintenanceWindowDraft) => void
}

const toLocalInput = (iso: string) => dayjs(iso).format('YYYY-MM-DDTHH:mm')

/**
 * Booking downtime. The three things that decide whether a window lands well are all
 * here: when it runs, what it closes, and how far ahead users hear about it.
 */
export function MaintenanceWindowDialog({
  window,
  saving,
  onClose,
  onSubmit,
}: MaintenanceWindowDialogProps) {
  const [title, setTitle] = useState(window?.title ?? '')
  const [reason, setReason] = useState(window?.reason ?? '')
  const [surfaces, setSurfaces] = useState<MaintenanceSurface[]>(window?.surfaces ?? [])
  const [startAt, setStartAt] = useState(
    toLocalInput(window?.startAt ?? dayjs().add(1, 'day').hour(1).minute(0).toISOString()),
  )
  const [endAt, setEndAt] = useState(
    toLocalInput(window?.endAt ?? dayjs().add(1, 'day').hour(2).minute(30).toISOString()),
  )
  const [noticeLeadMinutes, setNoticeLeadMinutes] = useState(
    window?.noticeLeadMinutes ?? 60,
  )
  const [allowAdmins, setAllowAdmins] = useState(window?.allowAdmins ?? true)

  if (!window) return null

  const editing = window.id.length > 0
  // A window that ends before it starts closes the system forever; catch it here.
  const invalidRange = !startAt || !endAt || dayjs(endAt).isBefore(dayjs(startAt))
  const invalid = title.trim().length === 0 || surfaces.length === 0 || invalidRange

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit window' : 'Schedule window'}</DialogTitle>
          <DialogDescription>
            The surfaces you name here are closed for the length of the window, and
            reopen on their own when it ends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="window-title">Title</Label>
            <Input
              id="window-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Database migration — attendance tables"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="window-reason">Reason</Label>
            <Textarea
              id="window-reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="One line staff will still understand in three months."
            />
          </div>

          <section className="space-y-2">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              Surfaces to close
            </p>
            <ToggleGroup
              type="multiple"
              variant="outline"
              spacing={0}
              value={surfaces}
              onValueChange={(value) => setSurfaces(value as MaintenanceSurface[])}
              className="w-full"
            >
              {MAINTENANCE_SURFACES.map((surface) => (
                <ToggleGroupItem key={surface} value={surface} className="flex-1 text-[12px]">
                  {SURFACE_LABELS[surface]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-[12px] text-gray-500">
              {surfaces.length === 0
                ? 'Pick at least one — a window that closes nothing does nothing.'
                : surfaces.map((one) => SURFACE_HINTS[one]).join(' ')}
            </p>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">When</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="window-start">Starts</Label>
                <Input
                  id="window-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="window-end">Ends</Label>
                <Input
                  id="window-end"
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  aria-invalid={invalidRange}
                />
              </div>
            </div>
            <p
              className={`text-[12px] ${invalidRange ? 'text-red-700' : 'text-gray-500'}`}
            >
              {invalidRange
                ? 'The window has to end after it starts.'
                : `Holds the system for ${formatWindowLength(startAt, endAt)}.`}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="window-notice">Heads-up notice</Label>
              <Select
                value={String(noticeLeadMinutes)}
                onValueChange={(value) => setNoticeLeadMinutes(Number(value))}
              >
                <SelectTrigger id="window-notice" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTICE_LEAD_PRESETS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {formatNoticeLead(minutes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="window-allow-admins">Admins keep portal access</Label>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  Staff can still reach the portal while the window runs.
                </p>
              </div>
              <Switch
                id="window-allow-admins"
                checked={allowAdmins}
                onCheckedChange={setAllowAdmins}
              />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={saving || invalid}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                reason: reason.trim(),
                surfaces,
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString(),
                noticeLeadMinutes,
                allowAdmins,
              })
            }
          >
            {saving && <Loader2 className="animate-spin" />}
            {editing ? 'Save window' : 'Schedule window'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
