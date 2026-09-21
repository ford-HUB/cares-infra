import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/certificate_data.dart';
import 'package:mobile/features/dashboard/data/event_feedback_store.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/domain/volunteer_activity.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/screens/certificate_review_screen.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/dashboard/screens/event_feedback_screen.dart';
import 'package:mobile/features/dashboard/widgets/activity_tab_widgets.dart';
import 'package:mobile/features/dashboard/widgets/completed_event_widgets.dart';

class ActivityTabScreen extends ConsumerStatefulWidget {
  const ActivityTabScreen({super.key});

  @override
  ConsumerState<ActivityTabScreen> createState() => _ActivityTabScreenState();
}

class _ActivityTabScreenState extends ConsumerState<ActivityTabScreen> {
  final _registrationStore = EventRegistrationStore.instance;
  final _feedbackStore = EventFeedbackStore.instance;
  final _certificateStore = CertificateStore.instance;

  ActivityGroup _group = ActivityGroup.all;

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

  bool _showing(ActivityGroup g) => _group == ActivityGroup.all || _group == g;

  /// The completed card's call to action: the questionnaire while feedback
  /// is outstanding, the certificate once the scheduler has issued it.
  Future<void> _onFeedbackTap(CaresEvent event) async {
    if (_feedbackStore.hasSubmitted(event.id, _userEmail)) {
      final issued = _certificateStore.forEvent(event.serverId);
      if (issued != null) {
        CertificateReviewScreen.open(context, issued);
        return;
      }
      final fetched = await _certificateStore.refresh();
      if (!mounted) return;
      final refreshed = _certificateStore.forEvent(event.serverId);
      if (refreshed != null) {
        CertificateReviewScreen.open(context, refreshed);
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            fetched
                ? 'Your certificate is still being generated — check back shortly.'
                : 'Could not load your certificates: '
                      '${_certificateStore.lastError ?? 'unknown error'}',
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
                child: ActivityGroupPanel(
                  selected: _group,
                  onSelected: (g) => setState(() => _group = g),
                ),
              ),
            ),
            if (_showing(ActivityGroup.registered))
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: ActivitySection(
                    title: 'Registered events',
                    subtitle: registered.isEmpty
                        ? 'Events you join will show up here.'
                        : 'Tap an event to see details or cancel.',
                    children: [
                      if (loading)
                        const ActivityLoadingState()
                      else if (registered.isEmpty)
                        const ActivityEmptyState(
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
                            child: ActivityEntryCard(
                              entry: _entryFor(registered[i].event),
                            ),
                          ),
                        ],
                    ],
                  ),
                ),
              ),
            if (_showing(ActivityGroup.completed))
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: ActivitySection(
                    title: 'Completed events',
                    subtitle: completedEvents.isEmpty
                        ? 'Events you attended will show up here.'
                        : 'Submit feedback to unlock your certificate.',
                    children: [
                      if (loading)
                        const ActivityLoadingState()
                      else if (completedEvents.isEmpty)
                        const ActivityEmptyState(
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
