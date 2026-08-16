import 'package:mobile/features/dashboard/domain/volunteer_event.dart';

/// Extension program grouping volunteer events by theme and interest area.
class VolunteerProgram {
  const VolunteerProgram({
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
  final List<VolunteerProgramEvent> events;
  final int profileMatchPercent;

  bool matchesInterests(Set<String> userInterests) {
    return interestTags.any(userInterests.contains);
  }
}

/// Event within a program, with volunteer profile match metadata.
class VolunteerProgramEvent extends VolunteerEvent {
  const VolunteerProgramEvent({
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
