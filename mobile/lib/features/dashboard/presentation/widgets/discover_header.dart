import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Top of the events tab: centred title, with an optional line under it.
class DiscoverHeader extends StatelessWidget {
  const DiscoverHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.onDark = false,
  });

  final String title;
  final String? subtitle;

  /// White type for a deep green [HeaderBand].
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          title,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: onDark ? 28 : 20,
            fontWeight: FontWeight.w800,
            color: onDark ? Colors.white : AppColors.textPrimary,
            letterSpacing: -0.3,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: onDark ? 16 : 13,
              color: onDark
                  ? Colors.white.withValues(alpha: 0.9)
                  : AppColors.textSecondary,
              height: 1.3,
            ),
          ),
        ],
      ],
    );
  }
}
