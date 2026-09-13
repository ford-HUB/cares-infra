import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_header.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/recommended_events_section.dart';

class VolunteerHomeTab extends StatelessWidget {
  const VolunteerHomeTab({
    super.key,
    required this.firstName,
    this.points = 0,
    this.showProfileCompletionCard = true,
    this.onCompleteProfile,
    this.onSeeAllEvents,
    this.interestsVersion = 0,
    this.onInterestsChanged,
  });

  final String firstName;
  final int points;
  final bool showProfileCompletionCard;
  final VoidCallback? onCompleteProfile;

  /// Opens the events tab from the "See all" link on recommended events.
  final VoidCallback? onSeeAllEvents;

  /// Bumped by the shell whenever the volunteer's interests change, so the
  /// recommended section remounts and asks the server for a fresh match.
  final int interestsVersion;

  /// Fired when the volunteer picks interests from the recommended section's
  /// own prompt.
  final VoidCallback? onInterestsChanged;

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
            if (showProfileCompletionCard) ...[
              const SizedBox(height: 18),
              ProfileCompletionCard(onTap: onCompleteProfile),
            ],
            // The matched-events deck takes the first fold: the summary
            // tiles that used to sit here live on the profile tab.
            const SizedBox(height: 22),
            RecommendedEventsSection(
              key: ValueKey('recommended-$interestsVersion'),
              onInterestsChanged: onInterestsChanged,
              onSeeAll: onSeeAllEvents,
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
