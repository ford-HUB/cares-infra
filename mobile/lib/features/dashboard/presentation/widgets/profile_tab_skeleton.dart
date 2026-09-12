import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';

/// Placeholder for the profile tab while the role's record is being fetched.
/// Mirrors the real layout: header card, stat row, then two detail sections.
class ProfileTabSkeleton extends StatelessWidget {
  const ProfileTabSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: SkeletonLoader(
        child: SingleChildScrollView(
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Profile',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(height: 16),
              const SkeletonCard(
                child: Row(
                  children: [
                    SkeletonBox.circle(size: 64),
                    SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonBox(width: 150, height: 16),
                          SizedBox(height: 10),
                          SkeletonBox(width: 190, height: 12),
                          SizedBox(height: 10),
                          SkeletonBox(width: 110, height: 12),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
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
