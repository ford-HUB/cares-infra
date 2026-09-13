import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_empty_state.dart';
import 'package:mobile/features/dashboard/presentation/widgets/matched_events_carousel.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';

/// "Matched for you" on the volunteer home tab: a swipeable deck of open events
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
        _SectionHeader(onSeeAll: widget.onSeeAll),
        const SizedBox(height: 8),
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
            return MatchedEventsCarousel(
              events: data.events.take(widget.maxItems).toList(),
              onEventTap: (event) =>
                  EventDetailsScreen.open(context, event.toCaresEvent()),
            );
          },
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({this.onSeeAll});

  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.auto_awesome, size: 18, color: AppColors.primary),
        const SizedBox(width: 6),
        const Expanded(
          child: Text(
            'Matched for you',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        if (onSeeAll != null)
          TextButton(
            onPressed: onSeeAll,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              visualDensity: VisualDensity.compact,
            ),
            child: const Text(
              'See all',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
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
      child: SizedBox(
        height: 218,
        child: SkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Row(
                children: [
                  SkeletonBox(width: 110, height: 18, radius: 9),
                  Spacer(),
                  SkeletonBox(width: 70, height: 18, radius: 9),
                ],
              ),
              SizedBox(height: 16),
              SkeletonBox(width: 220, height: 16),
              SizedBox(height: 8),
              SkeletonBox(width: 160, height: 16),
              SizedBox(height: 12),
              Row(
                children: [
                  SkeletonBox(width: 70, height: 22, radius: 11),
                  SizedBox(width: 6),
                  SkeletonBox(width: 90, height: 22, radius: 11),
                ],
              ),
              Spacer(),
              SkeletonBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
