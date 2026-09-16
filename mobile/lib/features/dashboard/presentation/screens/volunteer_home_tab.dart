import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_chips.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_event_row.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_filter_sheet.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_hero_particles.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_tab_states.dart';
import 'package:mobile/features/dashboard/presentation/widgets/popular_event_deck.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/volunteer_home_hero.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';

/// Volunteer home: a dark hero (welcome, location, search) that runs on
/// down behind the top of the "Popular Events" deck, then the category chip
/// row and the list it filters.
///
/// Both event sections read `GET /events/recommended` through
/// [recommendedEventsProvider] — the open events tagged with this
/// volunteer's interests. The deck ranks them by how full they are; the list
/// groups them by event type. Remount the widget (new key) to refetch —
/// pull-to-refresh and an interest change both do that.
class VolunteerHomeTab extends ConsumerStatefulWidget {
  const VolunteerHomeTab({
    super.key,
    required this.displayName,
    this.showProfileCompletionCard = true,
    this.onCompleteProfile,
    this.onSeeAllEvents,
    this.onInterestsChanged,
    this.popularCount = 5,
  });

  final String displayName;
  final bool showProfileCompletionCard;
  final VoidCallback? onCompleteProfile;

  /// Opens the events tab from search and "View all". The filter button
  /// stays on this tab and drives the category list instead.
  final VoidCallback? onSeeAllEvents;

  /// Fired after the volunteer picks interests from the in-tab prompt so the
  /// shell can drop its own "no interests yet" flag.
  final VoidCallback? onInterestsChanged;

  /// How many events the popular deck shows; the list shows every match.
  final int popularCount;

  @override
  ConsumerState<VolunteerHomeTab> createState() => _VolunteerHomeTabState();
}

class _VolunteerHomeTabState extends ConsumerState<VolunteerHomeTab> {
  static const _gutter = VolunteerHomeHero.gutter;

  /// How far the popular deck hangs down out of the dark ground.
  static const _deckOverlap = PopularEventDeck.cardHeight * 0.36;

  String _category = 'All';

  @override
  void initState() {
    super.initState();
    // autoDispose keeps the last value alive across a quick remount; a mount
    // is always a request for fresh data here.
    Future.microtask(() {
      if (mounted) ref.invalidate(recommendedEventsProvider);
    });
  }

  void _open(RecommendedEvent event) =>
      EventDetailsScreen.open(context, event.toCaresEvent());

  /// Filter button: pick a category from a sheet. Shares [_category] with
  /// the chip row so both reflect the same choice. Does nothing until the
  /// events (and therefore the categories) have loaded.
  Future<void> _pickCategory() async {
    final events = ref.read(recommendedEventsProvider).value?.events;
    if (events == null || events.isEmpty) return;
    final chips = _chipsFor(events);
    final picked = await showHomeCategoryFilterSheet(
      context,
      categories: chips,
      selected: chips.contains(_category) ? _category : 'All',
    );
    if (!mounted || picked == null) return;
    setState(() => _category = picked);
  }

  Future<void> _chooseInterests() async {
    final selected = await showInterestSelectionDialog(context);
    if (!mounted || selected == null) return;
    widget.onInterestsChanged?.call();
    ref.invalidate(recommendedEventsProvider);
  }

  /// "All" plus every event type present, in first-seen order.
  List<String> _chipsFor(List<RecommendedEvent> events) {
    final seen = <String>{};
    for (final e in events) {
      final c = e.category.trim();
      if (c.isNotEmpty) seen.add(c);
    }
    return ['All', ...seen];
  }

