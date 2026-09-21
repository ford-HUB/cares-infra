import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/data/mock_events.dart'
    show smartSearchSuggestionsFor;
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/domain/event_time_range.dart';
import 'package:mobile/features/dashboard/presentation/widgets/discover_header.dart';
import 'package:mobile/features/dashboard/presentation/widgets/event_discover_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/event_time_filter_chips.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_section_header.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/events_page_widgets.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';

/// Browse and search events: a centred "For You" title, a search pill, quick
/// date chips (Today / Tomorrow / This Week / This Month), then the "Events"
/// list of tall poster cards. One 20px gutter
/// lines every block up; the chip row bleeds to the screen edge but starts
/// on that same gutter.
///
/// Volunteers see the events the server matched to their interests (title and
/// description read by nlp-service), so the list is empty until something
/// fits what they picked. Events the volunteer has already registered for
/// drop out of this list — they live on the Activity tab instead. With
/// [forBeneficiary] the list is every open event an operator flagged as
/// applicable to beneficiaries, read from `GET /events/beneficiary`; cards
/// open read-only since beneficiaries do not register.
class EventsTabScreen extends ConsumerStatefulWidget {
  const EventsTabScreen({super.key, this.forBeneficiary = false});

  final bool forBeneficiary;

  @override
  ConsumerState<EventsTabScreen> createState() => _EventsTabScreenState();
}

