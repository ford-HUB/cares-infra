import 'mock_events.dart';

enum ActivityStatus { registered, attended }

class ActivityEntry {
  const ActivityEntry({
    required this.id,
    required this.title,
    required this.organization,
    required this.location,
    required this.date,
    required this.status,
  });

  final String id;
  final String title;
  final String organization;
  final String location;
  final DateTime date;
  final ActivityStatus status;

  String get monthLabel {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[date.month - 1];
  }

  String get dayLabel => date.day.toString();

  factory ActivityEntry.fromEvent(CaresEvent event, ActivityStatus status) {
    return ActivityEntry(
      id: event.id,
      title: event.title,
      organization: event.organization,
      location: event.location,
      date: event.date,
      status: status,
    );
  }
}

/// Demo attended activities shown on the Attended tab.
final kMockAttendedActivities = [
  ActivityEntry(
    id: 'attended-1',
    title: 'School Supplies Distribution',
    organization: 'DepEd Volunteers',
    location: 'Talisay City, Cebu',
    date: DateTime(2026, 6, 21),
    status: ActivityStatus.attended,
  ),
  ActivityEntry(
    id: 'attended-2',
    title: 'Medical Mission — Minglanilla',
    organization: 'CARES Health Team',
    location: 'Minglanilla, Cebu',
    date: DateTime(2026, 6, 28),
    status: ActivityStatus.attended,
  ),
];

/// Fallback joined activities when the user has not registered yet.
final kMockJoinedActivities = [
  ActivityEntry.fromEvent(kMockUpcomingEvents[0], ActivityStatus.registered),
  ActivityEntry.fromEvent(kMockFeaturedEvents[0], ActivityStatus.registered),
];
