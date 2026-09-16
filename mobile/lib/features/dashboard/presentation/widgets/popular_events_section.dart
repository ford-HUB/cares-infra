import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_section_header.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';

/// "Popular Events" on the volunteer home tab: a horizontal deck of dark
/// poster-style cards with a "Book your slot" call to action.
///
/// Shares the recommended-events fetch with the section below it and ranks
/// by how full each event already is — the closest thing to "popular" the
/// server exposes today. Errors and empty states are left to the
/// recommended section so the home tab shows them once.
class PopularEventsSection extends ConsumerWidget {
  const PopularEventsSection({
    super.key,
    required this.gutter,
    this.onSeeAll,
    this.maxItems = 5,
  });

  /// Horizontal inset the header and the first card line up with; the deck
  /// itself bleeds to the screen edge.
  final double gutter;
  final VoidCallback? onSeeAll;
  final int maxItems;

  static const _cardWidth = 250.0;
  static const _cardHeight = 170.0;

  List<RecommendedEvent> _rank(List<RecommendedEvent> events) {
    double fill(RecommendedEvent e) =>
        e.maxParticipants == 0 ? 0 : e.participants / e.maxParticipants;
    final sorted = [...events]..sort((a, b) => fill(b).compareTo(fill(a)));
    return sorted.take(maxItems).toList();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(recommendedEventsProvider);

    final deck = page.when(
      loading: () => _PopularSkeleton(gutter: gutter, height: _cardHeight),
      error: (_, _) => null,
      data: (data) {
        final events = _rank(data.events);
        if (events.isEmpty) return null;
        return SizedBox(
          height: _cardHeight,
          child: ListView.separated(
            padding: EdgeInsets.symmetric(horizontal: gutter),
            clipBehavior: Clip.none,
            scrollDirection: Axis.horizontal,
            itemCount: events.length,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (context, index) => SizedBox(
              width: _cardWidth,
              child: PopularEventCard(
                event: events[index],
                onBook: () => EventDetailsScreen.open(
                  context,
                  events[index].toCaresEvent(),
                ),
              ),
            ),
          ),
        );
      },
    );
    if (deck == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          child: HomeSectionHeader(title: 'Popular Events', onSeeAll: onSeeAll),
        ),
        const SizedBox(height: 12),
        deck,
        const SizedBox(height: 26),
      ],
    );
  }
}

/// Dark poster card: a category-tinted backdrop stands in for a hero image,
/// with title, organizer and schedule stacked above the booking button.
class PopularEventCard extends StatelessWidget {
  const PopularEventCard({super.key, required this.event, required this.onBook});

  final RecommendedEvent event;
  final VoidCallback onBook;

  static const _ink = Color(0xFF14201A);

  @override
  Widget build(BuildContext context) {
    final tint = eventCategoryColor(event.category);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onBook,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          decoration: BoxDecoration(
            color: _ink,
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            boxShadow: [
              BoxShadow(
                color: _ink.withValues(alpha: 0.28),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            child: Stack(
              fit: StackFit.expand,
              children: [
                _Backdrop(tint: tint),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      _MetaLine(
                        icon: Icons.person_outline_rounded,
                        text: event.organizerName.isEmpty
                            ? event.location
                            : event.organizerName,
                      ),
                      const Spacer(),
                      _MetaLine(
                        icon: Icons.schedule_rounded,
                        text: _scheduleLabel(event.startsAt),
                      ),
                      const SizedBox(height: 10),
                      _BookButton(onPressed: onBook),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _scheduleLabel(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final meridiem = date.hour < 12 ? 'AM' : 'PM';
    return '${months[date.month - 1]} ${date.day}, $hour:$minute $meridiem';
  }
}

/// Category colour pooled in the lower half of the card, fading up into the
/// dark ground so the white type stays readable at the top.
class _Backdrop extends StatelessWidget {
  const _Backdrop({required this.tint});

  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: const [0.0, 0.45, 1.0],
              colors: [
                PopularEventCard._ink,
                PopularEventCard._ink,
                tint.withValues(alpha: 0.85),
              ],
            ),
          ),
        ),
        Positioned(
          right: -30,
          bottom: -40,
          child: Container(
            width: 150,
            height: 150,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: tint.withValues(alpha: 0.35),
            ),
          ),
        ),
      ],
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
        Icon(icon, size: 14, color: Colors.white.withValues(alpha: 0.85)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
        ),
      ],
    );
  }
}

class _BookButton extends StatelessWidget {
  const _BookButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.accentOrange,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 32),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.pillRadius),
          ),
          textStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        child: const Text('Book your slot'),
      ),
    );
  }
}

class _PopularSkeleton extends StatelessWidget {
  const _PopularSkeleton({required this.gutter, required this.height});

  final double gutter;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: SizedBox(
        height: height,
        child: ListView(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(),
          children: const [
            SkeletonBox(width: 250, height: 170, radius: AppColors.cardRadius),
            SizedBox(width: 14),
            SkeletonBox(width: 250, height: 170, radius: AppColors.cardRadius),
          ],
        ),
      ),
    );
  }
}
