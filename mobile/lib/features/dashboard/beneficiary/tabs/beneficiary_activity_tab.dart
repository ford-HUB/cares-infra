import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/domain/volunteer_activity.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/activity_tab_widgets.dart';
import 'package:mobile/features/dashboard/widgets/completed_event_widgets.dart';

/// Beneficiary activity — the volunteer tab's layout (All / Registered /
/// Completed chips over two sections) fed by the events this beneficiary
/// applied for: `GET /events/beneficiary` for the ones still ahead and
/// `GET /events/beneficiary/completed` for the ones that ran. Nothing of the
/// volunteer's registrations, feedback or certificates reaches this page.
class BeneficiaryActivityTab extends ConsumerStatefulWidget {
  const BeneficiaryActivityTab({super.key});

  @override
  ConsumerState<BeneficiaryActivityTab> createState() =>
      _BeneficiaryActivityTabState();
}

class _BeneficiaryActivityTabState
    extends ConsumerState<BeneficiaryActivityTab> {
  ActivityGroup _group = ActivityGroup.all;

  bool _showing(ActivityGroup g) => _group == ActivityGroup.all || _group == g;

  Future<void> _refresh() async {
    ref.invalidate(beneficiaryEventsProvider);
    ref.invalidate(beneficiaryCompletedEventsProvider);
    await Future.wait([
      ref.read(beneficiaryEventsProvider.future),
      ref.read(beneficiaryCompletedEventsProvider.future),
    ]);
  }

  VolunteerActivityEntry _entryFor(CaresEvent event) => VolunteerActivityEntry(
    id: event.id,
    eventTitle: event.title,
    category: event.category,
    date: event.longDateLabel,
    location: event.location,
    status: event.isApplicationRejected
        ? ActivityStatus.rejected
        : ActivityStatus.registered,
    hours: 0,
    pointsEarned: 0,
  );

  void _open(CaresEvent event) =>
      EventDetailsScreen.open(context, event, readOnly: true);

  /// Only events the beneficiary has applied for — the feeds carry every
  /// event open to beneficiaries, with `application_status` null on the rest.
  AsyncValue<List<RecommendedEvent>> _applied(
    AsyncValue<List<RecommendedEvent>> value,
  ) => value.whenData(
    (events) => events.where((e) => e.applicationStatus != null).toList(),
  );

  @override
  Widget build(BuildContext context) {
    final upcoming = _applied(ref.watch(beneficiaryEventsProvider));
    final completed = _applied(ref.watch(beneficiaryCompletedEventsProvider));

    return ColoredBox(
      color: AppColors.background,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: ActivityHeader(
                selected: _group,
                onSelected: (g) => setState(() => _group = g),
              ),
            ),
            if (_showing(ActivityGroup.registered))
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: ActivitySection(
                    icon: Icons.event_available_outlined,
                    title: 'Registered Events',
                    subtitle: (upcoming.valueOrNull ?? const []).isEmpty
                        ? 'Events you apply for will show up here.'
                        : 'Tap an event to see the details.',
                    children: [
                      _Body(
                        value: upcoming,
                        onRetry: () =>
                            ref.invalidate(beneficiaryEventsProvider),
                        empty: const ActivityEmptyState(
                          icon: Icons.event_available_outlined,
                          title: 'No Registered Events Yet',
                          message:
                              'Apply for an event from Home or Events and it lands here.',
                        ),
                        builder: (events) => [
                          for (var i = 0; i < events.length; i++) ...[
                            if (i > 0) const SizedBox(height: 12),
                            GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: () => _open(events[i]),
                              child: ActivityEntryCard(
                                entry: _entryFor(events[i]),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            if (_showing(ActivityGroup.completed))
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 26, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: ActivitySection(
                    icon: Icons.check_circle_outline_rounded,
                    title: 'Completed Events',
                    subtitle: 'Events you applied for that have already run.',
                    children: [
                      _Body(
                        value: completed,
                        onRetry: () =>
                            ref.invalidate(beneficiaryCompletedEventsProvider),
                        empty: const ActivityEmptyState(
                          icon: Icons.check_circle_outline_rounded,
                          backdrop: ActivityEmptyBackdrop.tile,
                          title: 'No Completed Events Yet',
                          message:
                              'Once an event you applied for wraps up, it lands here.',
                        ),
                        builder: (events) => [
                          for (final event in events)
                            CompletedEventCard(
                              event: event,
                              feedbackSubmitted: false,
                              showFeedback: false,
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }
}

/// One section's contents across the fetch's states: the loading card, the
/// error card with retry, the empty card, or the built list.
class _Body extends StatelessWidget {
  const _Body({
    required this.value,
    required this.onRetry,
    required this.empty,
    required this.builder,
  });

  final AsyncValue<List<RecommendedEvent>> value;
  final VoidCallback onRetry;
  final Widget empty;
  final List<Widget> Function(List<CaresEvent> events) builder;

  @override
  Widget build(BuildContext context) {
    return value.when(
      loading: () => const ActivityLoadingState(),
      error: (error, _) => _ErrorState(
        message: error is ApiException
            ? error.message
            : 'Could not load events right now.',
        onRetry: onRetry,
      ),
      data: (events) {
        if (events.isEmpty) return empty;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: builder(events.map((e) => e.toCaresEvent()).toList()),
        );
      },
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
      decoration: AppDecorations.groundCard(radius: 20),
      child: Column(
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 10),
          TextButton(onPressed: onRetry, child: const Text('Try Again')),
        ],
      ),
    );
  }
}
