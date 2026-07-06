import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/domain/mock_event.dart';
import 'package:mobile/features/dashboard/presentation/widgets/featured_events_carousel.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_header.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/stats_row.dart';

class VolunteerHomeTab extends StatelessWidget {
  const VolunteerHomeTab({
    super.key,
    required this.firstName,
    this.points = 240,
    this.serviceHours = 0,
    this.activities = 0,
  });

  final String firstName;
  final int points;
  final int serviceHours;
  final int activities;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            HomeHeader(
              firstName: firstName,
              points: points,
            ),
            const SizedBox(height: 22),
            FeaturedEventsCarousel(events: MockEvents.featured),
            const SizedBox(height: 22),
            StatsRow(
              serviceHours: serviceHours,
              activities: activities,
              points: points,
            ),
            const SizedBox(height: 16),
            ProfileCompletionCard(
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Profile completion coming soon.'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
