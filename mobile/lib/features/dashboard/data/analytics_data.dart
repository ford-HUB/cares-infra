class MonthlyActivityStat {
  const MonthlyActivityStat({
    required this.label,
    required this.joined,
    required this.attended,
    required this.points,
    required this.hours,
  });

  final String label;
  final int joined;
  final int attended;
  final int points;
  final int hours;
}

class CategoryBreakdown {
  const CategoryBreakdown({
    required this.category,
    required this.count,
    required this.colorValue,
  });

  final String category;
  final int count;
  final int colorValue;
}

const kAnalyticsMonthlyStats = [
  MonthlyActivityStat(label: 'Jan', joined: 1, attended: 1, points: 25, hours: 4),
  MonthlyActivityStat(label: 'Feb', joined: 2, attended: 1, points: 25, hours: 4),
  MonthlyActivityStat(label: 'Mar', joined: 2, attended: 2, points: 50, hours: 8),
  MonthlyActivityStat(label: 'Apr', joined: 3, attended: 2, points: 50, hours: 8),
  MonthlyActivityStat(label: 'May', joined: 3, attended: 3, points: 75, hours: 12),
  MonthlyActivityStat(label: 'Jun', joined: 3, attended: 2, points: 50, hours: 8),
];

const kAnalyticsCategoryBreakdown = [
  CategoryBreakdown(category: 'Environment', count: 5, colorValue: 0xFF1F6B45),
  CategoryBreakdown(category: 'Education', count: 4, colorValue: 0xFF2E8B57),
  CategoryBreakdown(category: 'Health', count: 2, colorValue: 0xFF66BB6A),
];

class AnalyticsSummary {
  const AnalyticsSummary({
    required this.eventsJoined,
    required this.eventsAttended,
    required this.pointsEarned,
    required this.volunteerHours,
  });

  final int eventsJoined;
  final int eventsAttended;
  final int pointsEarned;
  final int volunteerHours;

  static const demo = AnalyticsSummary(
    eventsJoined: 14,
    eventsAttended: 11,
    pointsEarned: 275,
    volunteerHours: 44,
  );
}
