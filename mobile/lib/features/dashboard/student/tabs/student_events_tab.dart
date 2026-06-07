import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/mock_events.dart';
import '../../screens/event_details_screen.dart';
import '../../widgets/events_page_widgets.dart';

class StudentEventsTab extends StatefulWidget {
  const StudentEventsTab({super.key});

  @override
  State<StudentEventsTab> createState() => _StudentEventsTabState();
}

class _StudentEventsTabState extends State<StudentEventsTab> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  String _query = '';
  String _selectedCategory = 'All';

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

  List<CaresEvent> get _filteredEvents {
    return kMockAllEvents
        .where(
          (event) =>
              event.matchesCategory(_selectedCategory) &&
              event.matchesQuery(_query),
        )
        .toList();
  }

  List<String> get _suggestions => smartSearchSuggestionsFor(_query);

  bool get _hasActiveFilters =>
      _query.trim().isNotEmpty || _selectedCategory != 'All';

  String get _subtitle {
    if (_query.trim().isNotEmpty) {
      return '${_filteredEvents.length} result${_filteredEvents.length == 1 ? '' : 's'} found';
    }
    return '${_filteredEvents.length} events available';
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
    setState(() => _selectedCategory = 'All');
  }

  @override
  Widget build(BuildContext context) {
    final events = _filteredEvents;
    final showSuggestions =
        _searchFocusNode.hasFocus && _suggestions.isNotEmpty;

    return GestureDetector(
      onTap: () => _searchFocusNode.unfocus(),
      child: ColoredBox(
        color: AppColors.background,
        child: CustomScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            SliverToBoxAdapter(
              child: EventsPageHeader(
                subtitle: _subtitle,
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
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
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: EventCategoryFilters(
                  selected: _selectedCategory,
                  onSelected: (category) {
                    setState(() => _selectedCategory = category);
                    _searchFocusNode.unfocus();
                  },
                ),
              ),
            ),
            if (events.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EventsEmptyState(
                  query: _query,
                  hasActiveFilters: _hasActiveFilters,
                  onClearFilters: _clearFilters,
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final event = events[index];
                      return EventCatalogCard(
                        event: event,
                        onTap: () => EventDetailsScreen.open(context, event),
                      );
                    },
                    childCount: events.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
