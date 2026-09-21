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

/// Open events flagged for beneficiaries — the beneficiary home carousel and
/// Events tab read this. Beneficiaries hold no registrations, so nothing is
/// reconciled with the registration store.
final beneficiaryEventsProvider =
    FutureProvider.autoDispose<List<RecommendedEvent>>(
      (ref) =>
          ref.read(recommendedEventsServiceProvider).fetchForBeneficiaries(),
    );

/// Finished events that were open to beneficiaries — the beneficiary
/// Activity tab. Nothing volunteer-side (registrations, feedback,
/// certificates) is touched.
final beneficiaryCompletedEventsProvider =
    FutureProvider.autoDispose<List<RecommendedEvent>>(
      (ref) => ref
          .read(recommendedEventsServiceProvider)
          .fetchCompletedForBeneficiaries(),
    );

/// The volunteer's own registrations for the activity page. Unlike the feed
/// this includes finished events, so it is the source that puts them under
/// "Completed" after a restart. Each fetch reconciles the store the same way
/// and additionally drops local server-backed rows the server no longer has.
///
/// The same load pulls which of those events already have feedback, so the
/// "Submit Feedback" / "Submitted" state on the completed cards is the
/// server's, not whatever this install remembers.
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

/// Best effort: a failed feedback lookup must not take the activity page down
/// with it, so the cards fall back to whatever the store already holds.
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
      // Already joined: keep the stored copy current so the server's status
      // and counts win over the snapshot taken at join time.
      store.refreshEvent(event.toCaresEvent(), email: email);
    } else if (!event.isRegistered && local) {
      store.cancelParticipation(event.caresEventId, email);
    }
  }
}
