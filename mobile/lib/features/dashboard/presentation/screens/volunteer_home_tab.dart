import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/mock_events.dart';
import 'package:mobile/features/dashboard/domain/mock_event.dart';
import 'package:mobile/features/dashboard/presentation/widgets/featured_events_carousel.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_header.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/stats_row.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/event_cards.dart'
    show UpcomingEventCard;

class VolunteerHomeTab extends StatelessWidget {
  const VolunteerHomeTab({
    super.key,
    required this.firstName,
    this.points = 0,
    this.serviceHours = 0,
    this.activities = 0,
    this.showProfileCompletionCard = true,
    this.onCompleteProfile,
    this.onSeeAllEvents,
  });

  final String firstName;
  final int points;
  final int serviceHours;
  final int activities;
  final bool showProfileCompletionCard;
  final VoidCallback? onCompleteProfile;

  /// Opens the events tab from the "See all" link on upcoming events.
  final VoidCallback? onSeeAllEvents;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            HomeHeader(firstName: firstName, points: points),
            const SizedBox(height: 22),
            FeaturedEventsCarousel(events: MockEvents.featured),
            const SizedBox(height: 22),
            StatsRow(
              serviceHours: serviceHours,
              activities: activities,
              points: points,
            ),
            if (showProfileCompletionCard) ...[
              const SizedBox(height: 16),
              ProfileCompletionCard(onTap: onCompleteProfile),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Upcoming Events',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                if (onSeeAllEvents != null)
                  TextButton(
                    onPressed: onSeeAllEvents,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      visualDensity: VisualDensity.compact,
                    ),
                    child: const Text(
                      'See all',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            for (final event in kMockUpcomingEvents)
              UpcomingEventCard(
                event: event,
                onTap: () => EventDetailsScreen.open(context, event),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
