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

class VolunteerActivityEntry {
  const VolunteerActivityEntry({
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

class VolunteerActivitySummary {
  const VolunteerActivitySummary({
    required this.totalHours,
    required this.eventsJoined,
    required this.pointsThisMonth,
  });

  static const empty = VolunteerActivitySummary(
    totalHours: 0,
    eventsJoined: 0,
    pointsThisMonth: 0,
  );

  final int totalHours;
  final int eventsJoined;
  final int pointsThisMonth;
}
