import 'package:flutter/material.dart';
import '../../../../core/session/static_user_session.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/mock_events.dart';
import '../../screens/event_details_screen.dart';
import '../../widgets/dashboard_shell_widgets.dart';
import '../../widgets/event_cards.dart';

class StudentHomeTab extends StatelessWidget {
  const StudentHomeTab({
    super.key,
    required this.user,
    required this.isDonorMode,
    required this.onModeToggle,
  });

  final StaticSessionUser user;
  final bool isDonorMode;
  final VoidCallback onModeToggle;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 12, 0),
            child: DashboardHeader(
              firstName: user.firstName,
              isDonorMode: isDonorMode,
              onModeToggle: onModeToggle,
            ),
          ),
        ),
        if (isDonorMode)
          ..._donorSlivers(context)
        else
          ..._volunteerSlivers(context),
      ],
    );
  }

  List<Widget> _volunteerSlivers(BuildContext context) {
    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
          child: FeaturedEventsCarousel(events: kMockFeaturedEvents),
        ),
      ),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
          child: Text(
            'Upcoming Events',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            final event = kMockUpcomingEvents[index];
            return UpcomingEventCard(
              event: event,
              onTap: () => EventDetailsScreen.open(context, event),
            );
          }, childCount: kMockUpcomingEvents.length),
        ),
      ),
    ];
  }

  /// The prototype has no server behind it, so donor mode shows nothing here;
  /// the real donor dashboard reads `GET /events/donations`.
  List<Widget> _donorSlivers(BuildContext context) {
    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
          child: Text(
            'Donation Campaigns',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ),
      const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Text(
            'Sign in as a donor to see events accepting donations.',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
        ),
      ),
    ];
  }
}
