import 'package:mobile/features/dashboard/domain/mock_event.dart';

/// Extension program grouping volunteer events by theme and interest area.
class MockProgram {
  const MockProgram({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.interestTags,
    required this.galleryImageUrls,
    required this.coverImageUrl,
    required this.events,
    required this.profileMatchPercent,
  });

  final String id;
  final String title;
  final String subtitle;
  final String description;
  final List<String> interestTags;
  final List<String> galleryImageUrls;
  final String coverImageUrl;
  final List<MockProgramEvent> events;
  final int profileMatchPercent;

  bool matchesInterests(Set<String> userInterests) {
    return interestTags.any(userInterests.contains);
  }
}

/// Event within a program, with mock volunteer profile match metadata.
class MockProgramEvent extends MockEvent {
  const MockProgramEvent({
    required super.id,
    required super.title,
    required super.category,
    required super.date,
    required super.location,
    required super.imageUrl,
    super.description,
    super.spotsLeft,
    super.hours,
    required this.profileMatchPercent,
    required this.matchedTraits,
  });

  final int profileMatchPercent;
  final List<String> matchedTraits;
}

abstract final class MockPrograms {
  static const _greenFuture = MockProgram(
    id: 'prog-env',
    title: 'Green Future Initiative',
    subtitle: 'Environment & sustainability outreach',
    description:
        'Hands-on programs that protect local ecosystems and teach sustainable practices on campus and in the community.',
    interestTags: ['Environment'],
    coverImageUrl:
        'https://images.unsplash.com/photo-1464226183344-4d7a0a0224be?w=800&q=80',
    galleryImageUrls: [
      'https://images.unsplash.com/photo-1464226183344-4d7a0a0224be?w=800&q=80',
      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
    ],
    profileMatchPercent: 94,
    events: [
      MockProgramEvent(
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
        profileMatchPercent: 96,
        matchedTraits: ['Environment interest', 'Weekend availability'],
      ),
      MockProgramEvent(
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
        profileMatchPercent: 91,
        matchedTraits: ['Environment interest', 'Event coordination'],
      ),
      MockProgramEvent(
        id: 'evt-env-3',
        title: 'Eco Campus Workshop',
        category: 'Environment',
        date: '2026-09-10',
        location: 'UCLM Science Building',
        imageUrl:
            'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
        description:
            'Lead recycling stations and educate students on waste sorting.',
        spotsLeft: 15,
        hours: 2,
        profileMatchPercent: 88,
        matchedTraits: ['Public speaking', 'Academic activities'],
      ),
    ],
  );

  static const _extensionOutreach = MockProgram(
    id: 'prog-academic',
    title: 'UCLM Extension Outreach',
    subtitle: 'Academic service & community learning',
    description:
        'Bridge classroom learning with community impact through tutoring, mentorship, and campus-led extension activities.',
    interestTags: ['Academic activities', 'Community outreach'],
    coverImageUrl:
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    galleryImageUrls: [
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80',
    ],
    profileMatchPercent: 89,
    events: [
      MockProgramEvent(
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
        profileMatchPercent: 93,
        matchedTraits: ['Academic activities', 'Public speaking'],
      ),
      MockProgramEvent(
        id: 'evt-acad-2',
        title: 'Peer Tutoring Drive',
        category: 'Education',
        date: '2026-08-12',
        location: 'UCLM Library Annex',
        imageUrl:
            'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
        description: 'Support freshmen with math and science review sessions.',
        spotsLeft: 20,
        hours: 3,
        profileMatchPercent: 87,
        matchedTraits: ['Academic activities', 'Weekend availability'],
      ),
      MockProgramEvent(
        id: 'evt-acad-3',
        title: 'Community Literacy Day',
        category: 'Community',
        date: '2026-10-05',
        location: 'Barangay Hall, Main St.',
        imageUrl:
            'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80',
        description: 'Read-aloud sessions and book donations for local youth.',
        spotsLeft: 16,
        hours: 4,
        profileMatchPercent: 85,
        matchedTraits: ['Community outreach', 'Event coordination'],
      ),
    ],
  );

  static const _careShare = MockProgram(
    id: 'prog-donation',
    title: 'Care & Share Drives',
    subtitle: 'Relief, donations & community support',
    description:
        'Coordinate donation collections and relief efforts that connect donors with families and communities in need.',
    interestTags: ['Donation drives', 'Community outreach'],
    coverImageUrl:
        'https://images.unsplash.com/photo-1488521787991-ed7bba6f60de?w=800&q=80',
    galleryImageUrls: [
      'https://images.unsplash.com/photo-1488521787991-ed7bba6f60de?w=800&q=80',
      'https://images.unsplash.com/photo-1532629345422-7515f3d4bb82?w=800&q=80',
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80',
    ],
    profileMatchPercent: 78,
    events: [
      MockProgramEvent(
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
        profileMatchPercent: 82,
        matchedTraits: ['Community outreach', 'Event coordination'],
      ),
      MockProgramEvent(
        id: 'evt-don-2',
        title: 'School Supply Giveaway',
        category: 'Community',
        date: '2026-08-25',
        location: 'UCLM Gymnasium',
        imageUrl:
            'https://images.unsplash.com/photo-1532629345422-7515f3d4bb82?w=800&q=80',
        description: 'Pack and distribute kits for students before the school year.',
        spotsLeft: 22,
        hours: 3,
        profileMatchPercent: 76,
        matchedTraits: ['Community outreach', 'First aid basics'],
      ),
      MockProgramEvent(
        id: 'evt-don-3',
        title: 'Relief Goods Sorting',
        category: 'Donation',
        date: '2026-09-18',
        location: 'Extension Warehouse',
        imageUrl:
            'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80',
        description: 'Sort and label incoming relief donations for distribution.',
        spotsLeft: 14,
        hours: 2,
        profileMatchPercent: 71,
        matchedTraits: ['Donation drives'],
      ),
    ],
  );

  static const List<MockProgram> all = [
    _greenFuture,
    _extensionOutreach,
    _careShare,
  ];

  static List<MockProgram> matchedForInterests(Set<String> interests) {
    final matched =
        all.where((program) => program.matchesInterests(interests)).toList();
    if (matched.isNotEmpty) return matched;
    return all;
  }

  static MockProgram? byId(String id) {
    for (final program in all) {
      if (program.id == id) return program;
    }
    return null;
  }
}

/// Default mock volunteer interests used until profile API is wired.
abstract final class MockVolunteerInterests {
  static const Set<String> defaults = {
    'Environment',
    'Academic activities',
    'Community outreach',
  };
}
