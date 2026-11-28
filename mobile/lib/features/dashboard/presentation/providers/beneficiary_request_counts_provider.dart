import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/models/user_request_models.dart';
import 'package:mobile/features/dashboard/data/user_request_service.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';

final userRequestServiceProvider = Provider<UserRequestService>(
  (ref) => UserRequestService(),
);

class BeneficiaryRequestCounts {
  const BeneficiaryRequestCounts({
    required this.pending,
    required this.approved,
    required this.completed,
  });

  /// Filed, waiting on a director.
  final int pending;

  /// Accepted for an event that has not run yet.
  final int approved;

  /// Accepted for an event that has already run.
  final int completed;
}

/// From `GET /user-requests/me`: only EVENT_JOIN rows count; DELETED ones were
/// dropped by a director. Accepted moves to Completed once the event is in
/// [beneficiaryCompletedEventsProvider].
final beneficiaryRequestCountsProvider =
    FutureProvider.autoDispose<BeneficiaryRequestCounts>((ref) async {
      final (requests, completedEvents) = await (
        ref.read(userRequestServiceProvider).fetchMine(),
        ref.watch(beneficiaryCompletedEventsProvider.future),
      ).wait;
      final completedIds = {for (final e in completedEvents) e.id};

      var pending = 0;
      var approved = 0;
      var completed = 0;
      for (final request in requests) {
        if (request.kind != UserRequestKind.eventJoin) continue;
        switch (request.status) {
          case UserRequestStatus.pending:
            pending++;
          case UserRequestStatus.accepted:
            if (completedIds.contains(request.eventId)) {
              completed++;
            } else {
              approved++;
            }
          case UserRequestStatus.deleted:
          case UserRequestStatus.rejected:
          case UserRequestStatus.unknown:
            break;
        }
      }
      return BeneficiaryRequestCounts(
        pending: pending,
        approved: approved,
        completed: completed,
      );
    });
