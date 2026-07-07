import { CircleUser, FileCog, LayoutDashboard } from 'lucide-react'
import type { PortalNavConfig } from '../types/nav'

export const staffNav: PortalNavConfig = {
  portalTitle: 'CARES Staff Portal',
  basePath: '/management',
  items: [
    {
      type: 'group',
      label: 'Dashboard',
      icon: LayoutDashboard,
      children: [{ label: 'Overview', to: '/management/dashboard' }],
    },
    { type: 'link', label: 'User Profile', to: '/management/profile', icon: CircleUser },
    {
      type: 'group',
      label: 'Programs & Events',
      icon: FileCog,
      children: [
        { label: 'Event', to: '/management/event-list' },
        { label: 'Attendance', to: '/management/attendance-log' },
      ],
    },
  ],
}

export function staffPortalLabel(role: string | undefined): string {
  switch (role) {
    case 'staff':
      return 'CARES Staff Portal'
    case 'coordinator':
      return 'CARES Coordinator Portal'
    case 'assistant_coordinator':
      return 'CARES Assist Coordinator Portal'
    default:
      return 'CARES Staff Portal'
  }
}
