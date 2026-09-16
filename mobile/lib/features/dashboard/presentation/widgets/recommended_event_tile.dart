import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';

/// One row in "Recommended Events": square thumbnail on the left, title,
/// organizer and schedule on the right, with the match strength tucked
/// under the schedule so a volunteer still sees *why* the row is here.
class RecommendedEventTile extends StatelessWidget {
  const RecommendedEventTile({
    super.key,
    required this.event,
    required this.onTap,
  });

  final RecommendedEvent event;
  final VoidCallback onTap;

  static const _thumbSize = 84.0;

  @override
  Widget build(BuildContext context) {
    final matchPercent = (event.matchScore.clamp(0, 1) * 100).round();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Thumbnail(event: event, size: _thumbSize),
              const SizedBox(width: 14),
              Expanded(
                child: SizedBox(
                  height: _thumbSize,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        event.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          height: 1.2,
                        ),
                      ),
                      _MetaLine(
                        icon: Icons.person_outline_rounded,
                        text: event.organizerName.isEmpty
                            ? event.location
                            : event.organizerName,
                      ),
                      _MetaLine(
                        icon: Icons.schedule_rounded,
                        text: _scheduleLabel(event.startsAt),
                      ),
                      Row(
                        children: [
                          const Icon(
                            Icons.auto_awesome,
                            size: 12,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$matchPercent% match',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            '${event.slotsLeft} slots left',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _scheduleLabel(DateTime date) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');
    return '${months[date.month - 1]} ${date.day}, $hour:$minute';
  }
}

/// First uploaded image when the event has one; otherwise a category-tinted
/// block with an icon so the row keeps its shape.
class _Thumbnail extends StatelessWidget {
  const _Thumbnail({required this.event, required this.size});

  final RecommendedEvent event;
  final double size;

  @override
  Widget build(BuildContext context) {
    final tint = eventCategoryColor(event.category);
    final urls = event.imageUrls;

    final placeholder = Container(
      color: tint.withValues(alpha: 0.14),
      alignment: Alignment.center,
      child: Icon(Icons.volunteer_activism_outlined, size: 28, color: tint),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        width: size,
        height: size,
        child: urls.isEmpty
            ? placeholder
            : Image.network(
                urls.first,
                headers: ApiClient().authHeaders(),
                fit: BoxFit.cover,
                gaplessPlayback: true,
                errorBuilder: (_, _, _) => placeholder,
                loadingBuilder: (context, child, progress) =>
                    progress == null ? child : placeholder,
              ),
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }
}
