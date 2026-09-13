import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';

/// Swipeable deck of events the server's NLP matched to the volunteer's
/// interests. One card fills most of the width with the next one peeking in
/// from the right, and a dot strip underneath tracks the position — the home
/// tab's first fold is spent on matches instead of a row of summary tiles.
class MatchedEventsCarousel extends StatefulWidget {
  const MatchedEventsCarousel({
    super.key,
    required this.events,
    required this.onEventTap,
    this.height = 218,
  });

  final List<RecommendedEvent> events;
  final ValueChanged<RecommendedEvent> onEventTap;
  final double height;

  @override
  State<MatchedEventsCarousel> createState() => _MatchedEventsCarouselState();
}

class _MatchedEventsCarouselState extends State<MatchedEventsCarousel> {
  static const _viewportFraction = 0.9;
  static const _pageGap = 12.0;

  late final PageController _controller = PageController(
    viewportFraction: _viewportFraction,
  );
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final single = widget.events.length == 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: widget.height,
          child: PageView.builder(
            controller: _controller,
            padEnds: false,
            physics: single
                ? const NeverScrollableScrollPhysics()
                : const PageScrollPhysics(),
            clipBehavior: Clip.none,
            itemCount: widget.events.length,
            onPageChanged: (index) => setState(() => _page = index),
            itemBuilder: (context, index) {
              final event = widget.events[index];
              return Padding(
                // Last card keeps its gap so it doesn't glue to the edge
                // while the deck overscrolls.
                padding: EdgeInsets.only(right: single ? 0 : _pageGap),
                child: MatchedEventCard(
                  event: event,
                  rank: index + 1,
                  onTap: () => widget.onEventTap(event),
                ),
              );
            },
          ),
        ),
        if (!single) ...[
          const SizedBox(height: 12),
          _PageDots(count: widget.events.length, current: _page),
        ],
      ],
    );
  }
}

/// One matched event. The top strip carries the match strength and the
/// interests that caused it, so a volunteer can tell *why* the card is here
/// before reading the title.
class MatchedEventCard extends StatelessWidget {
  const MatchedEventCard({
    super.key,
    required this.event,
    required this.rank,
    this.onTap,
  });

  final RecommendedEvent event;

  /// 1-based position in the deck; the best match is highlighted.
  final int rank;
  final VoidCallback? onTap;

  static const _maxVisibleInterests = 3;

  @override
  Widget build(BuildContext context) {
    final categoryColor = eventCategoryColor(event.category);
    final interests = event.matchedInterests;
    final overflow = interests.length - _maxVisibleInterests;
    final matchPercent = (event.matchScore.clamp(0, 1) * 100).round();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        child: Ink(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            border: Border.all(color: AppColors.borderCard, width: 1),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryDark.withValues(alpha: 0.06),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppColors.cardRadius),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _MatchStrip(
                  matchPercent: matchPercent,
                  isTopMatch: rank == 1,
                  category: event.category,
                  categoryColor: categoryColor,
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (interests.isNotEmpty)
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              for (final interest
                                  in interests.take(_maxVisibleInterests))
                                _InterestTag(label: interest.label),
                              if (overflow > 0)
                                _InterestTag(label: '+$overflow', muted: true),
                            ],
                          ),
                        const Spacer(),
                        _MetaRow(event: event),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Tinted band across the top of a card: match strength on the left,
/// category on the right.
class _MatchStrip extends StatelessWidget {
  const _MatchStrip({
    required this.matchPercent,
    required this.isTopMatch,
    required this.category,
    required this.categoryColor,
  });

  final int matchPercent;
  final bool isTopMatch;
  final String category;
  final Color categoryColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 12, 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.light.withValues(alpha: 0.42),
            AppColors.light.withValues(alpha: 0.16),
          ],
        ),
        border: const Border(
          bottom: BorderSide(color: AppColors.borderCard, width: 1),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isTopMatch ? Icons.auto_awesome : Icons.auto_awesome_outlined,
            size: 15,
            color: AppColors.primaryDark,
          ),
          const SizedBox(width: 6),
          Text(
            isTopMatch ? 'Top match · $matchPercent%' : '$matchPercent% match',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
              letterSpacing: 0.1,
            ),
          ),
          const Spacer(),
          if (category.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(
                color: categoryColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppColors.pillRadius),
              ),
              child: Text(
                category,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: categoryColor,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.event});

  final RecommendedEvent event;

  static const _style = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: AppColors.textSecondary,
  );

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(
          Icons.calendar_today_outlined,
          size: 13,
          color: AppColors.textSecondary,
        ),
        const SizedBox(width: 5),
        Text(_dateLabel(event.startsAt), style: _style),
        const SizedBox(width: 12),
        const Icon(Icons.place_outlined, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            event.location,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: _style,
          ),
        ),
        const SizedBox(width: 10),
        Text(
          '${event.slotsLeft} slots left',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }

  static String _dateLabel(DateTime date) {
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
    return '${months[date.month - 1]} ${date.day}';
  }
}

class _InterestTag extends StatelessWidget {
  const _InterestTag({required this.label, this.muted = false});

  final String label;

  /// The "+n" overflow chip — same shape, no heart, quieter colour.
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final accent = muted ? AppColors.textSecondary : AppColors.primary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: muted ? 0.08 : 0.14),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        border: Border.all(color: accent.withValues(alpha: 0.35), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!muted) ...[
            Icon(Icons.favorite, size: 11, color: accent),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: accent,
            ),
          ),
        ],
      ),
    );
  }
}

class _PageDots extends StatelessWidget {
  const _PageDots({required this.count, required this.current});

  final int count;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOut,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == current ? 18 : 6,
            height: 6,
            decoration: BoxDecoration(
              color: i == current
                  ? AppColors.primary
                  : AppColors.light.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(AppColors.pillRadius),
            ),
          ),
      ],
    );
  }
}
