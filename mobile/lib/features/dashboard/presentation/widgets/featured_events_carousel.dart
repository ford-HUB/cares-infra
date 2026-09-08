import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/domain/mock_event.dart';

class FeaturedEventsCarousel extends StatefulWidget {
  const FeaturedEventsCarousel({super.key, required this.events});

  final List<MockEvent> events;

  @override
  State<FeaturedEventsCarousel> createState() => _FeaturedEventsCarouselState();
}

class _FeaturedEventsCarouselState extends State<FeaturedEventsCarousel> {
  final PageController _pageController = PageController(viewportFraction: 1);
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goToPage(int index) {
    if (widget.events.isEmpty) return;
    if (!_pageController.hasClients) return;
    final target = index.clamp(0, widget.events.length - 1);
    _pageController.animateToPage(
      target,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.events.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Featured Events',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            Text(
              'Swipe to explore',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.secondary.withValues(alpha: 0.9),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 210,
          child: ClipRect(
            child: Stack(
              alignment: Alignment.center,
              children: [
                PageView.builder(
                  controller: _pageController,
                  clipBehavior: Clip.hardEdge,
                  itemCount: widget.events.length,
                  onPageChanged: (index) =>
                      setState(() => _currentPage = index),
                  itemBuilder: (context, index) {
                    return _EventCard(event: widget.events[index]);
                  },
                ),
                Positioned(
                  left: 4,
                  child: _CarouselArrow(
                    icon: Icons.chevron_left,
                    onTap: () => _goToPage(_currentPage - 1),
                  ),
                ),
                Positioned(
                  right: 4,
                  child: _CarouselArrow(
                    icon: Icons.chevron_right,
                    onTap: () => _goToPage(_currentPage + 1),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < widget.events.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _currentPage ? 22 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: i == _currentPage
                      ? AppColors.primary
                      : AppColors.light.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _CarouselArrow extends StatelessWidget {
  const _CarouselArrow({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.35),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 32,
          height: 32,
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event});

  final MockEvent event;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            event.imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(
              color: AppColors.secondary.withValues(alpha: 0.35),
              child: const Icon(
                Icons.event,
                size: 48,
                color: AppColors.primaryDark,
              ),
            ),
            loadingBuilder: (context, child, progress) {
              if (progress == null) return child;
              return Container(
                color: AppColors.light.withValues(alpha: 0.4),
                alignment: Alignment.center,
                child: const CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              );
            },
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.72),
                ],
                stops: const [0.45, 1.0],
              ),
            ),
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 14,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: eventCategoryColor(event.category),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    event.category,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  event.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 14,
                      color: Colors.white70,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      event.date,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Icon(
                      Icons.location_on_outlined,
                      size: 14,
                      color: Colors.white70,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        event.location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
