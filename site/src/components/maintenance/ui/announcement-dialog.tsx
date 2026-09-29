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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatNumber } from '../../../constants/formatting'
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CHANNELS,
  ANNOUNCEMENT_TONE_LABELS,
  AUDIENCE_LABELS,
  CHANNEL_LABELS,
  audienceReachTotal,
} from '../../../constants/maintenance'
import type { AnnouncementDraft } from '../../../services/maintenance-service'
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementTone,
} from '../../../types/maintenance'

interface AnnouncementDialogProps {
  /** `null` keeps the dialog closed; an announcement without an id is a new one. */
  announcement: Announcement | null
  saving: boolean
  onClose: () => void
  onSubmit: (draft: AnnouncementDraft) => void
}

const TONES: AnnouncementTone[] = ['info', 'warning', 'critical']

const toLocalInput = (iso: string | null) =>
  iso ? dayjs(iso).format('YYYY-MM-DDTHH:mm') : ''

/**
 * Writing the notice. Audience and channel are separate choices on purpose — the same
 * words go to volunteers by push and to staff on the portal banner, and picking one
 * should never silently pick the other.
 */
export function AnnouncementDialog({
  announcement,
  saving,
  onClose,
  onSubmit,
}: AnnouncementDialogProps) {
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [body, setBody] = useState(announcement?.body ?? '')
  const [tone, setTone] = useState<AnnouncementTone>(announcement?.tone ?? 'info')
  const [audiences, setAudiences] = useState<AnnouncementAudience[]>(
    announcement?.audiences ?? ['volunteers'],
  )
  const [channels, setChannels] = useState<AnnouncementChannel[]>(
    announcement?.channels ?? ['portal'],
  )
  const [publishAt, setPublishAt] = useState(
    toLocalInput(announcement?.publishAt ?? dayjs().add(1, 'hour').toISOString()),
  )
  const [expiresAt, setExpiresAt] = useState(toLocalInput(announcement?.expiresAt ?? null))
  const [pinned, setPinned] = useState(announcement?.pinned ?? false)

  if (!announcement) return null

  const editing = announcement.id.length > 0
  const invalid =
    title.trim().length === 0 ||
    body.trim().length === 0 ||
    audiences.length === 0 ||
    channels.length === 0 ||
    !publishAt

  const submit = (state: Announcement['state']) =>
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      tone,
      audiences,
      channels,
      state,
      publishAt: new Date(publishAt).toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      pinned,
      windowId: announcement.windowId,
    })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit announcement' : 'New announcement'}</DialogTitle>
          <DialogDescription>
            Reaches {formatNumber(audienceReachTotal(audiences))} accounts across{' '}
            {channels.length} {channels.length === 1 ? 'channel' : 'channels'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="CARES is offline tonight, 1:00–2:30 AM"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="announcement-body">Message</Label>
            <Textarea
              id="announcement-body"
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What is happening, when it ends, and what the reader should do."
            />
          </div>

          <section className="space-y-2">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Tone</p>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={tone}
              onValueChange={(value) => value && setTone(value as AnnouncementTone)}
              className="w-full"
            >
              {TONES.map((one) => (
                <ToggleGroupItem key={one} value={one} className="flex-1 text-[12px]">
                  {ANNOUNCEMENT_TONE_LABELS[one]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-[12px] text-gray-500">
              Urgent colours the banner red everywhere it lands — keep it for downtime
              and safety.
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Audience</p>
            <ToggleGroup
              type="multiple"
              variant="outline"
              spacing={0}
              value={audiences}
              onValueChange={(value) => setAudiences(value as AnnouncementAudience[])}
              className="w-full"
            >
              {ANNOUNCEMENT_AUDIENCES.map((one) => (
                <ToggleGroupItem key={one} value={one} className="flex-1 text-[12px]">
                  {AUDIENCE_LABELS[one]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Channels</p>
            <ToggleGroup
              type="multiple"
              variant="outline"
              spacing={0}
              value={channels}
              onValueChange={(value) => setChannels(value as AnnouncementChannel[])}
              className="w-full"
            >
              {ANNOUNCEMENT_CHANNELS.map((one) => (
                <ToggleGroupItem key={one} value={one} className="flex-1 text-[12px]">
                  {CHANNEL_LABELS[one]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="announcement-publish">Goes out</Label>
              <Input
                id="announcement-publish"
                type="datetime-local"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-expires">Comes down</Label>
              <Input
                id="announcement-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
              <p className="text-[11px] text-gray-500">
                Empty means it stays until taken down by hand.
              </p>
            </div>
          </section>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="announcement-pinned">Pin to the top</Label>
              <p className="mt-0.5 text-[12px] text-gray-500">
                Held above every other notice in the feeds it reaches.
              </p>
            </div>
            <Switch
              id="announcement-pinned"
              checked={pinned}
              onCheckedChange={setPinned}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={saving || invalid}
            onClick={() => submit('draft')}
          >
            Save as draft
          </Button>
          <Button disabled={saving || invalid} onClick={() => submit('scheduled')}>
            {saving && <Loader2 className="animate-spin" />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
