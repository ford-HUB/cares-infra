class CaresEvent {
  const CaresEvent({
    required this.id,
    required this.title,
    required this.organization,
    required this.date,
    required this.time,
    required this.location,
    required this.description,
    required this.slotsLeft,
    required this.daysUntil,
    required this.capacityFilled,
    required this.category,
    required this.tags,
    required this.registeredCount,
    required this.totalCapacity,
    required this.requirements,
    required this.venueLatitude,
    required this.venueLongitude,
    this.attendanceRadiusMeters = 500,
    this.isFeatured = false,
    this.openToBeneficiaries = false,
    this.isCompleted = false,
    this.hoursCompleted,
    this.imageAsset,
    this.imageUrls = const [],
    this.organizerDescription,
  });

  final String id;
  final String title;
  final String organization;
  final DateTime date;
  final String time;
  final String location;
  final String description;
  final int slotsLeft;
  final int daysUntil;
  final double capacityFilled;
  final String category;
  final List<String> tags;
  final int registeredCount;
  final int totalCapacity;
  final List<String> requirements;
  final double venueLatitude;
  final double venueLongitude;
  final double attendanceRadiusMeters;
  final bool isFeatured;

  /// True when beneficiaries may attend or receive assistance at this event.
  /// Static prototype flag — the beneficiary events tab shows only these.
  final bool openToBeneficiaries;

  /// True once the event has ended and participation has been closed out.
  final bool isCompleted;

  /// Service hours credited to volunteers who completed the event.
  final int? hoursCompleted;
  final String? imageAsset;

  /// Server-streamed images (authenticated URLs), in upload order. Empty on
  /// the prototype fixture, which still draws the category placeholder.
  final List<String> imageUrls;

  /// Short blurb about the organizer shown under "About the organizer".
  /// Null on server rows for now; the details screen falls back to a generic
  /// line built from [organization].
  final String? organizerDescription;

  String get monthLabel {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[date.month - 1];
  }

  String get dayLabel => date.day.toString();

  String get countdownLabel => '${daysUntil}d';

  String get countdownLeftLabel => '${daysUntil}d left';

  String get formattedDate => '${date.month}/${date.day}/${date.year}';

  String get dateTimeLabel => '$formattedDate · $time';

  String get longDateLabel {
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
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  String get statusLabel => isCompleted ? 'Completed' : 'Upcoming';

  /// Assumed length of an event when the server gives no end time — the
  /// geofence keeps recording this long after [startsAt].
  static const Duration defaultDuration = Duration(hours: 4);

  /// How early before [startsAt] the tracker starts recording, so the
  /// volunteer's approach to the venue is captured too.
  static const Duration trackingLeadTime = Duration(minutes: 30);

  /// [date] combined with the clock time parsed out of [time] (`'8:00 AM'`).
  /// Falls back to midnight when [time] does not parse.
  DateTime get startsAt {
    final match = RegExp(
      r'^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?',
    ).firstMatch(time);
    if (match == null) return DateTime(date.year, date.month, date.day);
    var hour = int.parse(match.group(1)!);
    final minute = int.tryParse(match.group(2) ?? '') ?? 0;
    final meridiem = match.group(3)?.toUpperCase();
    if (meridiem == 'PM' && hour < 12) hour += 12;
    if (meridiem == 'AM' && hour == 12) hour = 0;
    return DateTime(date.year, date.month, date.day, hour, minute);
  }

  DateTime get endsAt {
    final hours = hoursCompleted;
    final duration = hours != null && hours > 0
        ? Duration(hours: hours)
        : defaultDuration;
    return startsAt.add(duration);
  }

  /// Window in which the geofence records coordinates for this event.
  DateTime get trackingStartsAt => startsAt.subtract(trackingLeadTime);

  bool isTrackingWindowOpen(DateTime now) =>
      !isCompleted && !now.isBefore(trackingStartsAt) && now.isBefore(endsAt);

  bool isSameDay(DateTime other) =>
      date.year == other.year &&
      date.month == other.month &&
      date.day == other.day;

  bool matchesQuery(String query) {
    if (query.trim().isEmpty) return true;
    final q = query.trim().toLowerCase();
    return title.toLowerCase().contains(q) ||
        organization.toLowerCase().contains(q) ||
        location.toLowerCase().contains(q) ||
        category.toLowerCase().contains(q) ||
        description.toLowerCase().contains(q) ||
        tags.any((tag) => tag.toLowerCase().contains(q));
  }

  bool matchesCategory(String filter) {
    if (filter == 'All') return true;
    return category.toLowerCase() == filter.toLowerCase();
  }
}

const kEventFilterCategories = ['All', 'Environment', 'Education', 'Health'];
