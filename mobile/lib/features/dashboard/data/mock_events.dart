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
}

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
    isFeatured: true,
  ),
];

final kMockUpcomingEvents = [
  CaresEvent(
    id: 'upcoming-1',
    title: 'Coastal Cleanup Drive',
    organization: 'CARES Volunteers',
    date: DateTime(2026, 6, 10),
    time: '6:00 AM',
    location: 'Mactan Island, Cebu',
    description:
        'Join a morning coastal cleanup to protect marine habitats and reduce shoreline waste.',
    slotsLeft: 8,
    daysUntil: 2,
    capacityFilled: 0.78,
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
  ),
];

final kMockAllEvents = [...kMockFeaturedEvents, ...kMockUpcomingEvents];
