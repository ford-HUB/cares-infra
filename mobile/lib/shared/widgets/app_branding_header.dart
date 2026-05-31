import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/cares_logo.dart';

class AppBrandingHeader extends StatelessWidget {
  const AppBrandingHeader({
    super.key,
    this.logoSize = 120,
    this.showTagline = true,
    this.compact = false,
  });

  final double logoSize;
  final bool showTagline;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CaresLogo(size: logoSize),
        SizedBox(height: compact ? 20 : 24),
        Text(
          'CARES',
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                color: AppColors.primary,
                fontSize: compact ? 26 : 28,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
              ),
          textAlign: TextAlign.center,
        ),
        if (showTagline) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              'Community Awareness, Relations & Extension Services',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontSize: compact ? 13 : 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ],
    );
  }
}
