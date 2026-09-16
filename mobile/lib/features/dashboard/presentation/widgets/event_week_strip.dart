import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Horizontal day picker at the top of the events tab: day number over a
/// weekday abbreviation, the selected day filled in the brand green, and a
/// dot under any day that has at least one event.
///
/// Tapping the selected day again clears the selection so the list shows
/// every date; the strip never forces a date filter on its own.
class EventWeekStrip extends StatelessWidget {
  const EventWeekStrip({
    super.key,
    required this.days,
    required this.selected,
    required this.onSelected,
    required this.eventDays,
    required this.gutter,
  });

  /// Dates to show, in order (already normalised to midnight).
  final List<DateTime> days;

  /// The active day, or null when no date filter is applied.
  final DateTime? selected;
  final ValueChanged<DateTime?> onSelected;

  /// Midnight-normalised dates that carry at least one event.
  final Set<DateTime> eventDays;

  /// Horizontal inset the first chip lines up with; the strip bleeds to the
  /// screen edge so it scrolls under the gutter.
  final double gutter;

  static const _chipWidth = 46.0;
  static const _chipHeight = 66.0;
  static const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _chipHeight,
      child: ListView.separated(
        padding: EdgeInsets.symmetric(horizontal: gutter),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: days.length,
        separatorBuilder: (_, _) => const SizedBox(width: 6),
        itemBuilder: (context, index) {
          final day = days[index];
          final isSelected = selected == day;
          final hasEvents = eventDays.contains(day);
          return _DayChip(
            width: _chipWidth,
            dayNumber: day.day.toString().padLeft(2, '0'),
            weekday: _weekdays[day.weekday - 1],
            isSelected: isSelected,
            hasEvents: hasEvents,
            onTap: () => onSelected(isSelected ? null : day),
          );
        },
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  const _DayChip({
    required this.width,
    required this.dayNumber,
    required this.weekday,
    required this.isSelected,
    required this.hasEvents,
    required this.onTap,
  });

  final double width;
  final String dayNumber;
  final String weekday;
  final bool isSelected;
  final bool hasEvents;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final numberColor = isSelected ? Colors.white : AppColors.textPrimary;
    final labelColor = isSelected
        ? Colors.white.withValues(alpha: 0.85)
        : AppColors.textSecondary;
    final dotColor = isSelected
        ? Colors.white
        : hasEvents
        ? AppColors.primary
        : Colors.transparent;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: width,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                dayNumber,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: numberColor,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                weekday,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: labelColor,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 6),
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
