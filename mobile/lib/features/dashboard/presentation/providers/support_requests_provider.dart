import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/help_center_data.dart';
import 'package:mobile/features/dashboard/data/support_ticket_service.dart';

final supportTicketServiceProvider = Provider<SupportTicketService>(
  (ref) => SupportTicketService(),
);

/// The caller's own tickets, newest activity first. Kept alive across the
/// help screens so the Help home, the list, and a detail page all read one
/// copy; every mutation swaps the changed row in place rather than refetching.
final supportRequestsProvider =
    AsyncNotifierProvider<SupportRequestsNotifier, List<SupportRequest>>(
      SupportRequestsNotifier.new,
    );

class SupportRequestsNotifier extends AsyncNotifier<List<SupportRequest>> {
  SupportTicketService get _service => ref.read(supportTicketServiceProvider);

  @override
  Future<List<SupportRequest>> build() => _service.fetchMine();

  Future<void> refresh() async {
    state = await AsyncValue.guard(_service.fetchMine);
  }

  Future<SupportRequest> create({
    required String subject,
    required String description,
    required SupportTicketType type,
  }) async {
    final created = await _service.create(
      subject: subject,
      description: description,
      type: type,
    );
    _upsert(created);
    return created;
  }

  Future<SupportRequest> reply(String id, String body) async {
    return _upsert(await _service.reply(id, body));
  }

  Future<SupportRequest> confirmFix(
    String id, {
    required bool fixed,
    String? body,
  }) async {
    return _upsert(await _service.confirmFix(id, fixed: fixed, body: body));
  }

  Future<SupportRequest> reopen(String id, String body) async {
    return _upsert(await _service.reopen(id, body));
  }

  /// New rows go to the top; changed rows keep their slot until the next
  /// refresh re-sorts by activity, so the list does not jump under a tap.
  SupportRequest _upsert(SupportRequest updated) {
    final current = state.value ?? const <SupportRequest>[];
    final index = current.indexWhere((r) => r.id == updated.id);
    final next = [...current];
    if (index == -1) {
      next.insert(0, updated);
    } else {
      next[index] = updated;
    }
    state = AsyncData(next);
    return updated;
  }
}
