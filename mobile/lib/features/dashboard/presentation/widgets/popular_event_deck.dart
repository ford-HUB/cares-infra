import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/presentation/utils/home_event_format.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_event_image.dart';

/// Horizontal deck of white poster cards: hero photo, then title, date,
/// place, and the joined count beside an ink "JOIN NOW" pill. Bleeds to the
/// screen edge; the first card lines up with [gutter].
class PopularEventDeck extends StatelessWidget {
  const PopularEventDeck({
    super.key,
    required this.events,
    required this.gutter,
    required this.onOpen,
  });

  final List<RecommendedEvent> events;
  final double gutter;
  final ValueChanged<RecommendedEvent> onOpen;

  static const double cardWidth = 236;
  static const double cardHeight = 292;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: cardHeight,
      child: ListView.separated(
        padding: EdgeInsets.symmetric(horizontal: gutter),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: events.length,
        separatorBuilder: (_, _) => const SizedBox(width: 16),
        itemBuilder: (context, index) => SizedBox(
          width: cardWidth,
          child: PopularEventCard(
            event: events[index],
            onOpen: () => onOpen(events[index]),
          ),
        ),
      ),
    );
  }
}

/// Same footprint as the deck while the fetch is in flight.
class PopularEventDeckSkeleton extends StatelessWidget {
  const PopularEventDeckSkeleton({super.key, required this.gutter});

  final double gutter;

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: SizedBox(
        height: PopularEventDeck.cardHeight,
        child: ListView(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(),
          children: const [
            SkeletonBox(
              width: PopularEventDeck.cardWidth,
              height: PopularEventDeck.cardHeight,
              radius: 22,
            ),
            SizedBox(width: 16),
            SkeletonBox(
              width: PopularEventDeck.cardWidth,
              height: PopularEventDeck.cardHeight,
              radius: 22,
            ),
          ],
        ),
      ),
    );
  }
}

class PopularEventCard extends StatelessWidget {
  const PopularEventCard({
    super.key,
    required this.event,
    required this.onOpen,
  });

  final RecommendedEvent event;
  final VoidCallback onOpen;

  static const _radius = 22.0;

  @override
  Widget build(BuildContext context) {
    final place = event.location.isEmpty ? event.organizerName : event.location;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(_radius),
      elevation: 6,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(_radius),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 216 / 150,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      HomeEventImage(event: event),
                      Positioned(
                        top: 8,
                        left: 8,
                        child: _SlotsBadge(slotsLeft: event.slotsLeft),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1B1F24),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _Meta(
                          icon: Icons.calendar_today_rounded,
                          text: homeEventRangeLabel(
                            event.startsAt,
                            event.endsAt,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _Meta(
                            icon: Icons.location_on_rounded,
                            text: place,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: _JoinedCount(
                            joined: event.participants,
                            capacity: event.maxParticipants,
                          ),
                        ),
                        _JoinPill(onPressed: onOpen),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "12 slots left" over the photo; turns orange when nearly full so the
/// scarcity reads before the title does.
class _SlotsBadge extends StatelessWidget {
  const _SlotsBadge({required this.slotsLeft});

  final int slotsLeft;

  @override
  Widget build(BuildContext context) {
    final full = slotsLeft == 0;
    final scarce = !full && slotsLeft <= 5;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: scarce
            ? AppColors.accentOrange
            : Colors.black.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: Text(
        full ? 'Full' : '$slotsLeft slots left',
        style: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
    );
  }
}

/// "38 / 50 joined" with a hairline capacity bar underneath — the server
/// sends counts, not member photos, so the count is the honest version of
/// the reference's avatar stack.
class _JoinedCount extends StatelessWidget {
  const _JoinedCount({required this.joined, required this.capacity});

  final int joined;
  final int capacity;

  @override
  Widget build(BuildContext context) {
    final fill = capacity == 0 ? 0.0 : (joined / capacity).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            const Icon(
              Icons.groups_rounded,
              size: 15,
              color: Color(0xFF6B7280),
            ),
            const SizedBox(width: 5),
            Text(
              capacity == 0 ? '$joined joined' : '$joined / $capacity joined',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: SizedBox(
            height: 3,
            width: 96,
            child: LinearProgressIndicator(
              value: fill,
              backgroundColor: const Color(0xFFE5E7EB),
              color: fill >= 0.9 ? AppColors.accentOrange : AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppColors.accentOrange),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Color(0xFF6B7280),
            ),
          ),
        ),
      ],
    );
  }
}

class _JoinPill extends StatelessWidget {
  const _JoinPill({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFF1B1F24),
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 30),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
        ),
      ),
      child: const Text('JOIN NOW'),
    );
  }
}
