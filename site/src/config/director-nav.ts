import {
  CircleUser,
  CreditCard,
  FileText,
  HandCoins,
  LayoutDashboard,
  LibraryBig,
  Users,
} from 'lucide-react'
import type { PortalNavConfig } from '../types/nav'

export const directorNav: PortalNavConfig = {
  portalTitle: 'CARES Director Portal',
  basePath: '/director',
  items: [
    {
      type: 'group',
      label: 'Dashboard',
      icon: LayoutDashboard,
      children: [
        { label: 'Overview', to: '/director/overview' },
        { label: 'Statistics', to: '/director/statistics' },
        { label: 'System Performance', to: '/director/system-performance' },
      ],
    },
    { type: 'link', label: 'User Profile', to: '/director/profile', icon: CircleUser },
    { type: 'link', label: 'Manage Users', to: '/director/manage-users', icon: Users },
    { type: 'link', label: 'Post Monthly Report', to: '/director/post-requirements', icon: FileText },
    { type: 'link', label: 'Inter Donation Tracking', to: '/director/internal-donation-tracking', icon: LibraryBig },
    {
      type: 'group',
      label: 'Manage Event',
      icon: FileText,
      children: [
        { label: 'Event', to: '/director/event-list' },
        { label: 'Attendance', to: '/director/attendance-log' },
      ],
    },
    {
      type: 'group',
      label: 'Manage Beneficiary',
      icon: HandCoins,
      children: [
        { label: 'List', to: '/director/beneficiary-list' },
        { label: 'Request', to: '/director/beneficiary-request' },
      ],
    },
    {
      type: 'group',
      label: 'Manage Certificate',
      icon: CreditCard,
      children: [
        { label: 'Templates', to: '/director/templates-list' },
        { label: 'Deployed Templates', to: '/director/deployed-certificate-templates' },
      ],
    },
  ],
}
