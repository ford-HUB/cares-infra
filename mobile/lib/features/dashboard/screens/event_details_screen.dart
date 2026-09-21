import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/certificate_data.dart';
import '../data/event_feedback_store.dart';
import '../data/event_location_tracker.dart';
import '../data/event_registration_service.dart';
import '../data/event_registration_store.dart';
import '../domain/cares_event.dart';
import '../presentation/providers/recommended_events_provider.dart';
import '../widgets/event_details_widgets.dart';
import '../widgets/event_reminder_sheet.dart';
import 'event_participants_screen.dart';
import '../widgets/completed_event_widgets.dart';
import '../widgets/event_image_carousel.dart';
import '../widgets/event_registration_dialogs.dart';
import '../widgets/event_sync_sheet.dart';
import '../widgets/location_permission_dialogs.dart';
import '../beneficiary/widgets/beneficiary_event_application_dialog.dart';
import 'certificate_review_screen.dart';
import 'event_feedback_screen.dart';
import 'event_route_map_screen.dart';

class EventDetailsScreen extends StatefulWidget {
  const EventDetailsScreen({
    super.key,
    required this.event,
    this.readOnly = false,
  });

  final CaresEvent event;

  /// Beneficiaries never register — registration is a volunteer endpoint.
  /// They apply instead: the join/cancel bar becomes "Apply as Beneficiary",
  /// which files a proof-of-residency application a director rules on.
  final bool readOnly;

  static void open(
    BuildContext context,
    CaresEvent event, {
    bool readOnly = false,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EventDetailsScreen(event: event, readOnly: readOnly),
      ),
    );
  }

  @override
  State<EventDetailsScreen> createState() => _EventDetailsScreenState();
}

class _EventDetailsScreenState extends State<EventDetailsScreen> {
  final _store = EventRegistrationStore.instance;
  final _feedbackStore = EventFeedbackStore.instance;
  final _certificateStore = CertificateStore.instance;
  final _tracker = EventLocationTracker.instance;
  final _registrationApi = EventRegistrationService();

  /// Starts as the event the card opened with; a join or cancellation
  /// replaces it with the server's fresh slot numbers.
  late CaresEvent _event = widget.event;
  bool _descriptionExpanded = false;
  bool _organizerExpanded = false;
  bool _registrationBusy = false;

  /// Redraws once a minute so the screen crosses from upcoming to ongoing to
  /// finished on its own while it stays open.
  Timer? _phaseTimer;

