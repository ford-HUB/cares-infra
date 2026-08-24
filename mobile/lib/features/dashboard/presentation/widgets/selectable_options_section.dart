import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';

class SelectableOptionsSection extends StatelessWidget {
  const SelectableOptionsSection({
    super.key,
    required this.title,
    required this.subtitle,
    required this.options,
    required this.selected,
    required this.onToggle,
    this.emptyMessage,
  });

  final String title;
  final String subtitle;
  final List<ProfileSelectableOption> options;
  final Set<String> selected;
  final ValueChanged<String> onToggle;
  final String? emptyMessage;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              height: 1.35,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 14),
          if (options.isEmpty)
            Text(
              emptyMessage ?? 'No options available right now.',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.secondary.withValues(alpha: 0.9),
              ),
            )
          else
            ...options.map((option) {
              final isSelected = selected.contains(option.label);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _SelectableOptionTile(
                  option: option,
                  isSelected: isSelected,
                  onTap: () => onToggle(option.label),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _SelectableOptionTile extends StatelessWidget {
  const _SelectableOptionTile({
    required this.option,
    required this.isSelected,
    required this.onTap,
  });

  final ProfileSelectableOption option;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = option.accentColor;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? accent : AppColors.fieldBorder,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(option.icon, color: accent, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  option.label,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: isSelected ? accent : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isSelected ? accent : AppColors.light,
                    width: 1.5,
                  ),
                ),
                child: isSelected
                    ? const Icon(
                        Icons.check_rounded,
                        size: 14,
                        color: Colors.white,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
