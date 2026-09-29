import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/event_time_range.dart';

/// Horizontal pill row under the search bar — All / Today / Tomorrow /
/// This Week / This Month. The active pill fills in the brand green; the
/// others sit on the surface with a light border. Bleeds to the screen edge
/// but starts on [gutter] like every other block on the tab.
class EventTimeFilterChips extends StatelessWidget {
  const EventTimeFilterChips({
    super.key,
    required this.selected,
    required this.onSelected,
    required this.gutter,
  });

  final EventTimeRange selected;
  final ValueChanged<EventTimeRange> onSelected;
  final double gutter;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        padding: EdgeInsets.symmetric(horizontal: gutter),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: EventTimeRange.values.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final range = EventTimeRange.values[index];
          final isSelected = range == selected;
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => onSelected(range),
              borderRadius: BorderRadius.circular(AppColors.pillRadius),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 18),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppColors.pillRadius),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.borderCard,
                  ),
                ),
                child: Text(
                  range.label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
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