  @override
  void initState() {
    super.initState();
    _feedbackStore.addListener(_onFeedbackChanged);
    _certificateStore.addListener(_onFeedbackChanged);
    _tracker.addListener(_onFeedbackChanged);
    _store.addListener(_onStoreChanged);
    _phaseTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _onFeedbackChanged(),
    );
    if (_event.isCompleted) {
      // Prototype scenario: the volunteer already joined and attended.
      _store.seedCompletedEventParticipation(email: _participantEmail);
    }
  }

  @override
  void dispose() {
    _phaseTimer?.cancel();
    _store.removeListener(_onStoreChanged);
    _feedbackStore.removeListener(_onFeedbackChanged);
    _certificateStore.removeListener(_onFeedbackChanged);
    _tracker.removeListener(_onFeedbackChanged);
    super.dispose();
  }

  void _onFeedbackChanged() {
    if (mounted) setState(() {});
  }

  /// A feed refresh may have swapped in a newer copy of a joined event
  /// (status flipped, end time corrected) — follow it while the screen is up.
  void _onStoreChanged() {
    final refreshed = _store.participationFor(_event.id, _participantEmail);
    if (!mounted) return;
    setState(() {
      if (refreshed != null) _event = refreshed.event;
    });
  }

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  bool get _feedbackSubmitted =>
      _feedbackStore.hasSubmitted(_event.id, _participantEmail);

  /// The sheet the scheduler generated for this event, once it has.
  CaresCertificate? get _certificate =>
      _certificateStore.forEvent(_event.serverId);

  Future<void> _giveFeedback() async {
    final submitted = await EventFeedbackScreen.open(context, _event);
    if (!mounted || !submitted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Thank you for your feedback! Your certificate is being generated.',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
    // The sweep may already have run for an earlier feedback; ask once.
    _certificateStore.refresh();
  }

  Future<void> _viewCertificate() async {
    final certificate = _certificate;
    if (certificate != null) {
      CertificateReviewScreen.open(context, certificate);
      return;
    }
    // Not issued yet: pull the wallet in case the sweep just ran, then say so.
    final fetched = await _certificateStore.refresh();
    if (!mounted) return;
    final refreshed = _certificate;
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
  }

  EventParticipation? get _participation =>
      _store.participationFor(_event.id, _participantEmail);

  bool get _isRegistered => _store.isRegistered(_event.id, _participantEmail);

  Future<void> _confirmJoin() async {
    final confirmed = await showEventJoinConfirmationDialog(context, _event);

    if (!confirmed || !mounted) return;

    if (!await _ensureLocationPermission()) return;
    if (!mounted) return;

    // Server events take the slot on the server first; the fixture keeps the
    // in-memory flow. Either way the local store drives the geofence tracker.
    final synced = await _syncRegistration(join: true);
    if (!synced || !mounted) return;

    _store.register(_event, email: _participantEmail);
    _tracker.refresh();
    setState(() {});

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("You're registered for this event.")),
    );
  }

  /// Registers or cancels on the server and redraws with the counts it sends
  /// back, then refreshes the recommended lists so every card agrees. Returns
  /// false when the server refused (full, closed, offline) — the message is
  /// shown and nothing changes locally.
  Future<bool> _syncRegistration({required bool join}) async {
    final serverId = _event.serverId;
    if (serverId == null || _registrationBusy) return serverId == null;

    setState(() => _registrationBusy = true);
    try {
      final result = join
          ? await _registrationApi.register(serverId)
          : await _registrationApi.cancel(serverId);
      if (!mounted) return false;
      _event = _event.withParticipants(
        registeredCount: result.participants,
        totalCapacity: result.maxParticipants,
      );
      final container = ProviderScope.containerOf(context, listen: false);
      container.invalidate(recommendedEventsProvider);
      container.invalidate(registeredEventsProvider);
      return true;
    } on ApiException catch (error) {
      if (!mounted) return false;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    } catch (_) {
      if (!mounted) return false;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            join
                ? 'Could not register right now. Please try again.'
                : 'Could not cancel right now. Please try again.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return false;
    } finally {
      if (mounted) setState(() => _registrationBusy = false);
    }
  }

  Future<void> _confirmCancel() async {
    final confirmed = await showEventCancelConfirmationDialog(context, _event);
    if (!confirmed || !mounted) return;

    final synced = await _syncRegistration(join: false);
    if (!synced || !mounted) return;

    _store.cancelParticipation(_event.id, _participantEmail);
    _tracker.refresh();
    setState(() {});

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Your registration has been cancelled.')),
    );
  }

  /// Location must be on before joining, since check-in depends on it. When
  /// the permission is already granted this is silent; otherwise the user is
  /// walked through the explanation → device prompt → denied loop.
  Future<bool> _ensureLocationPermission() async {
    var result = await requestEventLocationPermission();
    if (result.isGranted) return true;

    var explained = false;
    while (true) {
      if (!mounted) return false;
      if (!explained && result.outcome == LocationPermissionOutcome.denied) {
        explained = true;
        final allow = await showLocationPermissionRequestDialog(
          context,
          _event,
        );
        if (!allow) return false;
      } else {
        final action = await showLocationPermissionDeniedDialog(
          context,
          result,
        );
        switch (action) {
          case LocationDeniedAction.cancel:
            return false;
          case LocationDeniedAction.openSettings:
            if (result.outcome == LocationPermissionOutcome.serviceDisabled) {
              await Geolocator.openLocationSettings();
            } else {
              await Geolocator.openAppSettings();
            }
            continue;
          case LocationDeniedAction.tryAgain:
            break;
        }
      }
      result = await requestEventLocationPermission();
      if (result.isGranted) return true;
    }
  }

  Future<void> _showSync() async {
    final participation = _participation;
    if (participation == null) return;
    await showEventSyncSheet(
      context,
      event: _event,
      participation: participation,
    );
  }

  void _openRouteMap() => EventRouteMapScreen.open(context, _event);

  void _openParticipants() => EventParticipantsScreen.open(context, _event);

  void _openReminder() => showEventReminderSheet(context, _event);

  @override
  Widget build(BuildContext context) {
    final event = _event;
    final participation = _participation;
    final isRegistered = _isRegistered;
    // Ended on the server or by the clock — either way the join/cancel
    // controls are gone and the completed section takes over.
    final isCompleted = event.hasEnded();
    final isOngoing = event.isOngoing();
    final feedbackSubmitted = _feedbackSubmitted;
    final certificateIssued = _certificate != null;

    // The hero photo runs under the status bar, so its icons go light.
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Stack(
          children: [
            Positioned.fill(
              child: SingleChildScrollView(
                padding: EdgeInsets.zero,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildHero(event),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  event.title,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w800,
                                    color: kEventInk,
                                    height: 1.2,
                                    letterSpacing: -0.4,
                                  ),
                                ),
                              ),
                              if (isCompleted) ...[
                                const SizedBox(width: 10),
                                const EventStatusPill(
                                  label: 'COMPLETED',
                                  color: AppColors.primary,
                                ),
                              ] else if (isRegistered && isOngoing) ...[
                                const SizedBox(width: 10),
                                const EventStatusPill(
                                  label: 'ONGOING',
                                  color: AppColors.accentOrange,
                                ),
                              ] else if (isRegistered) ...[
                                const SizedBox(width: 10),
                                const EventStatusPill(label: 'REGISTERED'),
                              ],
                            ],
                          ),
                          const SizedBox(height: 14),
                          EventInfoCard(event: event),
                          const SizedBox(height: 14),
                          EventMembersRow(
                            count: event.registeredCount,
                            capacity: event.totalCapacity,
                          ),
                          const SizedBox(height: 16),
                          EventOrganizerRow(
                            name: event.organization,
                            description: event.organizerDescription,
                            expanded: _organizerExpanded,
                            onToggle: () => setState(
                              () => _organizerExpanded = !_organizerExpanded,
                            ),
                          ),
                          const SizedBox(height: 22),
                          const EventSectionTitle('About this event'),
                          const SizedBox(height: 10),
                          _ExpandableText(
                            event.description,
                            expanded: _descriptionExpanded,
                            onToggle: () => setState(
                              () =>
                                  _descriptionExpanded = !_descriptionExpanded,
                            ),
                          ),
                          if (event.requirements.isNotEmpty) ...[
                            const SizedBox(height: 24),
                            const EventSectionTitle('What to bring'),
                            const SizedBox(height: 10),
                            _RequirementsCard(requirements: event.requirements),
                          ],
                          if (isCompleted) ...[
                            const SizedBox(height: 24),
                            const EventSectionTitle('Completed event'),
                            const SizedBox(height: 12),
                            CompletedEventStatusCard(
                              event: event,
                              participated:
                                  participation?.attendanceVerified ?? true,
                              feedbackSubmitted: feedbackSubmitted,
                              certificateIssued: certificateIssued,
                            ),
                            const SizedBox(height: 16),
                            CertificateStatusBanner(
                              unlocked: feedbackSubmitted,
                              issued: certificateIssued,
                            ),
                          ] else ...[
                            if (participation?.attendanceVerified == true) ...[
                              const SizedBox(height: 24),
                              const _VerifiedBanner(),
                            ],
                          ],
                        ],
                      ),
                    ),
                    // Room for the floating action bar so the last card is
                    // never hidden behind it.
                    const SizedBox(height: 96),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  child: _buildBottomBar(
                    event: event,
                    participation: participation,
                    isRegistered: isRegistered,
                    isCompleted: isCompleted,
                    isOngoing: isOngoing,
                    feedbackSubmitted: feedbackSubmitted,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Full-bleed photo with the back button over it, the category
  /// tag at its foot, and the quick-action card straddling its bottom edge.
  Widget _buildHero(CaresEvent event) {
    final topInset = MediaQuery.paddingOf(context).top;
    const photoHeight = 320.0;
    const cardOverlap = 44.0;

    return SizedBox(
      height: photoHeight + cardOverlap,
      child: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: photoHeight,
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(_sheetLip),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  EventImageCarousel(
                    imageUrls: event.imageUrls,
                    placeholder: const _HeroPlaceholder(),
                  ),
                  // Overlays ignore touches so a swipe anywhere still moves
                  // the deck; the scrim keeps the buttons legible over any
                  // photo.
                  IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.35),
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.5),
                          ],
                          stops: const [0, 0.4, 1],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 20,
                    bottom: cardOverlap + 26,
                    child: IgnorePointer(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          event.isFeatured
                              ? '${event.category} · Featured'
                              : event.category,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            top: topInset + 8,
            left: 16,
            child: EventHeroButton(
              icon: Icons.arrow_back_ios_new_rounded,
              tooltip: 'Back',
              onTap: () => Navigator.of(context).pop(),
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 0,
            child: EventActionCard(
              eventId: event.id,
              onParticipants: _openParticipants,
              onDirections: _openRouteMap,
              onReminder: _openReminder,
            ),
          ),
        ],
      ),
    );
  }

  /// The beneficiary's action, by where their application stands: apply,
  /// wait for the director, or see that it was approved.
  Widget _buildBeneficiaryBar(CaresEvent event, bool isCompleted) {
    if (isCompleted) {
      return FilledButton.icon(
        onPressed: null,
        icon: const Icon(Icons.event_busy_rounded),
        label: const Text('Event has ended'),
        style: _pillStyle,
      );
    }
    if (event.isApplicationAccepted) {
      return FilledButton.icon(
        onPressed: null,
        icon: const Icon(Icons.verified_rounded),
        label: const Text('Application approved'),
        style: _pillStyle,
      );
    }
    if (event.isApplicationPending) {
      return FilledButton.icon(
        onPressed: null,
        icon: const Icon(Icons.hourglass_top_rounded),
        label: const Text('Pending approval'),
        style: _pillStyle,
      );
    }
    return FilledButton.icon(
      onPressed: _applyAsBeneficiary,
      icon: const Icon(Icons.volunteer_activism_outlined),
      label: const Text('Apply as Beneficiary'),
      style: _pillStyle,
    );
  }

  Future<void> _applyAsBeneficiary() async {
    final applied = await showBeneficiaryEventApplicationDialog(
      context,
      _event,
    );
    if (!mounted || !applied) return;
    setState(() => _event = _event.withApplicationStatus('PENDING'));
    // The lists behind this screen carry the same status flag.
    final container = ProviderScope.containerOf(context, listen: false);
    container.invalidate(beneficiaryEventsProvider);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Application submitted — pending the director\'s approval.',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _buildBottomBar({
    required CaresEvent event,
    required EventParticipation? participation,
    required bool isRegistered,
    required bool isCompleted,
    required bool isOngoing,
    required bool feedbackSubmitted,
  }) {
    if (widget.readOnly) return _buildBeneficiaryBar(event, isCompleted);
    // A finished event has no Cancel or Sync — only the feedback /
    // certificate follow-up for those who joined.
    if (isCompleted) {
      if (!isRegistered) {
        return FilledButton.icon(
          onPressed: null,
          icon: const Icon(Icons.event_busy_rounded),
          label: const Text('Event has ended'),
          style: _pillStyle,
        );
      }
      // Ruled absent by the geofence validator: the server refuses feedback,
      // so say so here rather than offer a button that will fail.
      if (event.isMarkedAbsent && !feedbackSubmitted) {
        return FilledButton.icon(
          onPressed: null,
          icon: const Icon(Icons.person_off_rounded),
          label: const Text('Marked absent — feedback closed'),
          style: _pillStyle,
        );
      }
      // The validator has not ruled yet: feedback is pending, not open.
      if (event.isAttendancePending && !feedbackSubmitted) {
        return FilledButton.icon(
          onPressed: null,
          icon: const Icon(Icons.hourglass_top_rounded),
          label: const Text('Feedback pending — validating attendance'),
          style: _pillStyle,
        );
      }
      return feedbackSubmitted
          ? FilledButton.icon(
              onPressed: _viewCertificate,
              icon: Icon(
                _certificate != null
                    ? Icons.workspace_premium_rounded
                    : Icons.hourglass_top_rounded,
              ),
              label: Text(
                _certificate != null
                    ? 'View Certificate'
                    : 'Certificate generating',
              ),
              style: _pillStyle,
            )
          : FilledButton.icon(
              onPressed: _giveFeedback,
              icon: const Icon(Icons.rate_review_rounded),
              label: const Text('Give Feedback'),
              style: _pillStyle,
            );
    }
    if (isRegistered) {
      // Once the event has started the slot is locked in: Cancel stays
      // visible but disabled, and Sync keeps working for attendance.
      final canCancel = !_registrationBusy && !isOngoing;
      return Row(
        children: [
          OutlinedButton.icon(
            onPressed: canCancel ? _confirmCancel : null,
            icon: const Icon(Icons.close_rounded, size: 18),
            label: const Text('Cancel'),
            style: _pillCancelStyle,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton.icon(
              onPressed: participation == null ? null : _showSync,
              icon: Icon(
                _tracker.stateFor(event) == EventTrackingState.recording
                    ? Icons.radio_button_checked_rounded
                    : Icons.sync_rounded,
              ),
              label: const Text('Sync'),
              style: _pillStyle,
            ),
          ),
        ],
      );
    }
    return EventRegisterBar(
      slotsLeft: event.slotsLeft,
      capacity: event.totalCapacity,
      onRegister: event.slotsLeft > 0 && !_registrationBusy
          ? _confirmJoin
          : null,
    );
  }
}

