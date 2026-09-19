/// "12 October, 26" — the compact date the home tab's cards lead with.
String homeEventDateLabel(DateTime date) {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  final year = (date.year % 100).toString().padLeft(2, '0');
  return '${date.day} ${months[date.month - 1]}, $year';
}

/// "12–15 October, 26" when an event spans days, otherwise the single date.
String homeEventRangeLabel(DateTime start, DateTime end) {
  final sameDay =
      start.year == end.year &&
      start.month == end.month &&
      start.day == end.day;
  if (sameDay || end.isBefore(start)) return homeEventDateLabel(start);
  if (start.year == end.year && start.month == end.month) {
    return '${start.day}–${homeEventDateLabel(end)}';
  }
  return '${homeEventDateLabel(start)} – ${homeEventDateLabel(end)}';
}
