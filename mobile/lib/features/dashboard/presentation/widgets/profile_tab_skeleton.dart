import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/widgets/activity_tab_widgets.dart';

/// Placeholder for the profile tab while the role's record is being fetched.
/// Mirrors the real layout: header card, stat row, then two detail sections.
class ProfileTabSkeleton extends StatelessWidget {
  const ProfileTabSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.background,
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // The real band stays put; only the identity row shimmers.
            const DeepTabHeader(
              title: 'Profile',
              bottom: _BandIdentitySkeleton(),
            ),
            SkeletonLoader(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 2, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        for (var i = 0; i < 3; i++) ...[
                          if (i > 0) const SizedBox(width: 12),
                          const Expanded(
                            child: SkeletonCard(
                              child: Column(
                                children: [
                                  SkeletonBox.circle(size: 34),
                                  SizedBox(height: 10),
                                  SkeletonBox(width: 40, height: 14),
                                  SizedBox(height: 8),
                                  SkeletonBox(width: 60, height: 10),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 24),
                    const _SkeletonSection(rows: 3),
                    const SizedBox(height: 24),
                    const _SkeletonSection(rows: 2),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Avatar + three text bars in translucent white, standing in for the
/// identity row on the deep band.
class _BandIdentitySkeleton extends StatelessWidget {
  const _BandIdentitySkeleton();

  static Widget _bar(double width, double height) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: AppColors.onHeaderField,
      borderRadius: BorderRadius.circular(height),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.onHeaderField,
            ),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _bar(150, 16),
              const SizedBox(height: 10),
              _bar(190, 12),
              const SizedBox(height: 10),
              _bar(90, 20),
            ],
          ),
        ],
      ),
    );
  }
}

class _SkeletonSection extends StatelessWidget {
  const _SkeletonSection({required this.rows});

  final int rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SkeletonBox(width: 120, height: 15),
        const SizedBox(height: 12),
        for (var i = 0; i < rows; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          const SkeletonCard(
            padding: EdgeInsets.symmetric(horizontal: 14, vertical: 16),
            child: Row(
              children: [
                SkeletonBox.circle(size: 28),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(width: 90, height: 10),
                      SizedBox(height: 8),
                      SkeletonBox(height: 12),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
