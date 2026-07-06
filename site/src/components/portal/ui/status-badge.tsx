import type { NotificationCategory } from '../../../types/notification'

const categoryStyles: Record<
  NotificationCategory,
  { bg: string; text: string; label: string }
> = {
  volunteer: {
    bg: 'var(--cares-tag-volunteer-bg)',
    text: 'var(--cares-tag-volunteer-text)',
    label: 'Volunteer',
  },
  reminder: {
    bg: 'var(--cares-tag-reminder-bg)',
    text: 'var(--cares-tag-reminder-text)',
    label: 'Reminder',
  },
  system: {
    bg: 'var(--cares-tag-system-bg)',
    text: 'var(--cares-tag-system-text)',
    label: 'System',
  },
  event: {
    bg: 'var(--cares-tag-volunteer-bg)',
    text: 'var(--cares-tag-volunteer-text)',
    label: 'Event',
  },
}

interface StatusBadgeProps {
  category: NotificationCategory
}

export function StatusBadge({ category }: StatusBadgeProps) {
  const style = categoryStyles[category]
  return (
    <span
      className="inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  )
}
