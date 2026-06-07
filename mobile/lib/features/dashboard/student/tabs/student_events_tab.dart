import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/mock_events.dart';
import '../../screens/event_details_screen.dart';
import '../../widgets/event_cards.dart';

class StudentEventsTab extends StatefulWidget {
  const StudentEventsTab({super.key});

  @override
  State<StudentEventsTab> createState() => _StudentEventsTabState();
}

class _StudentEventsTabState extends State<StudentEventsTab> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<CaresEvent> get _filteredEvents {
    if (_query.trim().isEmpty) return kMockAllEvents;
    final q = _query.toLowerCase();
    return kMockAllEvents
        .where(
          (event) =>
              event.title.toLowerCase().contains(q) ||
              event.location.toLowerCase().contains(q) ||
              event.organization.toLowerCase().contains(q),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final events = _filteredEvents;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: TextField(
            controller: _searchController,
            onChanged: (value) => setState(() => _query = value),
            decoration: InputDecoration(
              hintText: 'Search events...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _query.isNotEmpty
                  ? IconButton(
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _query = '');
                      },
                      icon: const Icon(Icons.close_rounded),
                    )
                  : null,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Row(
            children: [
              FilterChip(
                label: const Text('All'),
                selected: true,
                onSelected: (_) {},
                selectedColor: AppColors.inputFill,
                checkmarkColor: AppColors.primary,
              ),
              const SizedBox(width: 8),
              FilterChip(
                label: const Text('Volunteer'),
                selected: false,
                onSelected: (_) {},
              ),
              const SizedBox(width: 8),
              FilterChip(
                label: const Text('This Month'),
                selected: false,
                onSelected: (_) {},
              ),
            ],
          ),
        ),
        Expanded(
          child: events.isEmpty
              ? const Center(
                  child: Text(
                    'No events match your search.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  itemCount: events.length,
                  itemBuilder: (context, index) {
                    final event = events[index];
                    return UpcomingEventCard(
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
