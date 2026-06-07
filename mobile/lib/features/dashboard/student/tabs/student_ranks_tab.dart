import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class StudentRanksTab extends StatelessWidget {
  const StudentRanksTab({super.key});

  static const _leaderboard = [
    ('Maria Santos', 1240, 1),
    ('John Dela Cruz', 1180, 2),
    ('You', 960, 3),
    ('Ana Reyes', 880, 4),
    ('Carlos Lim', 820, 5),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Text(
          'Ranks',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Points, badges, and leaderboard standings.',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.primaryLight],
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const Icon(Icons.emoji_events_rounded,
                  color: Colors.white, size: 40),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '960 pts',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Rank #3 · Silver Volunteer',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Leaderboard',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ..._leaderboard.map((entry) {
          final (name, points, rank) = entry;
          final isYou = name == 'You';
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isYou
                  ? AppColors.inputFill
                  : AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isYou ? AppColors.primary : AppColors.inputFill,
              ),
            ),
            child: Row(
              children: [
                Text(
                  '#$rank',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: rank <= 3 ? AppColors.primary : AppColors.textMuted,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      fontWeight: isYou ? FontWeight.w700 : FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Text(
                  '$points pts',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: const [
            _BadgeChip(label: 'First Event'),
            _BadgeChip(label: '5 Events'),
            _BadgeChip(label: 'Team Player'),
            _BadgeChip(label: 'Eco Hero'),
          ],
        ),
      ],
    );
  }
}

class _BadgeChip extends StatelessWidget {
  const _BadgeChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: const Icon(Icons.military_tech_rounded,
          size: 18, color: AppColors.primary),
      label: Text(label),
      backgroundColor: AppColors.surface,
      side: const BorderSide(color: AppColors.inputFill),
    );
  }
}
