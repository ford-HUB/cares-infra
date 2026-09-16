import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/event_category_icons.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/widgets/event_image_carousel.dart';

/// Compact row card for the "Popular Events" list: title, date and place on
/// the left, a square photo (or category-tinted fallback) on the right.
///
/// Every line starts on the same left edge and the thumbnail is fixed-size,
/// so a stack of these reads as one aligned column.
class EventListCard extends StatelessWidget {
  const EventListCard({super.key, required this.event, required this.onTap});

  final CaresEvent event;
  final VoidCallback onTap;

  static const _thumbSize = 84.0;

  @override
  Widget build(BuildContext context) {
    final categoryColor = eventCategoryColor(event.category);
    final urgent = !event.isCompleted && event.daysUntil <= 3;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          padding: const EdgeInsets.all(12),
          decoration: AppDecorations.surfaceCard(),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      event.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        height: 1.25,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _MetaLine(
                      icon: Icons.calendar_today_rounded,
                      text:
                          '${event.monthLabel} ${event.dayLabel}, ${event.date.year}',
                      trailing: urgent ? event.countdownLeftLabel : null,
                    ),
                    const SizedBox(height: 5),
                    _MetaLine(icon: Icons.place_rounded, text: event.location),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(
                  width: _thumbSize,
                  height: _thumbSize,
                  child: EventImageCarousel(
                    // First photo only — a slideshow inside an 84px square
                    // would just flicker.
                    imageUrls: event.imageUrls.take(1).toList(),
                    placeholder: _Placeholder(
                      color: categoryColor,
                      icon: eventCategoryIcon(event.category),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.icon, required this.text, this.trailing});

  final IconData icon;
  final String text;

  /// Short accent label after the text — "2d left" on a closing event.
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 13, color: AppColors.textMuted),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
              height: 1.2,
            ),
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 6),
          Text(
            '· $trailing',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.accentOrange,
            ),
          ),
        ],
      ],
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.color, required this.icon});

  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.16),
            color.withValues(alpha: 0.34),
          ],
        ),
      ),
      child: Center(
        child: Icon(icon, size: 30, color: color.withValues(alpha: 0.55)),
      ),
    );
  }
}
