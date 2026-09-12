import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/activity_log_service.dart';
import 'package:mobile/features/dashboard/domain/account_log.dart';

final activityLogServiceProvider = Provider<ActivityLogService>(
  (ref) => ActivityLogService(),
);

final activityLogsProvider =
    AsyncNotifierProvider.autoDispose<ActivityLogsNotifier, ActivityLogsState>(
      ActivityLogsNotifier.new,
    );

class ActivityLogsState {
  const ActivityLogsState({
    required this.entries,
    required this.nextCursor,
    this.loadingMore = false,
  });

  final List<AccountLogEntry> entries;

  /// Null once the server says the trail is exhausted.
  final String? nextCursor;
  final bool loadingMore;

  bool get hasMore => nextCursor != null;

  ActivityLogsState copyWith({
    List<AccountLogEntry>? entries,
    String? nextCursor,
    bool clearCursor = false,
    bool? loadingMore,
  }) {
    return ActivityLogsState(
      entries: entries ?? this.entries,
      nextCursor: clearCursor ? null : (nextCursor ?? this.nextCursor),
      loadingMore: loadingMore ?? this.loadingMore,
    );
  }
}

/// First page on build; [loadMore] appends the next one. Rows are appended,
/// never re-sorted — the server already orders newest-first and the cursor
/// keeps a page stable while the person scrolls.
class ActivityLogsNotifier extends AutoDisposeAsyncNotifier<ActivityLogsState> {
  @override
  Future<ActivityLogsState> build() async {
    final page = await ref.read(activityLogServiceProvider).fetchPage();
    return ActivityLogsState(
      entries: page.items.map((i) => i.toEntry()).toList(),
      nextCursor: page.nextCursor,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(build);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore) return;

    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final page = await ref
          .read(activityLogServiceProvider)
          .fetchPage(cursor: current.nextCursor);
      state = AsyncData(
        ActivityLogsState(
          entries: [
            ...current.entries,
            ...page.items.map((i) => i.toEntry()),
          ],
          nextCursor: page.nextCursor,
        ),
      );
    } catch (_) {
      // Keep what is on screen; the person can scroll again to retry.
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }
}
