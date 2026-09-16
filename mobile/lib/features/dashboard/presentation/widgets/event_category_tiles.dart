import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/event_category_icons.dart';

/// "All Events" row on the events tab: square icon tiles, one per category,
/// with the label underneath. Works as the category filter — the selected
/// tile is filled in the brand green.
class EventCategoryTiles extends StatelessWidget {
  const EventCategoryTiles({
    super.key,
    required this.categories,
    required this.selected,
    required this.onSelected,
    required this.gutter,
  });

  /// Tile labels, "All" first.
  final List<String> categories;
  final String selected;
  final ValueChanged<String> onSelected;

  /// Horizontal inset the first tile lines up with; the row bleeds to the
  /// screen edge.
  final double gutter;

  static const _tileSize = 76.0;
  static const _rowHeight = 108.0;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _rowHeight,
      child: ListView.separated(
        padding: EdgeInsets.symmetric(horizontal: gutter),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final category = categories[index];
          return _CategoryTile(
            size: _tileSize,
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

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.size,
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  final double size;
  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(18),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: size,
                height: size,
                decoration: BoxDecoration(
                  color: isSelected ? color : AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isSelected ? color : AppColors.borderCard,
                  ),
                ),
                child: Icon(
                  icon,
                  size: 30,
                  color: isSelected ? Colors.white : color,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
              color: isSelected
                  ? AppColors.textPrimary
                  : AppColors.textSecondary,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
