import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/data/mock_events.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/event_category_tiles.dart';
import 'package:mobile/features/dashboard/presentation/widgets/event_list_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/event_week_strip.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_section_header.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/events_page_widgets.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';

/// Browse and search events: a day strip across the top, search, an
/// "All Events" row of category tiles, then the "Popular Events" list of
/// compact cards. One 20px gutter lines every block up; the horizontal rows
/// bleed to the screen edge but start on that same gutter.
///
/// Volunteers see the events the server matched to their interests (title and
/// description read by nlp-service), so the list is empty until something
/// fits what they picked. With [forBeneficiary] the list is the prototype
/// fixture of events beneficiaries may attend — that role has no live
/// endpoint yet.
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
  String _selectedCategory = 'All';

  /// Midnight-normalised day picked on the strip, or null for every date.
  DateTime? _selectedDay;

  static const _gutter = 20.0;
  static const _stripDays = 14;

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  /// Volunteer chips are matched-interest labels, which [toCaresEvent] puts
  /// in `tags`; the beneficiary fixture still filters on its category field.
  bool _matchesChip(CaresEvent event, String chip) {
    if (chip == 'All') return true;
    if (widget.forBeneficiary) return event.matchesCategory(chip);
    return event.tags.contains(chip);
  }

  static DateTime _dayOf(DateTime date) =>
      DateTime(date.year, date.month, date.day);

  bool _matchesDay(CaresEvent event) =>
      _selectedDay == null || _dayOf(event.date) == _selectedDay;

  List<CaresEvent> _filter(List<CaresEvent> source, String chip) {
    return source
        .where(
          (event) =>
              _matchesChip(event, chip) &&
              _matchesDay(event) &&
              event.matchesQuery(_query),
        )
        .toList();
  }

  /// Today plus the next [_stripDays] - 1 days.
  List<DateTime> get _stripRange {
    final today = _dayOf(DateTime.now());
    return List.generate(_stripDays, (i) => today.add(Duration(days: i)));
  }

  /// "All" plus every interest the matched events were tagged with, in the
  /// order they first appear (the list is already best-match first).
  List<String> _chipsFor(List<CaresEvent> source) {
    if (widget.forBeneficiary) return kEventFilterCategories;
    final labels = <String>{};
    for (final event in source) {
      labels.addAll(event.tags);
    }
    return ['All', ...labels];
  }

  List<String> get _suggestions => smartSearchSuggestionsFor(_query);

  bool get _hasActiveFilters =>
      _query.trim().isNotEmpty ||
      _selectedCategory != 'All' ||
      _selectedDay != null;

  String _subtitle(int count, {bool loading = false}) {
    if (loading) return 'Finding events that match your interests…';
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
    setState(() {
      _selectedCategory = 'All';
      _selectedDay = null;
    });
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

    // Beneficiaries still run on the prototype fixture; volunteers are live.
    final AsyncValue<_Catalog> catalog = widget.forBeneficiary
        ? AsyncData(_Catalog(kMockBeneficiaryEvents, hasInterests: true))
        : ref
              .watch(recommendedEventsProvider)
              .whenData(
                (page) => _Catalog(
                  page.events.map((e) => e.toCaresEvent()).toList(),
                  hasInterests: page.hasInterests,
                ),
              );

    final source = catalog.valueOrNull?.events ?? const <CaresEvent>[];
    // No tiles until something matched — an empty catalog has nothing to
    // narrow, and the row would only advertise interests with no events.
    final chips = _chipsFor(source);
    final showChips = source.isNotEmpty && chips.length > 1;
    // A tile picked before a refetch may no longer exist; fall back to All
    // rather than filtering everything out against a label nothing carries.
    final activeChip = chips.contains(_selectedCategory)
        ? _selectedCategory
        : 'All';
    final events = _filter(source, activeChip);
    final eventDays = {for (final event in source) _dayOf(event.date)};

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
                child: EventsPageHeader(
                  subtitle: _subtitle(
                    events.length,
                    loading: catalog.isLoading,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: EventWeekStrip(
                    days: _stripRange,
                    selected: _selectedDay,
                    eventDays: eventDays,
                    gutter: _gutter,
                    onSelected: (day) {
                      setState(() => _selectedDay = day);
                      _searchFocusNode.unfocus();
                    },
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(_gutter, 16, _gutter, 0),
                  child: SmartEventSearchBar(
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
              if (showChips) ...[
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(_gutter, 24, _gutter, 12),
                    child: HomeSectionHeader(title: 'All Events'),
                  ),
                ),
                SliverToBoxAdapter(
                  child: EventCategoryTiles(
                    categories: chips,
                    selected: activeChip,
                    gutter: _gutter,
                    onSelected: (category) {
                      setState(() => _selectedCategory = category);
                      _searchFocusNode.unfocus();
                    },
                  ),
                ),
              ],
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
                      onRetry: () => ref.invalidate(recommendedEventsProvider),
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
                        title: 'No matching events yet',
                        message:
                            'Nothing open right now fits the interests you picked. New events are matched as they are posted.',
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
                            return const Padding(
                              padding: EdgeInsets.only(bottom: 12),
                              child: HomeSectionHeader(title: 'Popular Events'),
                            );
                          }
                          final event = events[index - 1];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: EventListCard(
                              event: event,
                              onTap: () =>
                                  EventDetailsScreen.open(context, event),
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
          for (var i = 0; i < 4; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SkeletonCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: const [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonBox(width: 180, height: 16),
                          SizedBox(height: 10),
                          SkeletonBox(width: 110, height: 12),
                          SizedBox(height: 6),
                          SkeletonBox(width: 150, height: 12),
                        ],
                      ),
                    ),
                    SizedBox(width: 12),
                    SkeletonBox(width: 84, height: 84, radius: 14),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
