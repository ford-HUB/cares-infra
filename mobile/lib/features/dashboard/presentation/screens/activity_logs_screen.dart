import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/account_log.dart';
import 'package:mobile/features/dashboard/presentation/providers/activity_logs_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_log_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Activity Logs, opened from the Profile tab. A day-grouped timeline of
/// every action recorded against this account, read from `/audit-logs/me`
/// and paged in as the person scrolls. The category chips filter the rows
/// already loaded — the server hands back one trail, newest first.
class ActivityLogsScreen extends ConsumerStatefulWidget {
  const ActivityLogsScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ActivityLogsScreen()),
    );
  }

  @override
  ConsumerState<ActivityLogsScreen> createState() => _ActivityLogsScreenState();
}

class _ActivityLogsScreenState extends ConsumerState<ActivityLogsScreen> {
  AccountLogCategory? _filter;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.extentAfter < 300) {
      ref.read(activityLogsProvider.notifier).loadMore();
    }
  }

  List<MapEntry<DateTime, List<AccountLogEntry>>> _group(
    List<AccountLogEntry> entries,
  ) {
    final visible = _filter == null
        ? entries
        : entries.where((e) => e.category == _filter);
    final map = <DateTime, List<AccountLogEntry>>{};
    for (final e in visible) {
      final day = DateTime(e.at.year, e.at.month, e.at.day);
      map.putIfAbsent(day, () => []).add(e);
    }
    return map.entries.toList();
  }

  @override
  Widget build(BuildContext context) {
    final logs = ref.watch(activityLogsProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: () => Navigator.of(context).pop(),
            title: 'Activity Logs',
            subtitle:
                'Everything done on this account — sign-ins, changes, events, '
                'attendance and record uploads.',
          ),
          const SizedBox(height: 16),
          AccountLogFilterBar(
            selected: _filter,
            onChanged: (c) => setState(() => _filter = c),
          ),
          Expanded(
            child: logs.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
              error: (error, _) => _ErrorState(
                message: error is ApiException
                    ? error.message
                    : 'Couldn\'t load your activity. Check your connection.',
                onRetry: () =>
                    ref.read(activityLogsProvider.notifier).refresh(),
              ),
              data: (state) => _buildList(state),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(ActivityLogsState state) {
    final groups = _group(state.entries);
    final today = DateTime.now();

    if (groups.isEmpty && !state.hasMore) {
      return _EmptyState(filtered: _filter != null);
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => ref.read(activityLogsProvider.notifier).refresh(),
      child: ListView(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        children: [
          for (var g = 0; g < groups.length; g++) ...[
            AccountLogDayHeader(
              label: accountLogDayLabel(groups[g].key, today),
              count: groups[g].value.length,
            ),
            for (var i = 0; i < groups[g].value.length; i++)
              AccountLogTile(
                entry: groups[g].value[i],
                isLast: i == groups[g].value.length - 1,
              ),
            if (g < groups.length - 1) const SizedBox(height: 24),
          ],
          if (state.loadingMore)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary,
                  ),
                ),
              ),
            )
          else if (state.hasMore && groups.isEmpty)
            // Filter hid the whole first page; pull the next one in.
            Center(
              child: TextButton(
                onPressed: () =>
                    ref.read(activityLogsProvider.notifier).loadMore(),
                child: const Text('Load more'),
              ),
            ),
          const SizedBox(height: 24),
          const SecurityInfoNote(
            icon: Icons.shield_outlined,
            text:
                'If you see an action you don\'t recognise, change your '
                'password and sign out other devices from Account Security.',
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.filtered});

  final bool filtered;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.history_toggle_off_rounded,
            size: 40,
            color: AppColors.textMuted.withValues(alpha: 0.8),
          ),
          const SizedBox(height: 10),
          Text(
            filtered
                ? 'No activity in this category yet.'
                : 'No activity recorded yet.',
            style: const TextStyle(
              fontSize: 13.5,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 40,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            TextButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}
