import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// One tile in a [StatsRow] built with [StatsRow.custom].
class StatsRowItem {
  const StatsRowItem({
    required this.icon,
    required this.value,
    required this.label,
    this.iconBackground,
    this.iconColor,
    this.onTap,
  });

  final IconData icon;

  /// Shown as-is. Plain integers count up from zero on first build;
  /// anything else (₱ amounts, percentages) is rendered directly.
  final String value;

  final String label;

  final Color? iconBackground;

  final Color? iconColor;

  /// Optional — the tile reads as a button and opens the related detail.
  final VoidCallback? onTap;
}

/// Three-up summary tiles under a dashboard header or profile card. Each tile
/// carries its own tint so the eye can tell hours, activities and points
/// apart at a glance; numbers count up when the row first appears.
class StatsRow extends StatelessWidget {
  const StatsRow({
    super.key,
    required this.serviceHours,
    required this.activities,
    required this.points,
    this.onServiceHoursTap,
    this.onActivitiesTap,
    this.onPointsTap,
  }) : items = null;

  /// Same three-tile layout with caller-supplied stats — used by dashboards
  /// that track something other than volunteer hours (e.g. beneficiaries).
  const StatsRow.custom({super.key, required List<StatsRowItem> this.items})
    : serviceHours = 0,
      activities = 0,
      points = 0,
      onServiceHoursTap = null,
      onActivitiesTap = null,
      onPointsTap = null;

  final int serviceHours;
  final int activities;
  final int points;
  final VoidCallback? onServiceHoursTap;
  final VoidCallback? onActivitiesTap;
  final VoidCallback? onPointsTap;
  final List<StatsRowItem>? items;

  /// Per-stat tints: green for time given, blue for events, orange for
  /// points — the same orange the points pill on the home header uses.
  static const _hoursTint = _StatTint(
    background: Color(0xFFE3F1E4),
    foreground: AppColors.primaryDark,
  );
  static const _activitiesTint = _StatTint(
    background: Color(0xFFE3F0FB),
    foreground: Color(0xFF1565C0),
  );
  static const _pointsTint = _StatTint(
    background: Color(0xFFFFE9D2),
    foreground: AppColors.accentOrange,
  );

  List<StatsRowItem> get _resolvedItems =>
      items ??
      [
        StatsRowItem(
          icon: Icons.schedule_rounded,
          value: '$serviceHours',
          label: 'Service hours',
          iconBackground: _hoursTint.background,
          iconColor: _hoursTint.foreground,
          onTap: onServiceHoursTap,
        ),
        StatsRowItem(
          icon: Icons.event_available_rounded,
          value: '$activities',
          label: 'Activities',
          iconBackground: _activitiesTint.background,
          iconColor: _activitiesTint.foreground,
          onTap: onActivitiesTap,
        ),
        StatsRowItem(
          icon: Icons.military_tech_rounded,
          value: '$points',
          label: 'Points',
          iconBackground: _pointsTint.background,
          iconColor: _pointsTint.foreground,
          onTap: onPointsTap,
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final tiles = _resolvedItems;
    // No `stretch` here: the row sits in an unbounded-height scroll column,
    // and stretch would hand every tile an infinite tight height.
    return Row(
      children: [
        for (var i = 0; i < tiles.length; i++) ...[
          if (i > 0) const SizedBox(width: 10),
          Expanded(child: _StatCard(item: tiles[i])),
        ],
      ],
    );
  }
}

class _StatTint {
  const _StatTint({required this.background, required this.foreground});

  final Color background;
  final Color foreground;
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.item});

  final StatsRowItem item;

  @override
  Widget build(BuildContext context) {
    final iconBackground =
        item.iconBackground ?? AppColors.light.withValues(alpha: 0.45);
    final iconColor = item.iconColor ?? AppColors.primaryDark;
    final tappable = item.onTap != null;

    // Shadow lives outside the clipped Material so it isn't cut off.
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: item.onTap,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.fieldBorder),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: iconBackground,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(item.icon, size: 18, color: iconColor),
                      ),
                      const Spacer(),
                      if (tappable)
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: AppColors.textMuted,
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _StatValue(value: item.value),
                  const SizedBox(height: 3),
                  Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.2,
                      color: AppColors.textSecondary,
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

/// The big number. Whole numbers count up from zero the first time the tile
/// appears; formatted values (₱, %) are shown as-is.
class _StatValue extends StatelessWidget {
  const _StatValue({required this.value});

  final String value;

  static const _style = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
    height: 1,
    letterSpacing: -0.5,
  );

  @override
  Widget build(BuildContext context) {
    final target = int.tryParse(value.replaceAll(',', ''));
    if (target == null) {
      return FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(value, maxLines: 1, style: _style),
      );
    }

    return TweenAnimationBuilder<double>(
      key: ValueKey(target),
      tween: Tween(begin: 0, end: target.toDouble()),
      duration: const Duration(milliseconds: 700),
      curve: Curves.easeOutCubic,
      builder: (context, animated, _) =>
          Text(_format(animated.round()), maxLines: 1, style: _style),
    );
  }

  static String _format(int n) {
    final digits = n.abs().toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
      buffer.write(digits[i]);
    }
    return n < 0 ? '-$buffer' : buffer.toString();
  }
}
