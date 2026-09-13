import '../domain/cares_event.dart';

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
    requirements: [
      'Wear comfortable clothes and closed shoes',
      'Bring a valid school ID',
      'Arrive 15 minutes before the start time',
    ],
    venueLatitude: 10.3157,
    venueLongitude: 123.8854,
    isFeatured: true,
    openToBeneficiaries: true,
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
    requirements: [
      'Volunteers must be at least 16 years old',
      'Follow packing and sorting instructions on-site',
    ],
    venueLatitude: 10.3235,
    venueLongitude: 123.9200,
    isFeatured: true,
    openToBeneficiaries: true,
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
    requirements: [
      'Bring gloves and a reusable water bottle',
      'Wear sun protection and appropriate footwear',
      'Participants under 18 must be accompanied by a guardian',
    ],
    venueLatitude: 10.3173,
    venueLongitude: 123.9494,
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
    requirements: [
      'Wear clothes you do not mind getting muddy',
      'Bring a hat and drinking water',
    ],
    venueLatitude: 10.3157,
    venueLongitude: 123.8854,
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
    requirements: [
      'Volunteers assisting medical booths must wear the provided vest',
      'Maintain patient confidentiality at all times',
    ],
    venueLatitude: 10.2447,
    venueLongitude: 123.8495,
    openToBeneficiaries: true,
  ),
];

/// Events the volunteer already joined and that have since ended. These drive
/// the post-event feedback + certificate prototype flow.
final kMockCompletedEvents = [
  CaresEvent(
    id: 'completed-1',
    title: 'Coastal Cleanup Drive — Mactan',
    organization: 'CARES Environment Team',
    date: DateTime(2026, 5, 24),
    time: '6:00 AM – 10:00 AM',
    location: 'Mactan Island, Cebu',
    description:
        'A morning shoreline cleanup with partner barangays. Volunteers '
        'collected, sorted, and weighed coastal waste for recycling.',
    slotsLeft: 0,
    daysUntil: 0,
    capacityFilled: 1,
    category: 'Environment',
    tags: ['environment', 'cleanup'],
    registeredCount: 50,
    totalCapacity: 50,
    requirements: [
      'Bring gloves and a reusable water bottle',
      'Wear sun protection and appropriate footwear',
    ],
    venueLatitude: 10.3173,
    venueLongitude: 123.9494,
    isCompleted: true,
    hoursCompleted: 4,
  ),
  CaresEvent(
    id: 'completed-2',
    title: 'School Supply Drive — Talisay',
    organization: 'CARES Extension Office',
    date: DateTime(2026, 5, 10),
    time: '9:00 AM – 12:00 PM',
    location: 'Talisay City, Cebu',
    description:
        'Volunteers sorted and packed school kits for students in partner '
        'communities ahead of the new school year.',
    slotsLeft: 0,
    daysUntil: 0,
    capacityFilled: 1,
    category: 'Education',
    tags: ['education', 'supplies'],
    registeredCount: 40,
    totalCapacity: 40,
    requirements: ['Follow packing and sorting instructions on-site'],
    venueLatitude: 10.2447,
    venueLongitude: 123.8495,
    isCompleted: true,
    hoursCompleted: 3,
  ),
];

final kMockAllEvents = [...kMockFeaturedEvents, ...kMockUpcomingEvents];

/// Every event the app can resolve by id — browsable plus completed ones.
final kMockEventDirectory = [...kMockAllEvents, ...kMockCompletedEvents];

/// Events a beneficiary can attend — feeding, distribution, and health
/// outreach activities. Static prototype selection.
final kMockBeneficiaryEvents = [
  for (final event in kMockAllEvents)
    if (event.openToBeneficiaries) event,
];

CaresEvent? findEventById(String id) {
  for (final event in kMockEventDirectory) {
    if (event.id == id) return event;
  }
  return null;
}

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
    if (event.category.toLowerCase().contains(q)) {
      suggestions.add(event.category);
    }
    for (final tag in event.tags) {
      if (tag.toLowerCase().contains(q)) suggestions.add(tag);
    }
    if (event.location.toLowerCase().contains(q)) {
      suggestions.add(event.location.split(',').first.trim());
    }
  }

  return suggestions.take(5).toList();
}
