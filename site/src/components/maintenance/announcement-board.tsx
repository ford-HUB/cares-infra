import { Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ANNOUNCEMENT_STATE_FILTER_ALL,
  ANNOUNCEMENT_STATE_LABELS,
  ANNOUNCEMENT_STATE_ORDER,
  type AnnouncementStateFilter,
} from '../../constants/maintenance'
import type { Announcement } from '../../types/maintenance'
import { AnnouncementEmpty, AnnouncementRow } from './announcement-row'

interface AnnouncementBoardProps {
  announcements: Announcement[]
  /** Counted over the whole board, so the filter chips don't move when one is chosen. */
  counts: Record<AnnouncementStateFilter, number>
  filter: AnnouncementStateFilter
  busyId: string | null
  onFilterChange: (filter: AnnouncementStateFilter) => void
  onCompose: () => void
  onEdit: (announcement: Announcement) => void
  onPublish: (announcement: Announcement) => void
  onTakeDown: (announcement: Announcement) => void
  onTogglePinned: (announcement: Announcement) => void
}

const COLUMNS = [
  { key: 'announcement', label: 'Announcement', width: 'lg:w-[44%]' },
  { key: 'audience', label: 'Audience & reach', width: 'lg:w-[22%]' },
  { key: 'state', label: 'Status', width: 'lg:w-[16%]' },
  { key: 'controls', label: 'Controls', width: 'lg:w-[18%]' },
] as const

/**
 * The other half of taking the system down: telling people. Pinned notices sort first
 * because that is where they appear in the feeds this board writes to.
 */
export function AnnouncementBoard({
  announcements,
  counts,
  filter,
  busyId,
  onFilterChange,
  onCompose,
  onEdit,
  onPublish,
  onTakeDown,
  onTogglePinned,
}: AnnouncementBoardProps) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <div className="flex flex-col gap-3 px-4 pt-3.5 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900">Announcements</p>
          <p className="text-[12px] text-gray-500">
            What users read in the portal banner, the app, and their inbox.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={filter}
            onValueChange={(value) =>
              onFilterChange((value || ANNOUNCEMENT_STATE_FILTER_ALL) as AnnouncementStateFilter)
            }
          >
            <ToggleGroupItem value={ANNOUNCEMENT_STATE_FILTER_ALL} className="text-[12px]">
              All
              <span className="ml-1.5 text-[11px] text-gray-400 tabular-nums">
                {counts[ANNOUNCEMENT_STATE_FILTER_ALL]}
              </span>
            </ToggleGroupItem>
            {ANNOUNCEMENT_STATE_ORDER.map((state) => (
              <ToggleGroupItem key={state} value={state} className="text-[12px]">
                {ANNOUNCEMENT_STATE_LABELS[state]}
                <span className="ml-1.5 text-[11px] text-gray-400 tabular-nums">
                  {counts[state]}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button size="sm" onClick={onCompose}>
            <Megaphone data-icon="inline-start" />
            New
          </Button>
        </div>
      </div>

      {announcements.length === 0 ? (
        <AnnouncementEmpty
          message={
            filter === ANNOUNCEMENT_STATE_FILTER_ALL
              ? 'Nothing has been announced yet. Write one before the next window opens.'
              : 'No announcement is in that state right now.'
          }
        />
      ) : (
        <>
          <div className="hidden items-center border-t border-gray-100 px-4 pt-3 pb-2 pl-8 lg:flex">
            {COLUMNS.map((column) => (
              <p
                key={column.key}
                className={`${column.width} text-[11px] tracking-wider text-gray-500 uppercase ${
                  column.key === 'controls' ? 'text-right' : ''
                }`}
              >
                {column.label}
              </p>
            ))}
          </div>

          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {announcements.map((announcement) => (
              <AnnouncementRow
                key={announcement.id}
                announcement={announcement}
                busy={busyId === announcement.id}
                onEdit={onEdit}
                onPublish={onPublish}
                onTakeDown={onTakeDown}
                onTogglePinned={onTogglePinned}
              />
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
