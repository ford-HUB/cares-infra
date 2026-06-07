import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class StudentActivitiesTab extends StatelessWidget {
  const StudentActivitiesTab({super.key});

  static const _active = [
    ('Coastal Cleanup Drive', 'In progress · 2 of 4 tasks done'),
    ('Feeding Program – Brgy. Luz', 'Registered · Starts Jun 8'),
  ];

  static const _completed = [
    ('Campus Tree Planting', 'Completed · May 12'),
    ('Blood Donation Drive', 'Completed · Apr 3'),
  ];

  Widget _activityTile(String title, String subtitle, {required bool active}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: active
                  ? AppColors.primary.withValues(alpha: 0.12)
                  : AppColors.inputFill,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              active ? Icons.pending_actions_rounded : Icons.check_circle_rounded,
              color: active ? AppColors.primary : AppColors.accent,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Text(
          'Activities',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Track your volunteer participation and completed activities.',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 24),
        const Text(
          'Active',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 12),
        ..._active.map(
          (item) => _activityTile(item.$1, item.$2, active: true),
        ),
        const SizedBox(height: 16),
        const Text(
          'Completed',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ..._completed.map(
          (item) => _activityTile(item.$1, item.$2, active: false),
        ),
      ],
    );
  }
}