  @override
  Widget build(BuildContext context) {
    final seeAll = widget.onSeeAllEvents ?? () {};
    final page = ref.watch(recommendedEventsProvider);

    final inkHeight =
        VolunteerHomeHero.height(context) +
        HomeSectionTitle.height +
        (PopularEventDeck.cardHeight - _deckOverlap);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 8),
        child: Stack(
          children: [
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: inkHeight,
              child: const DecoratedBox(
                decoration: BoxDecoration(color: VolunteerHomeHero.ink),
                child: HomeHeroParticles(),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                VolunteerHomeHero(
                  displayName: widget.displayName,
                  onSearchTap: seeAll,
                  onFilterTap: _pickCategory,
                  filterActive: _category != 'All',
                ),
                HomeSectionTitle(
                  title: 'Popular Events',
                  emoji: '🔥',
                  onDark: true,
                  onViewAll: seeAll,
                ),
                _PopularSlot(
                  page: page,
                  count: widget.popularCount,
                  onOpen: _open,
                ),
                if (widget.showProfileCompletionCard) ...[
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: _gutter),
                    child: ProfileCompletionCard(onTap: widget.onCompleteProfile),
                  ),
                ],
                const SizedBox(height: 8),
                HomeSectionTitle(
                  title: 'Choose By Category',
                  emoji: '✨',
                  onViewAll: seeAll,
                ),
                ..._categorySection(page),
                const SizedBox(height: 12),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Chips + list, or the one state card that explains why there is none.
  List<Widget> _categorySection(AsyncValue<RecommendedEventsPage> page) {
    const inset = EdgeInsets.symmetric(horizontal: _gutter);

    return page.when(
      loading: () => const [
        Padding(padding: inset, child: HomeCategoryListSkeleton()),
      ],
      error: (error, _) => [
        Padding(
          padding: inset,
          child: HomeStateCard.error(
            message: error is ApiException
                ? error.message
                : 'Could not load events right now.',
            onRetry: () => ref.invalidate(recommendedEventsProvider),
          ),
        ),
      ],
      data: (data) {
        if (!data.hasInterests) {
          return [
            Padding(
              padding: inset,
              child: HomeStateCard.chooseInterests(onChoose: _chooseInterests),
            ),
          ];
        }
        if (data.events.isEmpty) {
          return const [
            Padding(padding: inset, child: HomeStateCard.noMatches()),
          ];
        }

        final chips = _chipsFor(data.events);
        // A chip picked before a refetch may no longer exist; fall back to
        // All rather than filtering everything out.
        final active = chips.contains(_category) ? _category : 'All';
        final filtered = active == 'All'
            ? data.events
            : data.events
                  .where((e) => e.category.toLowerCase() == active.toLowerCase())
                  .toList();

        return [
          HomeCategoryChips(
            categories: chips,
            selected: active,
            onSelected: (c) => setState(() => _category = c),
            gutter: _gutter,
          ),
          const SizedBox(height: 18),
          Padding(
            padding: inset,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < filtered.length; i++) ...[
                  if (i > 0) const SizedBox(height: 12),
                  HomeCategoryEventRow(
                    event: filtered[i],
                    onOpen: () => _open(filtered[i]),
                  ),
                ],
              ],
            ),
          ),
        ];
      },
    );
  }
}

/// The deck, its skeleton, or a dark-ground placeholder so the hero's ink
/// still has something to hang behind when there is nothing to show.
class _PopularSlot extends StatelessWidget {
  const _PopularSlot({
    required this.page,
    required this.count,
    required this.onOpen,
  });

  final AsyncValue<RecommendedEventsPage> page;
  final int count;
  final ValueChanged<RecommendedEvent> onOpen;

  /// Fullest first — the closest thing to "popular" the server exposes.
  List<RecommendedEvent> _popular(List<RecommendedEvent> events) {
    double fill(RecommendedEvent e) =>
        e.maxParticipants == 0 ? 0 : e.participants / e.maxParticipants;
    final sorted = [...events]..sort((a, b) => fill(b).compareTo(fill(a)));
    return sorted.take(count).toList();
  }

  @override
  Widget build(BuildContext context) {
    const gutter = VolunteerHomeHero.gutter;

    return page.when(
      loading: () => const PopularEventDeckSkeleton(gutter: gutter),
      error: (_, _) => const _DeckPlaceholder(
        icon: Icons.wifi_off_rounded,
        message: 'Events are unavailable right now',
      ),
      data: (data) {
        final popular = _popular(data.events);
        if (!data.hasInterests) {
          return const _DeckPlaceholder(
            icon: Icons.auto_awesome_rounded,
            message: 'Pick your interests to see popular events',
          );
        }
        if (popular.isEmpty) {
          return const _DeckPlaceholder(
            icon: Icons.event_busy_rounded,
            message: 'No open events match your interests yet',
          );
        }
        return PopularEventDeck(events: popular, gutter: gutter, onOpen: onOpen);
      },
    );
  }
}

class _DeckPlaceholder extends StatelessWidget {
  const _DeckPlaceholder({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: VolunteerHomeHero.gutter),
      child: Container(
        height: PopularEventDeck.cardHeight,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 36, color: AppColors.textMuted),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Three row-card outlines while the list loads.
class HomeCategoryListSkeleton extends StatelessWidget {
  const HomeCategoryListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Column(
        children: [
          for (var i = 0; i < 3; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i < 2 ? 12 : 0),
              child: const SkeletonBox(height: 82, radius: 16),
            ),
        ],
      ),
    );
  }
}
