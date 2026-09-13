import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../data/event_category_colors.dart';
import '../data/mock_events.dart';

class EventsPageHeader extends StatelessWidget {
  const EventsPageHeader({super.key, required this.subtitle});

  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Events',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontSize: 30,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

class SmartEventSearchBar extends StatelessWidget {
  const SmartEventSearchBar({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.query,
    required this.onQueryChanged,
    required this.onSuggestionTap,
    required this.onClear,
    required this.showSuggestions,
    required this.suggestions,
    this.hintText = 'Search by title, tag, or location',
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String query;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<String> onSuggestionTap;
  final VoidCallback onClear;
  final bool showSuggestions;
  final List<String> suggestions;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            border: Border.all(
              color: focusNode.hasFocus
                  ? AppColors.primary.withValues(alpha: 0.35)
                  : AppColors.borderLight,
            ),
          ),
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            onChanged: onQueryChanged,
            textInputAction: TextInputAction.search,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: TextStyle(
                color: AppColors.textMuted.withValues(alpha: 0.9),
                fontWeight: FontWeight.w400,
              ),
              prefixIcon: Icon(
                Icons.search_rounded,
                color: focusNode.hasFocus
                    ? AppColors.primary
                    : AppColors.textMuted,
              ),
              suffixIcon: query.isNotEmpty
                  ? IconButton(
                      onPressed: onClear,
                      icon: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.inputFill,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close_rounded, size: 16),
                      ),
                    )
                  : null,
              filled: true,
              fillColor: Colors.transparent,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
            ),
          ),
        ),
        AnimatedCrossFade(
          duration: const Duration(milliseconds: 200),
          crossFadeState: showSuggestions && suggestions.isNotEmpty
              ? CrossFadeState.showFirst
              : CrossFadeState.showSecond,
          firstChild: Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Container(
              clipBehavior: Clip.antiAlias,
              decoration: AppDecorations.surfaceCard(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Text(
                      query.trim().isEmpty ? 'Popular searches' : 'Suggestions',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                  ...List.generate(suggestions.length, (index) {
                    final suggestion = suggestions[index];
                    final isLast = index == suggestions.length - 1;
                    return Column(
                      children: [
                        InkWell(
                          onTap: () => onSuggestionTap(suggestion),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: AppColors.inputFill,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    query.trim().isEmpty
                                        ? Icons.trending_up_rounded
                                        : Icons.search_rounded,
                                    size: 16,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    suggestion,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                                Icon(
                                  Icons.north_west_rounded,
                                  size: 14,
                                  color: AppColors.textMuted.withValues(
                                    alpha: 0.7,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (!isLast)
                          Divider(
                            height: 1,
                            indent: 60,
                            color: AppColors.inputFill.withValues(alpha: 0.8),
                          ),
                      ],
                    );
                  }),
                ],
              ),
            ),
          ),
          secondChild: const SizedBox.shrink(),
        ),
      ],
    );
  }
}

class EventCategoryFilters extends StatelessWidget {
  const EventCategoryFilters({
    super.key,
    required this.selected,
    required this.onSelected,
    this.categories = kEventFilterCategories,
  });

  final String selected;
  final ValueChanged<String> onSelected;

  /// Chip labels, "All" first. Volunteers get the interests their matched
  /// events carry; the prototype default is the fixture's category list.
  final List<String> categories;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final category = categories[index];
          final isSelected = selected == category;
          final categoryColor = eventCategoryColor(category);

          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => onSelected(category),
              borderRadius: BorderRadius.circular(20),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? categoryColor : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppColors.pillRadius),
                  border: Border.all(
                    color: isSelected
                        ? categoryColor
                        : categoryColor.withValues(alpha: 0.35),
                  ),
                ),
                child: Text(
                  category,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : categoryColor,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class EventCatalogCard extends StatelessWidget {
  const EventCatalogCard({super.key, required this.event, required this.onTap});

  final CaresEvent event;
  final VoidCallback onTap;

  Widget _metaRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 15, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.2,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final urgent = event.daysUntil <= 3;
    final categoryColor = eventCategoryColor(event.category);
    final fillRatio = event.totalCapacity == 0
        ? 0.0
        : event.registeredCount / event.totalCapacity;

    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppColors.cardRadius),
          child: Ink(
            decoration: AppDecorations.surfaceCard(
              radius: AppColors.cardRadius,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppColors.cardRadius),
                  ),
                  child: Stack(
                    children: [
                      Container(
                        height: 120,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              categoryColor.withValues(alpha: 0.14),
                              categoryColor.withValues(alpha: 0.30),
                            ],
                          ),
                        ),
                      ),
                      Positioned.fill(
                        child: Center(
                          child: Icon(
                            Icons.event_available_rounded,
                            size: 44,
                            color: categoryColor.withValues(alpha: 0.45),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: AppDecorations.softBadge(
                            fill: AppColors.surface.withValues(alpha: 0.92),
                          ),
                          child: Text(
                            event.category,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: categoryColor,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: event.tags.map((tag) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              tag,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        event.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          height: 1.25,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _metaRow(Icons.apartment_rounded, event.organization),
                      const SizedBox(height: 6),
                      _metaRow(Icons.place_outlined, event.location),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _metaRow(
                              Icons.calendar_month_outlined,
                              event.formattedDate,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: urgent
                                  ? AppColors.accentOrange.withValues(
                                      alpha: 0.12,
                                    )
                                  : AppColors.inputFill,
                              borderRadius: BorderRadius.circular(
                                AppColors.pillRadius,
                              ),
                              border: Border.all(
                                color: urgent
                                    ? AppColors.accentOrange.withValues(
                                        alpha: 0.25,
                                      )
                                    : AppColors.borderLight,
                              ),
                            ),
                            child: Text(
                              event.countdownLeftLabel,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: urgent
                                    ? AppColors.accentOrange
                                    : AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: fillRatio,
                                minHeight: 5,
                                backgroundColor: AppColors.inputFill,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            '${event.registeredCount}/${event.totalCapacity}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class EventsEmptyState extends StatelessWidget {
  const EventsEmptyState({
    super.key,
    required this.query,
    required this.hasActiveFilters,
    required this.onClearFilters,
    this.title,
    this.message,
  });

  final String query;
  final bool hasActiveFilters;
  final VoidCallback onClearFilters;

  /// Override the default copy when the list is empty for a reason other
  /// than the search or filter — e.g. no events match the volunteer's interests.
  final String? title;
  final String? message;

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
              decoration: BoxDecoration(
                color: AppColors.inputFill,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.event_busy_rounded,
                size: 36,
                color: AppColors.textMuted.withValues(alpha: 0.8),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              query.trim().isNotEmpty
                  ? 'No matches for "$query"'
                  : title ?? 'No events found',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              hasActiveFilters
                  ? 'Try a different search term or filter.'
                  : message ?? 'Try a different search term or filter.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary.withValues(alpha: 0.9),
                height: 1.45,
              ),
            ),
            if (hasActiveFilters) ...[
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: onClearFilters,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                child: const Text('Clear filters'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
