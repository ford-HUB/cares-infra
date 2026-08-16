import type { NotificationFeed } from '../types/notification'

export const mockNotifications: NotificationFeed = {
  summary: { total: 5, unread: 2, read: 3 },
  items: [
    {
      id: 'n1',
      title: 'Volunteer verification needed',
      description: 'A new volunteer registration requires your review before they can join upcoming events.',
      category: 'volunteer',
      read: false,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
    {
      id: 'n2',
      title: 'Monthly report deadline',
      description: 'Submit your department monthly report before the end of this week.',
      category: 'reminder',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n3',
      title: 'System maintenance scheduled',
      description: 'The portal will undergo maintenance on Saturday from 1:00 AM to 3:00 AM.',
      category: 'system',
      read: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n4',
      title: 'New event published',
      description: 'Community Clean-Up Drive has been published and is open for volunteer registration.',
      category: 'event',
      read: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n5',
      title: 'Attendance log updated',
      description: 'Attendance records for Barangay Outreach Program were updated successfully.',
      category: 'system',
      read: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}

export const mockAdminOverview = {
  stats: {
    totalVolunteers: 128,
    totalStudents: 450,
    totalEvents: 56,
    upcomingEvents: 4,
    ongoingEvents: 2,
    completedEvents: 50,
    totalBeneficiaries: 320,
    totalParticipants: 890,
    recentRegistrations: 24,
    totalAttendance: 1200,
    recentAttendance: 89,
  },
  recentActivities: [
    { id: 'a1', label: 'Event registration approved', time: '2 hours ago' },
    { id: 'a2', label: 'Document submitted for review', time: '5 hours ago' },
    { id: 'a3', label: 'New volunteer joined', time: '1 day ago' },
  ],
}

export const mockDepartmentOverview = {
  departmentName: 'College of Engineering',
  upcomingEvents: 2,
  pendingDocuments: 3,
  activeVolunteers: 45,
  monthlyCompletion: 78,
  pendingApprovals: 3,
  recentRegistrations: 12,
  recentAttendance: 34,
  recentSubmissions: 5,
}
