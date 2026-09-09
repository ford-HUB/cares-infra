/// Mock volunteer events for dashboard visualization until API wiring exists.
class MockEvent {
  const MockEvent({
    required this.id,
    required this.title,
    required this.category,
    required this.date,
    required this.location,
    required this.imageUrl,
    this.description,
    this.spotsLeft,
    this.hours,
  });

  final String id;
  final String title;
  final String category;
  final String date;
  final String location;
  final String imageUrl;
  final String? description;
  final int? spotsLeft;
  final int? hours;
}

abstract final class MockEvents {
  static const List<MockEvent> featured = [
    MockEvent(
      id: 'evt-1',
      title: 'Community Clean-Up Drive',
      category: 'Environment',
      date: '2026-07-20',
      location: 'Central Park, Main Street',
      imageUrl:
          'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
      description:
          'Join neighbors for a park-wide cleanup. Gloves and bags provided.',
      spotsLeft: 24,
      hours: 3,
    ),
    MockEvent(
      id: 'evt-2',
      title: 'Food Drive for Families',
      category: 'Community',
      date: '2026-08-05',
      location: 'UCLM Extension Hall',
      imageUrl:
          'https://images.unsplash.com/photo-1488521787991-ed7bba6f60de?w=800&q=80',
      description: 'Collect and sort non-perishable goods for local families.',
      spotsLeft: 18,
      hours: 4,
    ),
    MockEvent(
      id: 'evt-3',
      title: 'Tree Planting Initiative',
      category: 'Environment',
      date: '2026-08-18',
      location: 'Riverside Greenbelt',
      imageUrl:
          'https://images.unsplash.com/photo-1464226183344-4d7a0a0224be?w=800&q=80',
      description:
          'Plant native seedlings and learn sustainable forestry basics.',
      spotsLeft: 30,
      hours: 2,
    ),
    MockEvent(
      id: 'evt-4',
      title: 'Youth Mentorship Program',
      category: 'Education',
      date: '2026-09-02',
      location: 'Community Learning Center',
      imageUrl:
          'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
      description: 'Guide students through career exploration workshops.',
      spotsLeft: 12,
      hours: 2,
    ),
  ];

  static List<MockEvent> get all => featured;
}
