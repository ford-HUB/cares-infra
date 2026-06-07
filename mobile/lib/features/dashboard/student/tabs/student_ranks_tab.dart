import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/leaderboard_data.dart';

class StudentRanksTab extends StatefulWidget {
  const StudentRanksTab({super.key});

  @override
  State<StudentRanksTab> createState() => _StudentRanksTabState();
}

class _StudentRanksTabState extends State<StudentRanksTab> {
  LeaderboardCategory _category = LeaderboardCategory.volunteers;

  @override
  Widget build(BuildContext context) {
    final entries = leaderboardFor(_category);
    final topThree = entries.take(3).toList();
    final rest = entries.skip(3).toList();

    return ColoredBox(
      color: AppColors.background,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Leaderboard',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Top contributors making a difference.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 20),
                  _CategorySelector(
                    category: _category,
                    onChanged: (category) =>
                        setState(() => _category = category),
                  ),
                  const SizedBox(height: 20),
                  _TopThreePodium(entries: topThree),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _LeaderboardListTile(
                  entry: rest[index],
                ),
                childCount: rest.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategorySelector extends StatelessWidget {
  const _CategorySelector({
    required this.category,
    required this.onChanged,
  });

  final LeaderboardCategory category;
  final ValueChanged<LeaderboardCategory> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.inputFill.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: _CategoryChip(
              label: 'Volunteers',
              emoji: '🤝',
              selected: category == LeaderboardCategory.volunteers,
              onTap: () => onChanged(LeaderboardCategory.volunteers),
            ),
          ),
          Expanded(
            child: _CategoryChip(
              label: 'Donors',
              emoji: '💛',
              selected: category == LeaderboardCategory.donors,
              onTap: () => onChanged(LeaderboardCategory.donors),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.emoji,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String emoji;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopThreePodium extends StatelessWidget {
  const _TopThreePodium({required this.entries});

  final List<LeaderboardEntry> entries;

  @override
  Widget build(BuildContext context) {
    if (entries.length < 3) return const SizedBox.shrink();

    final first = entries[0];
    final second = entries[1];
    final third = entries[2];

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 20, 12, 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: _PodiumSlot(
              entry: second,
              podiumHeight: 72,
              style: _PodiumStyle.silver,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _PodiumSlot(
              entry: first,
              podiumHeight: 96,
              style: _PodiumStyle.gold,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _PodiumSlot(
              entry: third,
              podiumHeight: 56,
              style: _PodiumStyle.bronze,
            ),
          ),
        ],
      ),
    );
  }
}

enum _PodiumStyle { gold, silver, bronze }

class _PodiumSlot extends StatelessWidget {
  const _PodiumSlot({
    required this.entry,
    required this.podiumHeight,
    required this.style,
  });

  final LeaderboardEntry entry;
  final double podiumHeight;
  final _PodiumStyle style;

  Color get _podiumColor => switch (style) {
        _PodiumStyle.gold => const Color(0xFFFFF3C4),
        _PodiumStyle.silver => const Color(0xFFECEFF1),
        _PodiumStyle.bronze => const Color(0xFFFFE0B2),
      };

  Color get _valueColor => switch (style) {
        _PodiumStyle.gold => const Color(0xFFE6A800),
        _PodiumStyle.silver => const Color(0xFF78909C),
        _PodiumStyle.bronze => const Color(0xFFCD7F32),
      };

  IconData get _medalIcon => switch (style) {
        _PodiumStyle.gold => Icons.emoji_events_rounded,
        _PodiumStyle.silver => Icons.emoji_events_outlined,
        _PodiumStyle.bronze => Icons.emoji_events_outlined,
      };

  Color get _medalColor => switch (style) {
        _PodiumStyle.gold => const Color(0xFFFFB300),
        _PodiumStyle.silver => const Color(0xFF90A4AE),
        _PodiumStyle.bronze => const Color(0xFFCD7F32),
      };

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _AvatarCircle(emoji: entry.avatarEmoji, size: 44),
        const SizedBox(height: 8),
        Text(
          entry.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          entry.displayValue,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: _valueColor,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          height: podiumHeight,
          width: double.infinity,
          decoration: BoxDecoration(
            color: _podiumColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
          ),
          alignment: Alignment.center,
          child: Icon(_medalIcon, color: _medalColor, size: 28),
        ),
      ],
    );
  }
}

class _LeaderboardListTile extends StatelessWidget {
  const _LeaderboardListTile({required this.entry});

  final LeaderboardEntry entry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.inputFill),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 32,
              child: Text(
                '#${entry.rank}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                ),
              ),
            ),
            _AvatarCircle(emoji: entry.avatarEmoji, size: 40),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              entry.displayValue,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AvatarCircle extends StatelessWidget {
  const _AvatarCircle({
    required this.emoji,
    required this.size,
  });

  final String emoji;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.inputFill,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.inputFill),
      ),
      alignment: Alignment.center,
      child: Text(
        emoji,
        style: TextStyle(fontSize: size * 0.5),
      ),
    );
  }
}
