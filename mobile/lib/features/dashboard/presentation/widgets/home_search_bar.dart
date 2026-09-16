import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Pill-shaped search affordance under the greeting. It is a button, not a
/// field: tapping hands off to the Events tab, which owns the real search.
class HomeSearchBar extends StatelessWidget {
  const HomeSearchBar({
    super.key,
    required this.onTap,
    this.hint = 'Search events',
  });

  final VoidCallback onTap;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        side: const BorderSide(color: AppColors.borderLight),
      ),
      shadowColor: AppColors.primaryDark.withValues(alpha: 0.18),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 13, 12, 13),
          child: Row(
            children: [
              const Icon(
                Icons.search_rounded,
                size: 22,
                color: AppColors.textSecondary,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  hint,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
              const Icon(
                Icons.tune_rounded,
                size: 20,
                color: AppColors.accentOrange,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
