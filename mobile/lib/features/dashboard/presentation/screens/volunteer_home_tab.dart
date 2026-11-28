import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_chips.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_event_row.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_filter_sheet.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_hero_particles.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_tab_states.dart';
import 'package:mobile/features/dashboard/presentation/widgets/popular_event_deck.dart';
import 'package:mobile/features/dashboard/presentation/widgets/volunteer_home_hero.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';
import 'package:mobile/shared/widgets/header_band.dart';

/// Both sections read [recommendedEventsProvider] (`GET /events/recommended`):
/// the deck ranks by fill, the list groups by type. Remount (new key) to
/// refetch. Joined events stay in the deck with a "JOINED" pill but leave the
/// list.
class VolunteerHomeTab extends ConsumerStatefulWidget {
  const VolunteerHomeTab({
    super.key,
    required this.displayName,
    this.onSeeAllEvents,
    this.onInterestsChanged,
    this.popularCount = 5,
  });

  final String displayName;

  /// The filter button stays here and drives the category list instead.
  final VoidCallback? onSeeAllEvents;

  /// Lets the shell drop its "no interests yet" flag.
  final VoidCallback? onInterestsChanged;

  /// The list shows every match.
  final int popularCount;

  @override
  ConsumerState<VolunteerHomeTab> createState() => _VolunteerHomeTabState();
}

class _VolunteerHomeTabState extends ConsumerState<VolunteerHomeTab> {
  static const _gutter = VolunteerHomeHero.gutter;

  static const _deckOverlap = PopularEventDeck.cardHeight * 0.36;

  String _category = 'All';

  final _registrations = EventRegistrationStore.instance;

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  @override
  void initState() {
    super.initState();
    _registrations.addListener(_onRegistrationsChanged);
    // autoDispose keeps the last value alive across a quick remount; a mount
    // is always a request for fresh data here.
    Future.microtask(() {
      if (mounted) ref.invalidate(recommendedEventsProvider);
    });
  }

  @override
  void dispose() {
    _registrations.removeListener(_onRegistrationsChanged);
    super.dispose();
  }

  /// Joins/cancels on the details screen move events between this tab and
  /// Activity.
  void _onRegistrationsChanged() {
    if (mounted) setState(() {});
  }

  /// The store keys on the `event-<id>` form.
  List<RecommendedEvent> _unjoined(List<RecommendedEvent> events) =>
      events.where((e) => !_isJoined(e)).toList();

  bool _isJoined(RecommendedEvent event) =>
      _registrations.isRegistered('event-${event.id}', _participantEmail);

  void _open(RecommendedEvent event) =>
      EventDetailsScreen.open(context, event.toCaresEvent());

  /// Shares [_category] with the chip row; no-op until events load.
  Future<void> _pickCategory() async {
    final all = ref.read(recommendedEventsProvider).value?.events;
    if (all == null) return;
    final events = _unjoined(all);
    if (events.isEmpty) return;
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
              child: const DeepGround(child: HomeHeroParticles()),
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
                  isJoined: _isJoined,
                  onOpen: _open,
                ),
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
        final events = _unjoined(data.events);
        if (events.isEmpty) {
          return const [
            Padding(padding: inset, child: HomeStateCard.noMatches()),
          ];
        }

        final chips = _chipsFor(events);
        // A chip picked before a refetch may no longer exist; fall back to
        // All rather than filtering everything out.
        final active = chips.contains(_category) ? _category : 'All';
        final filtered = active == 'All'
            ? events
            : events
                  .where(
                    (e) => e.category.toLowerCase() == active.toLowerCase(),
                  )
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

/// The placeholder keeps something behind the hero's ink when empty.
class _PopularSlot extends StatelessWidget {
  const _PopularSlot({
    required this.page,
    required this.count,
    required this.isJoined,
    required this.onOpen,
  });

  final AsyncValue<RecommendedEventsPage> page;
  final int count;

  /// Only flips the pill to JOINED.
  final bool Function(RecommendedEvent) isJoined;
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
      error: (_, _) => const HomeDeckPlaceholder(
        icon: Icons.wifi_off_rounded,
        title: 'Events Unavailable',
        message: 'We could not load events right now. Pull down to try again.',
      ),
      data: (data) {
        final popular = _popular(data.events);
        if (!data.hasInterests) {
          return const HomeDeckPlaceholder(
            icon: Icons.auto_awesome_outlined,
            title: 'Pick Your Interests',
            message:
                'Choose a few interests and popular events will show here.',
          );
        }
        if (popular.isEmpty) {
          return const HomeDeckPlaceholder(
            icon: Icons.event_busy_outlined,
            title: 'No Open Events Yet',
            message:
                'There are no open events that match your interests at the moment.',
          );
        }
        return PopularEventDeck(
          events: popular,
          gutter: gutter,
          onOpen: onOpen,
          isJoined: isJoined,
        );
      },
    );
  }
}

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
