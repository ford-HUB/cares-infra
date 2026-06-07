import 'dart:async';

import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../data/mock_events.dart';
import '../screens/event_details_screen.dart';

class FeaturedEventsCarousel extends StatefulWidget {
  const FeaturedEventsCarousel({super.key, required this.events});

  final List<CaresEvent> events;

  @override
  State<FeaturedEventsCarousel> createState() => _FeaturedEventsCarouselState();
}

class _FeaturedEventsCarouselState extends State<FeaturedEventsCarousel> {
  late final PageController _pageController;
  Timer? _autoScrollTimer;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _startAutoScroll();
  }

  void _startAutoScroll() {
    if (widget.events.length <= 1) return;
    _autoScrollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_pageController.hasClients) return;
      final next = (_currentPage + 1) % widget.events.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _openEvent(CaresEvent event) {
    EventDetailsScreen.open(context, event);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Featured Events',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            TextButton(
              onPressed: () {},
              child: const Text('See all'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 190,
          child: PageView.builder(
            controller: _pageController,
            itemCount: widget.events.length,
            onPageChanged: (index) => setState(() => _currentPage = index),
            itemBuilder: (context, index) {
              final event = widget.events[index];
              return Padding(
                padding: const EdgeInsets.only(right: 4),
                child: _FeaturedEventCard(
                  event: event,
                  onTap: () => _openEvent(event),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.events.length, (index) {
            final active = index == _currentPage;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: active ? 20 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: active ? AppColors.primary : AppColors.inputFill,
                borderRadius: BorderRadius.circular(4),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _FeaturedEventCard extends StatelessWidget {
  const _FeaturedEventCard({
    required this.event,
    required this.onTap,
  });

  final CaresEvent event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.primary, AppColors.primaryLight],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: -20,
                bottom: -20,
                child: Icon(
                  Icons.volunteer_activism_rounded,
                  size: 120,
                  color: Colors.white.withValues(alpha: 0.12),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        event.organization,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      event.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on_outlined,
                          size: 14,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            event.location,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${event.slotsLeft} slots left',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'View Details',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.95),
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(
                              Icons.arrow_forward_rounded,
                              size: 16,
                              color: Colors.white.withValues(alpha: 0.95),
                            ),
                          ],
                        ),
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

class UpcomingEventCard extends StatelessWidget {
  const UpcomingEventCard({
    super.key,
    required this.event,
    this.onTap,
  });

  final CaresEvent event;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.inputFill),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
            children: [
              Container(
                width: 52,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.inputFill,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      event.dayLabel,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                        height: 1,
                      ),
                    ),
                    Text(
                      event.monthLabel,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on_outlined,
                          size: 14,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            event.location,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: event.capacityFilled,
                        minHeight: 4,
                        backgroundColor: AppColors.inputFill,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: event.daysUntil <= 3
                          ? AppColors.secondary.withValues(alpha: 0.12)
                          : AppColors.inputFill,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      event.countdownLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: event.daysUntil <= 3
                            ? AppColors.secondary
                            : AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.textMuted.withValues(alpha: 0.8),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }
}
