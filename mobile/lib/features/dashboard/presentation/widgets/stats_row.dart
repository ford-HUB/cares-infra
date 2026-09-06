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
  });

  final IconData icon;
  final String value;
  final String label;
  final Color? iconBackground;
  final Color? iconColor;
}

class StatsRow extends StatelessWidget {
  const StatsRow({
    super.key,
    required this.serviceHours,
    required this.activities,
    required this.points,
  }) : items = null;

  /// Same three-tile layout with caller-supplied stats — used by dashboards
  /// that track something other than volunteer hours (e.g. beneficiaries).
  const StatsRow.custom({super.key, required List<StatsRowItem> this.items})
    : serviceHours = 0,
      activities = 0,
      points = 0;

  final int serviceHours;
  final int activities;
  final int points;
  final List<StatsRowItem>? items;

  @override
  Widget build(BuildContext context) {
    final customItems = items;
    if (customItems != null) {
      return Row(
        children: [
          for (var i = 0; i < customItems.length; i++) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                icon: customItems[i].icon,
                iconBackground:
                    customItems[i].iconBackground ??
                    AppColors.light.withValues(alpha: 0.45),
                iconColor: customItems[i].iconColor ?? AppColors.primaryDark,
                value: customItems[i].value,
                label: customItems[i].label,
              ),
            ),
          ],
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.schedule_outlined,
            iconBackground: AppColors.light.withValues(alpha: 0.45),
            iconColor: AppColors.primaryDark,
            value: '$serviceHours',
            label: 'Svc Hours',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.calendar_month_outlined,
            iconBackground: AppColors.light.withValues(alpha: 0.45),
            iconColor: AppColors.primaryDark,
            value: '$activities',
            label: 'Activities',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.military_tech_outlined,
            iconBackground: const Color(0xFFFFE0B2),
            iconColor: const Color(0xFFE65100),
            value: '$points',
            label: 'Points',
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.iconBackground,
    required this.iconColor,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color iconBackground;
  final Color iconColor;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconBackground,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
              height: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}
