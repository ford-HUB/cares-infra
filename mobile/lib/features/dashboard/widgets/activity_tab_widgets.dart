import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/domain/volunteer_activity.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_chips.dart';

/// Building blocks of the Activity tab — the All / Registered / Completed
/// chip row, the titled sections and their cards — shared by the volunteer
/// and beneficiary tabs so both read as the same page.

/// Which slice of the page is showing. `all` stacks every section; the
/// rest show just theirs so a tap on "Registered" is only joined events.
enum ActivityGroup { all, registered, completed }

extension on ActivityGroup {
  String get label => switch (this) {
    ActivityGroup.all => 'All',
    ActivityGroup.registered => 'Registered',
    ActivityGroup.completed => 'Completed',
  };

  IconData get icon => switch (this) {
    ActivityGroup.all => Icons.grid_view_rounded,
    ActivityGroup.registered => Icons.how_to_reg_rounded,
    ActivityGroup.completed => Icons.task_alt_rounded,
  };

  /// Disc tint when the chip is idle — one brand green across the row, as
  /// on the Events tab's time filter; the selected chip fills solid.
  Color get color => AppColors.primary;
}

/// Card-shaped placeholder while the first registration list is on its way,
/// so the empty state does not flash before the server answers.
class ActivityLoadingState extends StatelessWidget {
  const ActivityLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 96,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: const Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      ),
    );
  }
}

/// Section header (title + one-line hint) over its cards.

class ActivitySection extends StatelessWidget {
  const ActivitySection({
    super.key,
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppColors.primaryDark,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 12.5,
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
        const SizedBox(height: 12),
        ...children,
      ],
    );
  }
}

/// Icon accents used across the activity page.
const _kHoursColor = Color(0xFF1976D2);
const _kJoinedColor = Color(0xFF2D7634);
const _kPointsColor = Color(0xFFF9A825);
const _kDateColor = Color(0xFF5C6BC0);
const _kLocationColor = Color(0xFFE65100);

/// Group chip row: the home tab's icon-disc pills in the Events tab's green
/// outline colouring — brand-green fill when active, white with a hairline
/// otherwise. Scrolls horizontally and bleeds to the screen edge.
class ActivityGroupPanel extends StatelessWidget {
  const ActivityGroupPanel({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final ActivityGroup selected;
  final ValueChanged<ActivityGroup> onSelected;

  @override
  Widget build(BuildContext context) {
    const groups = ActivityGroup.values;
    return SizedBox(
      height: HomeCategoryChips.compactHeight,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: groups.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final group = groups[index];
          return HomeCategoryChip(
            label: group.label,
            icon: group.icon,
            color: group.color,
            isSelected: group == selected,
            onTap: () => onSelected(group),
            compact: true,
            outlined: true,
            selectedColor: AppColors.primary,
          );
        },
      ),
    );
  }
}

/// Placeholder card shown under a section that has nothing to list yet.
class ActivityEmptyState extends StatelessWidget {
  const ActivityEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: _kJoinedColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: _kJoinedColor, size: 24),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}

class ActivityEntryCard extends StatelessWidget {
  const ActivityEntryCard({super.key, required this.entry});

  final VolunteerActivityEntry entry;

  Color _statusColor(ActivityStatus status) => switch (status) {
    ActivityStatus.completed => AppColors.primary,
    ActivityStatus.registered => const Color(0xFF1976D2),
    ActivityStatus.cancelled => AppColors.heart,
  };

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(entry.status);
    final categoryColor = eventCategoryColor(entry.category);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: categoryColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.volunteer_activism_outlined,
              color: categoryColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        entry.eventTitle,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        entry.status.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  entry.category,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: categoryColor,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 13,
                      color: _kDateColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      entry.date,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 13,
                      color: _kLocationColor,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        entry.location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: AppColors.secondary.withValues(alpha: 0.95),
                        ),
                      ),
                    ),
                  ],
                ),
                if (entry.status == ActivityStatus.completed) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _MetaTag(
                        icon: Icons.schedule_outlined,
                        color: _kHoursColor,
                        label: '${entry.hours} hrs',
                      ),
                      const SizedBox(width: 8),
                      _MetaTag(
                        icon: Icons.bolt,
                        color: _kPointsColor,
                        label: '+${entry.pointsEarned} pts',
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaTag extends StatelessWidget {
  const _MetaTag({
    required this.icon,
    required this.color,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
