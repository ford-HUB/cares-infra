enum ActivityStatus {
  completed,
  registered,
  cancelled,
}

extension ActivityStatusX on ActivityStatus {
  String get label => switch (this) {
        ActivityStatus.completed => 'Completed',
        ActivityStatus.registered => 'Registered',
        ActivityStatus.cancelled => 'Cancelled',
      };
}

class MockActivityEntry {
  const MockActivityEntry({
    required this.id,
    required this.eventTitle,
    required this.category,
    required this.date,
    required this.location,
    required this.status,
    required this.hours,
    required this.pointsEarned,
  });

  final String id;
  final String eventTitle;
  final String category;
  final String date;
  final String location;
  final ActivityStatus status;
  final int hours;
  final int pointsEarned;
}

abstract final class MockActivities {
  static const summary = MockActivitySummary(
    totalHours: 0,
    eventsJoined: 2,
    pointsThisMonth: 240,
  );

  static const List<MockActivityEntry> entries = [
    MockActivityEntry(
      id: 'act-1',
      eventTitle: 'Food Drive for Families',
      category: 'Community',
      date: '2026-06-15',
      location: 'UCLM Extension Hall',
      status: ActivityStatus.registered,
      hours: 0,
      pointsEarned: 0,
    ),
    MockActivityEntry(
      id: 'act-2',
      eventTitle: 'Community Clean-Up Drive',
      category: 'Environment',
      date: '2026-06-28',
      location: 'Central Park, Main Street',
      status: ActivityStatus.registered,
      hours: 0,
      pointsEarned: 0,
    ),
    MockActivityEntry(
      id: 'act-3',
      eventTitle: 'Campus Orientation Assist',
      category: 'Education',
      date: '2026-05-10',
      location: 'UCLM Main Campus',
      status: ActivityStatus.completed,
      hours: 4,
      pointsEarned: 120,
    ),
    MockActivityEntry(
      id: 'act-4',
      eventTitle: 'Tree Planting Initiative',
      category: 'Environment',
      date: '2026-04-22',
      location: 'Riverside Greenbelt',
      status: ActivityStatus.completed,
      hours: 2,
      pointsEarned: 80,
    ),
    MockActivityEntry(
      id: 'act-5',
      eventTitle: 'Blood Donation Awareness',
      category: 'Health',
      date: '2026-03-08',
      location: 'City Health Center',
      status: ActivityStatus.cancelled,
      hours: 0,
      pointsEarned: 0,
    ),
  ];
}

class MockActivitySummary {
  const MockActivitySummary({
    required this.totalHours,
    required this.eventsJoined,
    required this.pointsThisMonth,
  });

  final int totalHours;
  final int eventsJoined;
  final int pointsThisMonth;
}
