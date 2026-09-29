import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// "38 / 50 joined", optionally with a hairline capacity bar underneath —
/// the server sends counts, not member photos, so the count is the honest
/// version of the reference's avatar stack.
class EventJoinedCount extends StatelessWidget {
  const EventJoinedCount({
    super.key,
    required this.joined,
    required this.capacity,
    this.showBar = true,
  });

  final int joined;
  final int capacity;

  /// The home deck draws the bar; the events card wants the count alone.
  final bool showBar;

  @override
  Widget build(BuildContext context) {
    final fill = capacity == 0 ? 0.0 : (joined / capacity).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            const Icon(
              Icons.groups_rounded,
              size: 15,
              color: Color(0xFF6B7280),
            ),
            const SizedBox(width: 5),
            Text(
              capacity == 0 ? '$joined joined' : '$joined / $capacity joined',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
        if (showBar) ...[
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: SizedBox(
              height: 3,
              width: 96,
              child: LinearProgressIndicator(
                value: fill,
                backgroundColor: const Color(0xFFE5E7EB),
                color: fill >= 0.9 ? AppColors.accentOrange : AppColors.primary,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
