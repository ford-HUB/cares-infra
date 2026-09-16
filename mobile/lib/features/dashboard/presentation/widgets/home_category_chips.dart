import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/event_category_icons.dart';

/// "Choose By Category" chip row: icon in a small disc + label, the selected
/// chip filled orange. Scrolls horizontally and bleeds to the screen edge.
class HomeCategoryChips extends StatelessWidget {
  const HomeCategoryChips({
    super.key,
    required this.categories,
    required this.selected,
    required this.onSelected,
    required this.gutter,
  });

  final List<String> categories;
  final String selected;
  final ValueChanged<String> onSelected;
  final double gutter;

  static const double height = 44;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: ListView.separated(
        padding: EdgeInsets.symmetric(horizontal: gutter),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final category = categories[index];
          return _Chip(
            label: category,
            icon: eventCategoryIcon(category),
            color: eventCategoryColor(category),
            isSelected: category == selected,
            onTap: () => onSelected(category),
          );
        },
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.fromLTRB(6, 6, 16, 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentOrange : Colors.white,
            borderRadius: BorderRadius.circular(AppColors.pillRadius),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isSelected ? 0.12 : 0.06),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.2)
                      : color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 17,
                  color: isSelected ? Colors.white : color,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : const Color(0xFF1B1F24),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
