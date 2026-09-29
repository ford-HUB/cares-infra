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

  /// Row height for [HomeCategoryChip.compact] chips.
  static const double compactHeight = 34;

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
          return HomeCategoryChip(
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

/// One icon-disc + label pill from the category row. Public so other
/// dashboard screens (the Activity group panel) can share the exact look.
class HomeCategoryChip extends StatelessWidget {
  const HomeCategoryChip({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
    this.compact = false,
    this.selectedColor = AppColors.accentOrange,
    this.outlined = false,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  /// Smaller disc, type and padding for rows that sit under a page title
  /// rather than headlining a section (the Activity group panel).
  final bool compact;

  /// Fill behind the selected chip; Home uses orange, Activity the brand
  /// green so it matches the Events tab's time filter.
  final Color selectedColor;

  /// Hairline border instead of a drop shadow — the flatter treatment the
  /// green pill rows use.
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final disc = compact ? 24.0 : 32.0;
    final iconSize = compact ? 13.0 : 17.0;
    final padding = compact
        ? const EdgeInsets.fromLTRB(5, 5, 12, 5)
        : const EdgeInsets.fromLTRB(6, 6, 16, 6);
    final fontSize = compact ? 12.0 : 13.0;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: padding,
          decoration: BoxDecoration(
            color: isSelected ? selectedColor : AppColors.surface,
            borderRadius: BorderRadius.circular(AppColors.pillRadius),
            border: outlined
                ? Border.all(
                    color: isSelected ? selectedColor : AppColors.borderCard,
                  )
                : null,
            boxShadow: outlined
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(
                        alpha: isSelected ? 0.12 : 0.06,
                      ),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: disc,
                height: disc,
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.2)
                      : color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: iconSize,
                  color: isSelected ? Colors.white : color,
                ),
              ),
              SizedBox(width: compact ? 6 : 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w700,
                  color: isSelected
                      ? Colors.white
                      : outlined
                      ? AppColors.textPrimary
                      : const Color(0xFF1B1F24),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
