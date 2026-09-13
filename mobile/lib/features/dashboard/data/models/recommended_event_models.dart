import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

/// One interest the volunteer picked that the server's NLP tagging found in
/// an event. [score] is the blended 0–1 confidence; the UI shows the label.
class MatchedInterest {
  const MatchedInterest({
    required this.code,
    required this.label,
    required this.score,
  });

  factory MatchedInterest.fromJson(Map<String, dynamic> json) {
    return MatchedInterest(
      code: json['code'] as String,
      label: json['label'] as String? ?? json['code'] as String,
      score: (json['score'] as num?)?.toDouble() ?? 0,
    );
  }

  final String code;
  final String label;
  final double score;
}

/// `GET /events/recommended` row — an open event tagged with at least one of
/// the volunteer's interests.
class RecommendedEvent {
  const RecommendedEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.startsAt,
    required this.endsAt,
    required this.location,
    required this.maxParticipants,
    required this.participants,
    required this.organizerName,
    required this.category,
    required this.status,
    required this.beneficiaryApplicable,
    required this.matchedInterests,
    required this.matchScore,
    this.imageCount = 0,
    this.markerLat,
    this.markerLng,
  });

  factory RecommendedEvent.fromJson(Map<String, dynamic> json) {
    return RecommendedEvent(
      id: json['event_id'] as int,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      startsAt: DateTime.parse(json['event_started'] as String).toLocal(),
      endsAt: DateTime.parse(json['event_ended'] as String).toLocal(),
      location: json['location'] as String? ?? '',
      maxParticipants: json['max_participants'] as int? ?? 0,
      participants: json['participants'] as int? ?? 0,
      organizerName: json['organizer_name'] as String? ?? '',
      category: json['category'] as String? ?? '',
      status: json['status'] as String? ?? 'Upcoming',
      beneficiaryApplicable: json['beneficiary_applicable'] as bool? ?? false,
      markerLat: (json['marker_lat'] as num?)?.toDouble(),
      markerLng: (json['marker_lng'] as num?)?.toDouble(),
      imageCount: json['image_count'] as int? ?? 0,
      matchedInterests: (json['matched_interests'] as List<dynamic>? ?? [])
          .map((e) => MatchedInterest.fromJson(e as Map<String, dynamic>))
          .toList(),
      matchScore: (json['match_score'] as num?)?.toDouble() ?? 0,
    );
  }

  final int id;
  final String title;
  final String description;
  final DateTime startsAt;
  final DateTime endsAt;
  final String location;
  final int maxParticipants;
  final int participants;
  final String organizerName;
  final String category;
  final String status;
  final bool beneficiaryApplicable;
  final double? markerLat;
  final double? markerLng;

  /// Images sit in a private bucket; the server streams them by index.
  final int imageCount;

  /// Best match first, as ordered by the server.
  final List<MatchedInterest> matchedInterests;
  final double matchScore;

  int get slotsLeft =>
      (maxParticipants - participants).clamp(0, maxParticipants);

  /// Authenticated image stream per index, in upload order.
  List<String> get imageUrls {
    if (imageCount == 0) return const [];
    final api = ApiClient();
    return List.generate(
      imageCount,
      (index) => api.uri('/events/$id/images/$index').toString(),
    );
  }

  /// The event details screen is still built on the prototype event model;
  /// this projects a server row onto it so a recommended card opens the same
  /// screen as every other card until the details screen moves to live data.
  CaresEvent toCaresEvent() {
    final now = DateTime.now();
    final startDay = DateTime(startsAt.year, startsAt.month, startsAt.day);
    final today = DateTime(now.year, now.month, now.day);
    final hour = startsAt.hour % 12 == 0 ? 12 : startsAt.hour % 12;
    final minute = startsAt.minute.toString().padLeft(2, '0');
    final meridiem = startsAt.hour < 12 ? 'AM' : 'PM';

    return CaresEvent(
      id: 'event-$id',
      title: title,
      organization: organizerName,
      date: startsAt,
      time: '$hour:$minute $meridiem',
      location: location,
      description: description,
      slotsLeft: slotsLeft,
      daysUntil: startDay.difference(today).inDays.clamp(0, 9999),
      capacityFilled: maxParticipants == 0
          ? 0
          : (participants / maxParticipants).clamp(0, 1).toDouble(),
      category: category,
      tags: matchedInterests.map((m) => m.label).toList(),
      registeredCount: participants,
      totalCapacity: maxParticipants,
      requirements: const [],
      venueLatitude: markerLat ?? 0,
      venueLongitude: markerLng ?? 0,
      openToBeneficiaries: beneficiaryApplicable,
      isCompleted: status == 'Completed',
      imageUrls: imageUrls,
    );
  }
}

class RecommendedEventsPage {
  const RecommendedEventsPage({
    required this.hasInterests,
    required this.events,
  });

  factory RecommendedEventsPage.fromJson(Map<String, dynamic> json) {
    return RecommendedEventsPage(
      hasInterests: json['has_interests'] as bool? ?? false,
      events: (json['events'] as List<dynamic>? ?? [])
          .map((e) => RecommendedEvent.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// False until the volunteer has chosen interests — nothing to match on.
  final bool hasInterests;
  final List<RecommendedEvent> events;
}
