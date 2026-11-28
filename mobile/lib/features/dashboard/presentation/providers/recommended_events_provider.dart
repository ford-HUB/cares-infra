import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/features/dashboard/data/certificate_data.dart';
import 'package:mobile/features/dashboard/data/event_evaluation_service.dart';
import 'package:mobile/features/dashboard/data/event_feedback_store.dart';
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

final eventEvaluationServiceProvider = Provider<EventEvaluationService>(
  (ref) => EventEvaluationService(),
);

/// Auto-disposed; server-side tagging is cached so refetches are cheap. Each
/// fetch reconciles the registration store with `is_registered` so joins
/// survive restarts (and reach the geofence recorder).
final recommendedEventsProvider =
    FutureProvider.autoDispose<RecommendedEventsPage>((ref) async {
      final page = await ref.read(recommendedEventsServiceProvider).fetch();
      _syncRegistrations(page.events);
      return page;
    });

/// Beneficiaries hold no registrations, so nothing is reconciled.
final beneficiaryEventsProvider =
    FutureProvider.autoDispose<List<RecommendedEvent>>(
      (ref) =>
          ref.read(recommendedEventsServiceProvider).fetchForBeneficiaries(),
    );

/// Touches nothing volunteer-side.
final beneficiaryCompletedEventsProvider =
    FutureProvider.autoDispose<List<RecommendedEvent>>(
      (ref) => ref
          .read(recommendedEventsServiceProvider)
          .fetchCompletedForBeneficiaries(),
    );

/// Includes finished events, so it repopulates "Completed" after a restart.
/// Also drops local server-backed rows the server no longer has, and loads
/// feedback state from the server.
final registeredEventsProvider =
    FutureProvider.autoDispose<List<RecommendedEvent>>((ref) async {
      final events = await ref
          .read(recommendedEventsServiceProvider)
          .fetchRegistered();
      _syncRegistrations(events);

      final store = EventRegistrationStore.instance;
      final email =
          StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';
      final serverIds = events.map((e) => e.caresEventId).toSet();
      for (final participation in store.participationsForEmail(email)) {
        final event = participation.event;
        if (event.serverId != null && !serverIds.contains(event.id)) {
          store.cancelParticipation(event.id, email);
        }
      }

      await _syncFeedback(ref, email);
      await CertificateStore.instance.refresh();
      return events;
    });

/// Best-effort: on failure the cards keep what the store holds.
Future<void> _syncFeedback(Ref ref, String email) async {
  try {
    final submissions = await ref
        .read(eventEvaluationServiceProvider)
        .fetchSubmissions();
    EventFeedbackStore.instance.hydrate(email, {
      for (final s in submissions) 'event-${s.eventId}': s.submittedAt,
    });
  } catch (_) {
    // Leave the store as-is; the next refresh retries.
  }
}

void _syncRegistrations(List<RecommendedEvent> events) {
  final store = EventRegistrationStore.instance;
  final email =
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';
  for (final event in events) {
    final local = store.isRegistered(event.caresEventId, email);
    if (event.isRegistered && !local) {
      store.register(event.toCaresEvent(), email: email);
    } else if (event.isRegistered && local) {
      // Keep the stored copy current so server status and counts win.
      store.refreshEvent(event.toCaresEvent(), email: email);
    } else if (!event.isRegistered && local) {
      store.cancelParticipation(event.caresEventId, email);
    }
  }
}
