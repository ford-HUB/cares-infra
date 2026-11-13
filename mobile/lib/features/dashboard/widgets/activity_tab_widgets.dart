import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/domain/volunteer_activity.dart';
import 'package:mobile/shared/widgets/ground_card.dart';
import 'package:mobile/shared/widgets/header_band.dart';

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
    ActivityGroup.registered => Icons.person_add_alt_outlined,
    ActivityGroup.completed => Icons.check_circle_outline_rounded,
  };
}

/// Card-shaped placeholder while the first registration list is on its way,
/// so the empty state does not flash before the server answers.
class ActivityLoadingState extends StatelessWidget {
  const ActivityLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return const GroundCard(
      radius: 20,
      padding: EdgeInsets.zero,
      child: SizedBox(
        height: 120,
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
        ),
      ),
    );
  }
}

/// Deep green header band of the Activity tab: white title + subtitle over
/// the All / Registered / Completed chip row.
class ActivityHeader extends StatelessWidget {
  const ActivityHeader({
    super.key,
    required this.subtitle,
    required this.selected,
    required this.onSelected,
    this.title = 'Activity',
  });

  final String title;
  final String subtitle;
  final ActivityGroup selected;
  final ValueChanged<ActivityGroup> onSelected;

  @override
  Widget build(BuildContext context) {
    return HeaderBand.deep(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      radius: 26,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    height: 1.15,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 14.5,
                    height: 1.35,
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ActivityGroupPanel(selected: selected, onSelected: onSelected),
        ],
      ),
    );
  }
}

/// Section heading — a plain outlined green icon, a thin vertical rule, then
/// the title and its one-line ink hint — over the section's cards.
class ActivitySection extends StatelessWidget {
  const ActivitySection({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 6),
          child: Row(
            children: [
              Icon(icon, size: 30, color: AppColors.primary),
              Container(
                width: 1.5,
                height: 36,
                margin: const EdgeInsets.symmetric(horizontal: 14),
                color: AppColors.primary.withValues(alpha: 0.35),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.3,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        ...children,
      ],
    );
  }
}

/// Icon accents used across the activity page.
const _kHoursColor = Color(0xFF1976D2);
const _kPointsColor = Color(0xFFF9A825);
const _kDateColor = Color(0xFF5C6BC0);
const _kLocationColor = Color(0xFFE65100);

/// Group chip row on the deep header band. "All" hugs its label; the other
/// two share the remaining width. The selected chip is a deeper green pill
/// with a white hairline, the rest are white pills.
class ActivityGroupPanel extends StatelessWidget {
  const ActivityGroupPanel({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final ActivityGroup selected;
  final ValueChanged<ActivityGroup> onSelected;

  Widget _chip(ActivityGroup group) => _GroupChip(
    group: group,
    selected: group == selected,
    onTap: () => onSelected(group),
  );

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _chip(ActivityGroup.all),
        const SizedBox(width: 8),
        Expanded(child: _chip(ActivityGroup.registered)),
        const SizedBox(width: 8),
        Expanded(child: _chip(ActivityGroup.completed)),
      ],
    );
  }
}

class _GroupChip extends StatelessWidget {
  const _GroupChip({
    required this.group,
    required this.selected,
    required this.onTap,
  });

  final ActivityGroup group;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const shape = StadiumBorder();
    final iconBox = Container(
      width: 26,
      height: 26,
      decoration: selected
          ? BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.38),
              borderRadius: BorderRadius.circular(8),
            )
          : BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.16),
              shape: BoxShape.circle,
            ),
      child: Icon(
        group.icon,
        size: 16,
        color: selected ? Colors.white : AppColors.primary,
      ),
    );

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      height: 42,
      decoration: ShapeDecoration(
        color: selected ? AppColors.navActiveFill : Colors.white,
        shape: StadiumBorder(
          side: BorderSide(
            color: selected
                ? Colors.white.withValues(alpha: 0.55)
                : Colors.transparent,
            width: 1.2,
          ),
        ),
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          customBorder: shape,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 16, 0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  iconBox,
                  const SizedBox(width: 10),
                  Text(
                    group.label,
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: selected ? Colors.white : AppColors.primaryDark,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// What sits behind the empty state's icon: a soft organic blob, or a
/// rounded pale-green tile.
enum ActivityEmptyBackdrop { blob, tile }

/// Placeholder card shown under a section that has nothing to list yet:
/// white ground card with the pale corner wave, the icon on its backdrop,
/// a bold title and one centred ink line.
class ActivityEmptyState extends StatelessWidget {
  const ActivityEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.backdrop = ActivityEmptyBackdrop.blob,
  });

  final IconData icon;
  final String title;
  final String message;
  final ActivityEmptyBackdrop backdrop;

  @override
  Widget build(BuildContext context) {
    final mark = switch (backdrop) {
      ActivityEmptyBackdrop.blob => SizedBox(
        width: 110,
        height: 56,
        child: CustomPaint(
          painter: const _EmptyBlobPainter(),
          child: Icon(icon, size: 40, color: AppColors.primary),
        ),
      ),
      ActivityEmptyBackdrop.tile => Container(
        width: 56,
        height: 56,
        decoration: AppDecorations.iconTile(radius: 14),
        child: Icon(icon, size: 34, color: AppColors.primary),
      ),
    };

    return GroundCard(
      wave: true,
      radius: 20,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 26),
      child: SizedBox(
        width: double.infinity,
        child: Column(
          children: [
            mark,
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.deepHeaderTop,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                height: 1.4,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pale green organic swell behind the empty-state icon, leaning to the
/// right as in the reference.
class _EmptyBlobPainter extends CustomPainter {
  const _EmptyBlobPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final blob = Path()
      ..moveTo(w * 0.22, h * 0.30)
      ..cubicTo(w * 0.34, h * 0.02, w * 0.62, h * 0.04, w * 0.80, h * 0.20)
      ..cubicTo(w * 1.00, h * 0.36, w * 1.00, h * 0.78, w * 0.80, h * 0.92)
      ..cubicTo(w * 0.60, h * 1.04, w * 0.30, h * 1.00, w * 0.20, h * 0.84)
      ..cubicTo(w * 0.12, h * 0.70, w * 0.14, h * 0.46, w * 0.22, h * 0.30)
      ..close();
    canvas.drawPath(
      blob,
      Paint()..color = AppColors.secondary.withValues(alpha: 0.15),
    );
  }

  @override
  bool shouldRepaint(_EmptyBlobPainter oldDelegate) => false;
}

class ActivityEntryCard extends StatelessWidget {
  const ActivityEntryCard({super.key, required this.entry});

  final VolunteerActivityEntry entry;

  Color _statusColor(ActivityStatus status) => switch (status) {
    ActivityStatus.completed => AppColors.primary,
    ActivityStatus.registered => const Color(0xFF1976D2),
    ActivityStatus.cancelled => AppColors.heart,
    ActivityStatus.rejected => AppColors.heart,
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
                        color: AppColors.textSecondary,
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
                          color: AppColors.textSecondary,
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