class _EventsTabScreenState extends ConsumerState<EventsTabScreen> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  String _query = '';

  EventTimeRange _range = EventTimeRange.all;

  static const _gutter = 20.0;

  final _registrationStore = EventRegistrationStore.instance;

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(() => setState(() {}));
    // Registering (or cancelling) from the details screen moves the event
    // between this tab and Activity, so rebuild when the store changes.
    _registrationStore.addListener(_onRegistrationChanged);
  }

  @override
  void dispose() {
    _registrationStore.removeListener(_onRegistrationChanged);
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onRegistrationChanged() {
    if (mounted) setState(() {});
  }

  List<CaresEvent> _filter(List<CaresEvent> source) {
    final now = DateTime.now();
    final email = _participantEmail;
    return source
        .where(
          (event) =>
              !_registrationStore.isRegistered(event.id, email) &&
              _range.contains(event.date, now: now) &&
              event.matchesQuery(_query),
        )
        .toList();
  }

  List<String> get _suggestions => smartSearchSuggestionsFor(_query);

  bool get _hasActiveFilters =>
      _query.trim().isNotEmpty || _range != EventTimeRange.all;

  String _subtitle(int count, {bool loading = false}) {
    if (loading) {
      return widget.forBeneficiary
          ? 'Finding events open to beneficiaries…'
          : 'Finding events that match your interests…';
    }
    if (_query.trim().isNotEmpty) {
      return '$count result${count == 1 ? '' : 's'} found';
    }
    if (widget.forBeneficiary) {
      return '$count event${count == 1 ? '' : 's'} open to beneficiaries';
    }
    return '$count event${count == 1 ? '' : 's'} matched your interests';
  }

  void _applySuggestion(String suggestion) {
    _searchController.text = suggestion;
    _searchController.selection = TextSelection.collapsed(
      offset: suggestion.length,
    );
    setState(() => _query = suggestion);
    _searchFocusNode.unfocus();
  }

  void _clearSearch() {
    _searchController.clear();
    setState(() => _query = '');
  }

  void _clearFilters() {
    _clearSearch();
    setState(() => _range = EventTimeRange.all);
  }

  void _reload() {
    ref.invalidate(
      widget.forBeneficiary
          ? beneficiaryEventsProvider
          : recommendedEventsProvider,
    );
  }

  Future<void> _chooseInterests() async {
    final selected = await showInterestSelectionDialog(context);
    if (!mounted || selected == null) return;
    ref.invalidate(recommendedEventsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final showSuggestions =
        _searchFocusNode.hasFocus && _suggestions.isNotEmpty;

    // Beneficiaries get the flagged pool, volunteers the interest matches.
    final AsyncValue<_Catalog> catalog = widget.forBeneficiary
        ? ref
              .watch(beneficiaryEventsProvider)
              .whenData(
                (events) => _Catalog(
                  events.map((e) => e.toCaresEvent()).toList(),
                  hasInterests: true,
                ),
              )
        : ref
              .watch(recommendedEventsProvider)
              .whenData(
                (page) => _Catalog(
                  page.events.map((e) => e.toCaresEvent()).toList(),
                  hasInterests: page.hasInterests,
                ),
              );

    final source = catalog.valueOrNull?.events ?? const <CaresEvent>[];
    final events = _filter(source);

    return GestureDetector(
      onTap: () => _searchFocusNode.unfocus(),
      child: ColoredBox(
        color: AppColors.background,
        child: SafeArea(
          bottom: false,
          child: CustomScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(_gutter, 12, _gutter, 0),
                  child: DiscoverHeader(
                    title: 'For You',
                    subtitle: _subtitle(
                      events.length,
                      loading: catalog.isLoading,
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(_gutter, 16, _gutter, 0),
                  child: SmartEventSearchBar(
                    hintText: 'Search events',
                    radius: AppColors.pillRadius,
                    controller: _searchController,
                    focusNode: _searchFocusNode,
                    query: _query,
                    onQueryChanged: (value) => setState(() => _query = value),
                    onSuggestionTap: _applySuggestion,
                    onClear: _clearSearch,
                    showSuggestions: showSuggestions,
                    suggestions: _suggestions,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: EventTimeFilterChips(
                    selected: _range,
                    gutter: _gutter,
                    onSelected: (range) {
                      setState(() => _range = range);
                      _searchFocusNode.unfocus();
                    },
                  ),
                ),
              ),
              ...catalog.when(
                loading: () => [
                  const SliverPadding(
                    padding: EdgeInsets.fromLTRB(_gutter, 24, _gutter, 24),
                    sliver: SliverToBoxAdapter(child: _CatalogSkeleton()),
                  ),
                ],
                error: (error, _) => [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: _CatalogError(
                      message: error is ApiException
                          ? error.message
                          : 'Could not load events right now.',
                      onRetry: _reload,
                    ),
                  ),
                ],
                data: (data) => [
                  if (!data.hasInterests)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: _NoInterestsState(onChoose: _chooseInterests),
                    )
                  else if (events.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: EventsEmptyState(
                        query: _query,
                        hasActiveFilters: _hasActiveFilters,
                        onClearFilters: _clearFilters,
                        title: widget.forBeneficiary
                            ? 'No events for beneficiaries yet'
                            : 'No matching events yet',
                        message: widget.forBeneficiary
                            ? 'Nothing open right now is marked for beneficiaries. New events show here as they are posted.'
                            : 'Nothing open right now fits the interests you picked. New events are matched as they are posted.',
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        _gutter,
                        24,
                        _gutter,
                        24,
                      ),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          if (index == 0) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: HomeSectionHeader(
                                title: 'Events',
                                onSeeAll: _hasActiveFilters
                                    ? _clearFilters
                                    : null,
                              ),
                            );
                          }
                          final event = events[index - 1];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: EventDiscoverCard(
                              event: event,
                              onTap: () => EventDetailsScreen.open(
                                context,
                                event,
                                readOnly: widget.forBeneficiary,
                              ),
                            ),
                          );
                        }, childCount: events.length + 1),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Catalog {
  const _Catalog(this.events, {required this.hasInterests});

  final List<CaresEvent> events;
  final bool hasInterests;
}

class _NoInterestsState extends StatelessWidget {
  const _NoInterestsState({required this.onChoose});

  final VoidCallback onChoose;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: AppColors.inputFill,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.tune_rounded,
                size: 36,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Pick your interests first',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Events are matched to the interests you choose. Pick a few and this list fills in.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary.withValues(alpha: 0.9),
                height: 1.45,
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onChoose,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              icon: const Icon(Icons.tune, size: 16),
              label: const Text('Choose interests'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogError extends StatelessWidget {
  const _CatalogError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.wifi_off_outlined,
              size: 36,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onRetry,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogSkeleton extends StatelessWidget {
  const _CatalogSkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: SkeletonBox(width: 140, height: 18),
          ),
          for (var i = 0; i < 2; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: SkeletonCard(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    AspectRatio(
                      aspectRatio: 16 / 10,
                      child: SkeletonBox(
                        width: double.infinity,
                        height: double.infinity,
                        radius: 12,
                      ),
                    ),
                    SizedBox(height: 14),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: SkeletonBox(width: 180, height: 16),
                    ),
                    SizedBox(height: 8),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: SkeletonBox(width: 110, height: 12),
                    ),
                    SizedBox(height: 14),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: SkeletonBox(width: 96, height: 34, radius: 17),
                    ),
                    SizedBox(height: 6),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
