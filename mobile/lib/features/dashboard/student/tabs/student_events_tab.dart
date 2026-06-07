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

  @override
  Widget build(BuildContext context) {
    final events = _filteredEvents;
    final showSuggestions =
        _searchFocusNode.hasFocus && _suggestions.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Events',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                _query.trim().isEmpty
                    ? '${events.length} events available'
                    : '${events.length} result${events.length == 1 ? '' : 's'} for "${_query.trim()}"',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
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
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: EventCategoryFilters(
            selected: _selectedCategory,
            onSelected: (category) => setState(() => _selectedCategory = category),
          ),
        ),
        Expanded(
          child: events.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.search_off_rounded,
                          size: 48,
                          color: AppColors.textMuted.withValues(alpha: 0.7),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _query.trim().isEmpty
                              ? 'No events in this category yet.'
                              : 'No events match "$_query".',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            height: 1.45,
                          ),
                        ),
                        if (_query.isNotEmpty || _selectedCategory != 'All') ...[
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: () {
                              _clearSearch();
                              setState(() => _selectedCategory = 'All');
                            },
                            child: const Text('Clear filters'),
                          ),
                        ],
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  itemCount: events.length,
                  itemBuilder: (context, index) {
                    final event = events[index];
                    return EventCatalogCard(
                      event: event,
                      onTap: () => EventDetailsScreen.open(context, event),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
