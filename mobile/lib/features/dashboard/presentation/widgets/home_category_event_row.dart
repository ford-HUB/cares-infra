import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/presentation/utils/home_event_format.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_event_image.dart';

/// Compact row card under the category chips: square thumbnail, title with
/// date • place, and a right column with the slots-left tag over "JOIN NOW".
class HomeCategoryEventRow extends StatelessWidget {
  const HomeCategoryEventRow({
    super.key,
    required this.event,
    required this.onOpen,
  });

  final RecommendedEvent event;
  final VoidCallback onOpen;

  static const _thumbSize = 62.0;

  @override
  Widget build(BuildContext context) {
    final place = event.location.isEmpty ? event.organizerName : event.location;
    final full = event.slotsLeft == 0;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: _thumbSize,
                  height: _thumbSize,
                  child: HomeEventImage(event: event, iconSize: 24),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1B1F24),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(text: homeEventDateLabel(event.startsAt)),
                          const TextSpan(
                            text: '  •  ',
                            style: TextStyle(color: AppColors.accentOrange),
                          ),
                          const WidgetSpan(
                            alignment: PlaceholderAlignment.middle,
                            child: Icon(
                              Icons.location_on_rounded,
                              size: 12,
                              color: AppColors.accentOrange,
                            ),
                          ),
                          TextSpan(text: ' $place'),
                        ],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    full ? 'Full' : '${event.slotsLeft} slots left',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: full
                          ? const Color(0xFF9CA3AF)
                          : AppColors.accentOrange,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    full ? 'VIEW' : 'JOIN NOW',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1B1F24),
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