class _RequirementsCard extends StatelessWidget {
  const _RequirementsCard({required this.requirements});

  final List<String> requirements;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final req in requirements)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 3),
                    child: Icon(
                      Icons.check_circle_rounded,
                      size: 15,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      req,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.45,
                        color: kEventMuted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _VerifiedBanner extends StatelessWidget {
  const _VerifiedBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: const Row(
        children: [
          Icon(Icons.verified_rounded, color: AppColors.primary, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Attendance verified at this event.',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Height of the rounded lip the content sheet draws over the hero photo.
const double _sheetLip = 28;

// The CTAs float over the scrolling content instead of sitting in a footer,
// so they carry their own shadow to lift off the page.
final ButtonStyle _pillStyle = FilledButton.styleFrom(
  backgroundColor: kEventInk,
  foregroundColor: Colors.white,
  minimumSize: const Size.fromHeight(56),
  shape: const StadiumBorder(),
  elevation: 6,
  shadowColor: Colors.black.withValues(alpha: 0.35),
  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
);

/// Compact secondary pill for cancelling a registration — sits beside the
/// full-width Sync button, so it hugs its content instead of stretching.
final ButtonStyle _pillCancelStyle = OutlinedButton.styleFrom(
  foregroundColor: AppColors.error,
  backgroundColor: Colors.white,
  side: BorderSide(color: AppColors.error.withValues(alpha: 0.6), width: 1.5),
  minimumSize: const Size(0, 56),
  padding: const EdgeInsets.symmetric(horizontal: 18),
  shape: const StadiumBorder(),
  elevation: 4,
  shadowColor: AppColors.primaryDark.withValues(alpha: 0.3),
  textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
);

/// Body copy clamped to a few lines with an inline "read more..." link that
/// expands it in place, and "show less" once open.
class _ExpandableText extends StatefulWidget {
  const _ExpandableText(
    this.text, {
    required this.expanded,
    required this.onToggle,
    this.collapsedLines = 4,
  });

  final String text;
  final bool expanded;
  final VoidCallback onToggle;
  final int collapsedLines;

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  late final TapGestureRecognizer _tap = TapGestureRecognizer()
    ..onTap = () => widget.onToggle();

  @override
  void dispose() {
    _tap.dispose();
    super.dispose();
  }

  static const _bodyStyle = TextStyle(
    fontSize: 14.5,
    height: 1.6,
    color: kEventMuted,
  );
  static const _linkStyle = TextStyle(
    fontSize: 14.5,
    height: 1.6,
    fontWeight: FontWeight.w700,
    color: AppColors.accentOrange,
  );

  @override
  Widget build(BuildContext context) {
    final text = widget.text;
    final collapsedLines = widget.collapsedLines;
    return LayoutBuilder(
      builder: (context, constraints) {
        final textScaler = MediaQuery.textScalerOf(context);
        final direction = Directionality.of(context);
        final full = TextPainter(
          text: TextSpan(text: text, style: _bodyStyle),
          textDirection: direction,
          textScaler: textScaler,
          maxLines: collapsedLines,
        )..layout(maxWidth: constraints.maxWidth);

        if (!full.didExceedMaxLines) {
          return Text(text, style: _bodyStyle);
        }

        if (widget.expanded) {
          return Text.rich(
            TextSpan(
              text: text,
              style: _bodyStyle,
              children: [
                TextSpan(
                  text: '  show less',
                  style: _linkStyle,
                  recognizer: _tap,
                ),
              ],
            ),
          );
        }

        // Measure the link so the visible copy stops early enough on the
        // last line to leave room for it.
        const link = ' read more...';
        final linkPainter = TextPainter(
          text: const TextSpan(text: link, style: _linkStyle),
          textDirection: direction,
          textScaler: textScaler,
        )..layout();
        final lastLineEnd = full.getPositionForOffset(
          Offset(constraints.maxWidth - linkPainter.width, full.height - 1),
        );
        final cut = lastLineEnd.offset.clamp(0, text.length);
        final visible = text.substring(0, cut).trimRight();

        return Text.rich(
          TextSpan(
            text: visible,
            style: _bodyStyle,
            children: [
              TextSpan(text: link, style: _linkStyle, recognizer: _tap),
            ],
          ),
          maxLines: collapsedLines,
          overflow: TextOverflow.ellipsis,
        );
      },
    );
  }
}

/// The gradient hero drawn when the event has no photos.
class _HeroPlaceholder extends StatelessWidget {
  const _HeroPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.primary, AppColors.primaryLight],
            ),
          ),
        ),
        Positioned(
          right: -30,
          bottom: -30,
          child: Icon(
            Icons.event_available_rounded,
            size: 180,
            color: Colors.white.withValues(alpha: 0.12),
          ),
        ),
      ],
    );
  }
}
