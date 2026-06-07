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
    this.isFeatured = false,
    this.imageAsset,
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
  final bool isFeatured;
  final String? imageAsset;

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

final kMockFeaturedEvents = [
  CaresEvent(
    id: 'featured-1',
    title: 'Feeding Program – Brgy. Luz',
    organization: 'Gawad Kalinga Cebu',
    date: DateTime(2026, 6, 8),
    time: '8:00 AM',
    location: 'Brgy. Luz, Cebu City',
    description:
        'Help prepare and distribute meals to families in Brgy. Luz. Volunteers needed for packing and serving.',
    slotsLeft: 12,
    daysUntil: 9,
    capacityFilled: 0.62,
    category: 'Health',
    tags: ['feeding', 'community'],
    registeredCount: 38,
    totalCapacity: 50,
    isFeatured: true,
  ),
  CaresEvent(
    id: 'featured-2',
    title: 'School Supply Drive',
    organization: 'CARES Extension Office',
    date: DateTime(2026, 6, 15),
    time: '9:00 AM',
    location: 'USC Talamban Campus',
    description:
        'Sort and pack school kits for students in partner communities before the new school year.',
    slotsLeft: 20,
    daysUntil: 16,
    capacityFilled: 0.45,
    category: 'Education',
    tags: ['education', 'supplies'],
    registeredCount: 18,
    totalCapacity: 40,
    isFeatured: true,
  ),
];

final kMockUpcomingEvents = [
  CaresEvent(
    id: 'upcoming-1',
    title: 'Coastal Cleanup Drive',
    organization: 'CARES Environment Team',
    date: DateTime(2026, 6, 10),
    time: '6:00 AM',
    location: 'Mactan Island, Cebu',
    description:
        'Join a morning coastal cleanup to protect marine habitats and reduce shoreline waste.',
    slotsLeft: 18,
    daysUntil: 2,
    capacityFilled: 0.64,
    category: 'Environment',
    tags: ['environment', 'cleanup'],
    registeredCount: 32,
    totalCapacity: 50,
  ),
  CaresEvent(
    id: 'upcoming-2',
    title: 'Tree Planting Initiative',
    organization: 'Green Cebu Coalition',
    date: DateTime(2026, 6, 14),
    time: '7:30 AM',
    location: 'Cebu City',
    description:
        'Plant native seedlings and learn about reforestation efforts in urban watershed areas.',
    slotsLeft: 15,
    daysUntil: 6,
    capacityFilled: 0.55,
    category: 'Environment',
    tags: ['environment', 'reforestation'],
    registeredCount: 22,
    totalCapacity: 40,
  ),
  CaresEvent(
    id: 'upcoming-3',
    title: 'Community Health Fair',
    organization: 'CARES Health Unit',
    date: DateTime(2026, 6, 21),
    time: '8:00 AM',
    location: 'Talisay City',
    description:
        'Support health screenings, wellness booths, and health education for local residents.',
    slotsLeft: 10,
    daysUntil: 13,
    capacityFilled: 0.4,
    category: 'Health',
    tags: ['health', 'community'],
    registeredCount: 30,
    totalCapacity: 50,
  ),
];

final kMockAllEvents = [...kMockFeaturedEvents, ...kMockUpcomingEvents];

List<String> smartSearchSuggestionsFor(String query) {
  if (query.trim().isEmpty) {
    return [
      'Coastal Cleanup',
      'Environment',
      'Education',
      'Health',
      'Cebu City',
    ];
  }

  final q = query.toLowerCase();
  final suggestions = <String>{};

  for (final event in kMockAllEvents) {
    if (event.title.toLowerCase().contains(q)) suggestions.add(event.title);
    if (event.category.toLowerCase().contains(q))
      suggestions.add(event.category);
    for (final tag in event.tags) {
      if (tag.toLowerCase().contains(q)) suggestions.add(tag);
    }
    if (event.location.toLowerCase().contains(q)) {
      suggestions.add(event.location.split(',').first.trim());
    }
  }

  return suggestions.take(5).toList();
}
