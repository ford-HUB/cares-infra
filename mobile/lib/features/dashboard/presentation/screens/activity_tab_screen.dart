import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/certificate_data.dart';
import 'package:mobile/features/dashboard/data/event_category_colors.dart';
import 'package:mobile/features/dashboard/data/event_feedback_store.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/domain/volunteer_activity.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_chips.dart';
import 'package:mobile/features/dashboard/screens/certificate_review_screen.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/dashboard/screens/event_feedback_screen.dart';
import 'package:mobile/features/dashboard/widgets/completed_event_widgets.dart';

class ActivityTabScreen extends ConsumerStatefulWidget {
  const ActivityTabScreen({super.key});

  @override
  ConsumerState<ActivityTabScreen> createState() => _ActivityTabScreenState();
}

/// Which slice of the page is showing. `all` stacks every section; the
/// rest show just theirs so a tap on "Registered" is only joined events.
enum _ActivityGroup { all, registered, completed }

extension on _ActivityGroup {
  String get label => switch (this) {
    _ActivityGroup.all => 'All',
    _ActivityGroup.registered => 'Registered',
    _ActivityGroup.completed => 'Completed',
  };

  IconData get icon => switch (this) {
    _ActivityGroup.all => Icons.grid_view_rounded,
    _ActivityGroup.registered => Icons.how_to_reg_rounded,
    _ActivityGroup.completed => Icons.task_alt_rounded,
  };

  /// Disc tint when the chip is idle — one brand green across the row, as
  /// on the Events tab's time filter; the selected chip fills solid.
  Color get color => AppColors.primary;
}

class _ActivityTabScreenState extends ConsumerState<ActivityTabScreen> {
  final _registrationStore = EventRegistrationStore.instance;
  final _feedbackStore = EventFeedbackStore.instance;
  final _certificateStore = CertificateStore.instance;

  _ActivityGroup _group = _ActivityGroup.all;

  /// Regroups once a minute so an event that just ended slides from
  /// "Registered" to "Completed" without leaving the tab.
  Timer? _phaseTimer;

  @override
  void initState() {
    super.initState();
    _feedbackStore.addListener(_onStoreChanged);
    _registrationStore.addListener(_onStoreChanged);
    _certificateStore.addListener(_onStoreChanged);
    _phaseTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _onStoreChanged(),
    );
  }

  @override
  void dispose() {
    _phaseTimer?.cancel();
    _feedbackStore.removeListener(_onStoreChanged);
    _registrationStore.removeListener(_onStoreChanged);
    _certificateStore.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  String get _userEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  /// Server-backed events this volunteer holds a slot on. The store is
  /// hydrated from `is_registered` on the recommended feed and updated by
  /// every join/cancel, so fixture-only events never reach this page.
  List<EventParticipation> get _participations => _registrationStore
      .participationsForEmail(_userEmail)
      .where((p) => p.event.serverId != null)
      .toList();

  /// Upcoming and ongoing events the volunteer joined, newest registration
  /// first. Ended ones show in their own section.
  List<EventParticipation> get _registered {
    final list = _participations.where((p) => !p.event.hasEnded()).toList();
    list.sort((a, b) => b.registeredAt.compareTo(a.registeredAt));
    return list;
  }

  /// Joined events that have ended — marked completed by the server or past
  /// their end time — latest first.
  List<CaresEvent> get _completed {
    final list = _participations
        .where((p) => p.event.hasEnded())
        .map((p) => p.event)
        .toList();
    list.sort((a, b) => b.date.compareTo(a.date));
    return list;
  }

  /// A joined event rendered through the activity card.
  VolunteerActivityEntry _entryFor(CaresEvent event) => VolunteerActivityEntry(
    id: event.id,
    eventTitle: event.title,
    category: event.category,
    date: event.longDateLabel,
    location: event.location,
    status: ActivityStatus.registered,
    hours: 0,
    pointsEarned: 0,
  );

  bool _showing(_ActivityGroup g) =>
      _group == _ActivityGroup.all || _group == g;

  /// The completed card's call to action: the questionnaire while feedback
  /// is outstanding, the certificate once the scheduler has issued it.
  Future<void> _onFeedbackTap(CaresEvent event) async {
    if (_feedbackStore.hasSubmitted(event.id, _userEmail)) {
      final issued = _certificateStore.forEvent(event.serverId);
      if (issued != null) {
        CertificateReviewScreen.open(context, issued);
        return;
      }
      await _certificateStore.refresh();
      if (!mounted) return;
      final refreshed = _certificateStore.forEvent(event.serverId);
      if (refreshed != null) {
        CertificateReviewScreen.open(context, refreshed);
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Your certificate is still being generated — check back shortly.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    final submitted = await EventFeedbackScreen.open(context, event);
    if (!mounted || !submitted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Thank you for your feedback!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Watching hydrates the store from the server's registration list —
    // including finished events the recommended feed no longer carries. The
    // page itself still renders from the store, so a join or cancel made on
    // the details screen shows up without waiting on the request.
    final remote = ref.watch(registeredEventsProvider);
    final loading = remote.isLoading && _participations.isEmpty;
    final registered = _registered;
    final completedEvents = _completed;

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: () => ref.refresh(registeredEventsProvider.future),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Activity',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your volunteer history and registrations',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: _GroupPanel(
                  selected: _group,
                  onSelected: (g) => setState(() => _group = g),
                ),
              ),
            ),
            if (_showing(_ActivityGroup.registered))
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: _Section(
                    title: 'Registered events',
                    subtitle: registered.isEmpty
                        ? 'Events you join will show up here.'
                        : 'Tap an event to see details or cancel.',
                    children: [
                      if (loading)
                        const _LoadingState()
                      else if (registered.isEmpty)
                        const _EmptyState(
                          icon: Icons.event_available_outlined,
                          title: 'No registered events yet',
                          message:
                              'Hit "Join now" on an event and it moves here.',
                        )
                      else
                        for (var i = 0; i < registered.length; i++) ...[
                          if (i > 0) const SizedBox(height: 12),
                          GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => EventDetailsScreen.open(
                              context,
                              registered[i].event,
                            ),
                            child: _ActivityCard(
                              entry: _entryFor(registered[i].event),
                            ),
                          ),
                        ],
                    ],
                  ),
                ),
              ),
            if (_showing(_ActivityGroup.completed))
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: _Section(
                    title: 'Completed events',
                    subtitle: completedEvents.isEmpty
                        ? 'Events you attended will show up here.'
                        : 'Submit feedback to unlock your certificate.',
                    children: [
                      if (loading)
                        const _LoadingState()
                      else if (completedEvents.isEmpty)
                        const _EmptyState(
                          icon: Icons.task_alt_rounded,
                          title: 'No completed events yet',
                          message:
                              'Once an event you joined wraps up, it lands here.',
                        )
                      else
                        ...completedEvents.map(
                          (event) => CompletedEventCard(
                            event: event,
                            feedbackSubmitted: _feedbackStore.hasSubmitted(
                              event.id,
                              _userEmail,
                            ),
                            certificateIssued:
                                _certificateStore.forEvent(event.serverId) !=
                                null,
                            onTap: () =>
                                EventDetailsScreen.open(context, event),
                            onFeedbackTap: () => _onFeedbackTap(event),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 28)),
          ],
        ),
      ),
    );
  }
}

