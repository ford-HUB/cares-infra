import { cn } from '@/lib/utils'
import { avatarTone, initialsOf } from '../../../constants/certificate-design'

interface SignatoryAvatarProps {
  name: string
  /** Absent in the mock data — initials stand in until accounts carry a photo. */
  avatarUrl?: string
  size?: 'sm' | 'md'
}

export function SignatoryAvatar({ name, avatarUrl, size = 'md' }: SignatoryAvatarProps) {
  const dimensions = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-[12px]'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', dimensions)}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        dimensions,
        avatarTone(name),
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
