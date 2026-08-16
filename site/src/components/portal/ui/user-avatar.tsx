interface UserAvatarProps {
  firstName: string
  lastName: string
  size?: 'sm' | 'lg'
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function UserAvatar({ firstName, lastName, size = 'sm' }: UserAvatarProps) {
  const dimensions = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-[11px]'

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--cares-primary)] font-semibold text-white ${dimensions}`}
    >
      {initials(firstName, lastName)}
    </span>
  )
}
