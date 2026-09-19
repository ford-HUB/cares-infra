import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/features/dashboard/data/event_registration_service.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/data/recommended_events_service.dart';

final recommendedEventsServiceProvider = Provider<RecommendedEventsService>(
  (ref) => RecommendedEventsService(),
);

final eventRegistrationServiceProvider = Provider<EventRegistrationService>(
  (ref) => EventRegistrationService(),
);

/// Interest-matched events for the home tab. Auto-disposed so leaving the
/// dashboard drops the list and the next visit asks the server again — the
/// tagging itself is cached server-side, so a refetch is cheap.
///
/// Every fetch also reconciles the in-memory registration store with the
/// server's `is_registered` flags, so a join made before the app restarted
/// still reads as joined (and the geofence recorder knows about it).
final recommendedEventsProvider =
    FutureProvider.autoDispose<RecommendedEventsPage>((ref) async {
      final page = await ref.read(recommendedEventsServiceProvider).fetch();
      _syncRegistrations(page.events);
      return page;
    });

void _syncRegistrations(List<RecommendedEvent> events) {
  final store = EventRegistrationStore.instance;
  final email =
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';
  for (final event in events) {
    final local = store.isRegistered(event.caresEventId, email);
    if (event.isRegistered && !local) {
      store.register(event.toCaresEvent(), email: email);
    } else if (!event.isRegistered && local) {
      store.cancelParticipation(event.caresEventId, email);
    }
  }
}
