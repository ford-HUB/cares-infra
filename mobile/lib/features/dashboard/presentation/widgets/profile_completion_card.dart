import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

class ProfileCompletionCard extends StatelessWidget {
  const ProfileCompletionCard({super.key, this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.light.withValues(alpha: 0.28),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.primaryDark, width: 1.2),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: AppColors.primaryDark,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.person_add_alt_1_outlined,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Complete Your Volunteer Profile',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Add skills, interests & availability to unlock AI Matching',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        fontWeight: FontWeight.w500,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right,
                color: AppColors.primaryDark,
                size: 26,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
