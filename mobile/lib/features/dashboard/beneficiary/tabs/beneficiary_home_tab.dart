import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/beneficiary/widgets/beneficiary_home_widgets.dart';
import 'package:mobile/features/dashboard/beneficiary/widgets/beneficiary_request_timeline.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/beneficiary_request_counts_provider.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_hero_particles.dart';
import 'package:mobile/features/dashboard/screens/assistance_request_details_screen.dart';
import 'package:mobile/features/dashboard/screens/event_details_screen.dart';
import 'package:mobile/features/dashboard/screens/needs_assessment_screen.dart';
import 'package:mobile/features/dashboard/widgets/activity_tab_widgets.dart';
import 'package:mobile/shared/widgets/header_band.dart';

/// Beneficiary home tab — the "assistance hub". Same deep-green family as
/// the volunteer and donor homes, with its own layout built around
/// requests: greeting + request-status panel on the deep ground, then a
/// sideways strip of the open events flagged for beneficiaries
/// ([beneficiaryEventsProvider]), then a timeline of the beneficiary's
/// assistance requests and needs assessment.
class BeneficiaryHomeTab extends ConsumerStatefulWidget {
  const BeneficiaryHomeTab({
    super.key,
    required this.firstName,
    this.onViewRequests,
  });

  final String firstName;
  final VoidCallback? onViewRequests;

  @override
  ConsumerState<BeneficiaryHomeTab> createState() => _BeneficiaryHomeTabState();
}

class _BeneficiaryHomeTabState extends ConsumerState<BeneficiaryHomeTab> {
  final _store = AssistanceRequestStore.instance;
  final _assessment = NeedsAssessmentStore.instance;

  static const double _gutter = BeneficiaryHomeHero.gutter;

  /// Space below the hero so the ground's curved bottom edge clears the
  /// request-status panel.
  static const double _curveClearance = 16;

  static const _eventLimit = 6;

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
    _assessment.addListener(_onStoreChanged);
    _store.load();
    _assessment.load();
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    _assessment.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  void _openEvent(RecommendedEvent event) =>
      EventDetailsScreen.open(context, event.toCaresEvent(), readOnly: true);

  @override
  Widget build(BuildContext context) {
    final counts = ref.watch(beneficiaryRequestCountsProvider).valueOrNull;
    final assessment = _assessment.summary;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                const Positioned.fill(
                  child: DeepGround(child: HomeHeroParticles()),
                ),
                Padding(
                  // Room for the ground's curved edge so it never clips the
                  // request-status panel's corners.
                  padding: const EdgeInsets.only(bottom: _curveClearance),
                  child: BeneficiaryHomeHero(
                    firstName: widget.firstName,
                    counts: counts,
                  ),
                ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(_gutter, 22, _gutter, 0),
              child: ActivitySection(
                icon: Icons.event_outlined,
                title: 'Events for You',
                subtitle: 'Open events for beneficiaries — swipe to see more.',
                children: [],
              ),
            ),
            ..._eventStrip(),
            Padding(
              padding: const EdgeInsets.fromLTRB(_gutter, 26, _gutter, 0),
              child: ActivitySection(
                icon: Icons.timeline_rounded,
                title: 'Request Timeline',
                subtitle: 'Your assistance requests and assessment.',
                trailing: widget.onViewRequests == null
                    ? null
                    : TextButton(
                        onPressed: widget.onViewRequests,
                        child: const Text('See all'),
                      ),
                children: [
                  BeneficiaryRequestTimeline(
                    requests: _store.history,
                    assessment: assessment,
                    isLoading:
                        (!_store.hasLoaded && _store.isLoading) ||
                        (!_assessment.hasLoaded && _assessment.isLoading),
                    onOpenRequest: (request) =>
                        AssistanceRequestDetailsScreen.open(context, request),
                    onOpenAssessment: () => NeedsAssessmentScreen.open(
                      context,
                      mode: NeedsAssessmentMode.view,
                      summary: assessment,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _eventStrip() {
    return ref
        .watch(beneficiaryEventsProvider)
        .when(
          loading: () => const [BeneficiaryEventStripSkeleton(gutter: _gutter)],
          error: (_, _) => const [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: _gutter),
              child: ActivityEmptyState(
                icon: Icons.wifi_off_rounded,
                title: 'Events Unavailable',
                message: 'We could not load events. Pull down to try again.',
              ),
            ),
          ],
          data: (events) => events.isEmpty
              ? const [
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: _gutter),
                    child: ActivityEmptyState(
                      icon: Icons.event_busy_outlined,
                      title: 'No Events Right Now',
                      message:
                          'New events for beneficiaries will show up here.',
                    ),
                  ),
                ]
              : [
                  BeneficiaryEventStrip(
                    events: events.take(_eventLimit).toList(),
                    onOpen: _openEvent,
                    gutter: _gutter,
                  ),
                ],
        );
  }
}
