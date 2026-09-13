import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/data/recommended_events_service.dart';

final recommendedEventsServiceProvider = Provider<RecommendedEventsService>(
  (ref) => RecommendedEventsService(),
);

/// Interest-matched events for the home tab. Auto-disposed so leaving the
/// dashboard drops the list and the next visit asks the server again — the
/// tagging itself is cached server-side, so a refetch is cheap.
final recommendedEventsProvider =
    FutureProvider.autoDispose<RecommendedEventsPage>(
      (ref) => ref.read(recommendedEventsServiceProvider).fetch(),
    );
