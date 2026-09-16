import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/event_category_icons.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';

/// First photo of a server event, streamed with the bearer token because the
/// bucket is private. Events with no upload (and failed loads) fall back to
/// a category-tinted panel with the category glyph, so a card never shows a
/// broken image.
class HomeEventImage extends StatelessWidget {
  const HomeEventImage({super.key, required this.event, this.iconSize = 34});

  final RecommendedEvent event;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final tint = eventCategoryColor(event.category);
    final urls = event.imageUrls;

    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [tint.withValues(alpha: 0.75), tint],
        ),
      ),
      child: Center(
        child: Icon(
          eventCategoryIcon(event.category),
          size: iconSize,
          color: Colors.white.withValues(alpha: 0.85),
        ),
      ),
    );

    if (urls.isEmpty) return fallback;

    return Stack(
      fit: StackFit.expand,
      children: [
        fallback,
        Image.network(
          urls.first,
          headers: ApiClient().authHeaders(),
          fit: BoxFit.cover,
          gaplessPlayback: true,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        ),
      ],
    );
  }
}
