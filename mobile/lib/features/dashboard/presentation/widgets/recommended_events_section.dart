import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_empty_state.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_section_header.dart';
import 'package:mobile/features/dashboard/presentation/widgets/recommended_event_tile.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';

/// "Recommended Events" on the volunteer home tab: a list of open events
/// whose copy the server's NLP matched to the interests this volunteer picked.
/// Remount the widget (new key) to force a refetch — pull-to-refresh and an
/// interest change both do that.
class RecommendedEventsSection extends ConsumerStatefulWidget {
  const RecommendedEventsSection({
    super.key,
    this.onInterestsChanged,
    this.onSeeAll,
    this.maxItems = 5,
  });

  /// Opens the Events tab, which holds the full matched list.
  final VoidCallback? onSeeAll;

  /// The full matched list lives on the Events tab; home shows the best few.
  final int maxItems;

  /// Fired after the volunteer picks interests from the empty-state prompt so
  /// the shell can drop its own "no interests yet" flag.
  final VoidCallback? onInterestsChanged;

  @override
  ConsumerState<RecommendedEventsSection> createState() =>
      _RecommendedEventsSectionState();
}

class _RecommendedEventsSectionState
    extends ConsumerState<RecommendedEventsSection> {
  @override
  void initState() {
    super.initState();
    // autoDispose keeps the last value alive across a quick remount; a mount
    // is always a request for fresh data here.
    Future.microtask(() {
      if (mounted) ref.invalidate(recommendedEventsProvider);
    });
  }

  Future<void> _chooseInterests() async {
    final selected = await showInterestSelectionDialog(context);
    if (!mounted || selected == null) return;
    widget.onInterestsChanged?.call();
    ref.invalidate(recommendedEventsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final page = ref.watch(recommendedEventsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        HomeSectionHeader(title: 'Recommended Events', onSeeAll: widget.onSeeAll),
        const SizedBox(height: 6),
        page.when(
          loading: () => const _RecommendedSkeleton(),
          error: (error, _) => _RecommendedError(
            message: error is ApiException
                ? error.message
                : 'Could not load recommendations right now.',
            onRetry: () => ref.invalidate(recommendedEventsProvider),
          ),
          data: (data) {
            if (!data.hasInterests) {
              return _ChooseInterestsPrompt(onChoose: _chooseInterests);
            }
            if (data.events.isEmpty) {
              return const DashboardEmptyState(
                icon: Icons.auto_awesome_outlined,
                minHeight: 120,
                message:
                    'No open events match your interests yet. Check back soon or browse all events.',
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final event in data.events.take(widget.maxItems))
                  RecommendedEventTile(
                    event: event,
                    onTap: () =>
                        EventDetailsScreen.open(context, event.toCaresEvent()),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _ChooseInterestsPrompt extends StatelessWidget {
  const _ChooseInterestsPrompt({required this.onChoose});

  final VoidCallback onChoose;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tell us what you care about',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Pick a few interests and we will surface the events that fit them here.',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onChoose,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              visualDensity: VisualDensity.compact,
            ),
            icon: const Icon(Icons.tune, size: 16),
            label: const Text('Choose interests'),
          ),
        ],
      ),
    );
  }
}

class _RecommendedError extends StatelessWidget {
  const _RecommendedError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Row(
        children: [
          const Icon(Icons.wifi_off_outlined, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              visualDensity: VisualDensity.compact,
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _RecommendedSkeleton extends StatelessWidget {
  const _RecommendedSkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Column(
        children: [
          for (var i = 0; i < 3; i++)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: const [
                  SkeletonBox(width: 84, height: 84, radius: 14),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SkeletonBox(height: 16),
                        SizedBox(height: 10),
                        SkeletonBox(width: 150, height: 12),
                        SizedBox(height: 8),
                        SkeletonBox(width: 120, height: 12),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