/// Card-shaped placeholder while the first registration list is on its way,
/// so the empty state does not flash before the server answers.
class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 96,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: const Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      ),
    );
  }
}

/// Section header (title + one-line hint) over its cards.
class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppColors.primaryDark,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 12.5,
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
        const SizedBox(height: 12),
        ...children,
      ],
    );
  }
}

/// Icon accents used across the activity page.
const _kHoursColor = Color(0xFF1976D2);
const _kJoinedColor = Color(0xFF2D7634);
const _kPointsColor = Color(0xFFF9A825);
const _kDateColor = Color(0xFF5C6BC0);
const _kLocationColor = Color(0xFFE65100);

/// Group chip row: the home tab's icon-disc pills in the Events tab's green
/// outline colouring — brand-green fill when active, white with a hairline
/// otherwise. Scrolls horizontally and bleeds to the screen edge.
class _GroupPanel extends StatelessWidget {
  const _GroupPanel({required this.selected, required this.onSelected});

  final _ActivityGroup selected;
  final ValueChanged<_ActivityGroup> onSelected;

  @override
  Widget build(BuildContext context) {
    const groups = _ActivityGroup.values;
    return SizedBox(
      height: HomeCategoryChips.compactHeight,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: groups.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final group = groups[index];
          return HomeCategoryChip(
            label: group.label,
            icon: group.icon,
            color: group.color,
            isSelected: group == selected,
            onTap: () => onSelected(group),
            compact: true,
            outlined: true,
            selectedColor: AppColors.primary,
          );
        },
      ),
    );
  }
}

/// Placeholder card shown under a section that has nothing to list yet.
class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: _kJoinedColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: _kJoinedColor, size: 24),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.entry});

  final VolunteerActivityEntry entry;

  Color _statusColor(ActivityStatus status) => switch (status) {
    ActivityStatus.completed => AppColors.primary,
    ActivityStatus.registered => const Color(0xFF1976D2),
    ActivityStatus.cancelled => AppColors.heart,
  };

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(entry.status);
    final categoryColor = eventCategoryColor(entry.category);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: categoryColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.volunteer_activism_outlined,
              color: categoryColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        entry.eventTitle,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        entry.status.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  entry.category,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: categoryColor,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 13,
                      color: _kDateColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      entry.date,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 13,
                      color: _kLocationColor,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        entry.location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: AppColors.secondary.withValues(alpha: 0.95),
                        ),
                      ),
                    ),
                  ],
                ),
                if (entry.status == ActivityStatus.completed) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _MetaTag(
                        icon: Icons.schedule_outlined,
                        color: _kHoursColor,
                        label: '${entry.hours} hrs',
                      ),
                      const SizedBox(width: 8),
                      _MetaTag(
                        icon: Icons.bolt,
                        color: _kPointsColor,
                        label: '+${entry.pointsEarned} pts',
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaTag extends StatelessWidget {
  const _MetaTag({
    required this.icon,
    required this.color,
    required this.label,
  });

  final IconData icon;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
