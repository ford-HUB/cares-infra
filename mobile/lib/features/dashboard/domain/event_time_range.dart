enum EventTimeRange {
  all('All'),
  today('Today'),
  tomorrow('Tomorrow'),
  thisWeek('This Week'),
  thisMonth('This Month');

  const EventTimeRange(this.label);

  final String label;

  static DateTime _dayOf(DateTime date) =>
      DateTime(date.year, date.month, date.day);

  /// "This week" is today through the next six days.
  bool contains(DateTime date, {DateTime? now}) {
    final today = _dayOf(now ?? DateTime.now());
    final day = _dayOf(date);
    switch (this) {
      case EventTimeRange.all:
        return true;
      case EventTimeRange.today:
        return day == today;
      case EventTimeRange.tomorrow:
        return day == today.add(const Duration(days: 1));
      case EventTimeRange.thisWeek:
        return !day.isBefore(today) &&
            day.isBefore(today.add(const Duration(days: 7)));
      case EventTimeRange.thisMonth:
        return day.year == today.year && day.month == today.month;
    }
  }
}
