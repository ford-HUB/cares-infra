import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../beneficiary/data/beneficiary_personal_profile_store.dart';
import '../beneficiary/domain/beneficiary_personal_profile.dart';
import '../beneficiary/widgets/beneficiary_verification_gate.dart';
import '../data/certificate_data.dart';
import '../data/event_category_colors.dart';
import '../data/event_feedback_store.dart';
import '../data/event_registration_store.dart';
import '../data/mock_events.dart';
import '../widgets/completed_event_widgets.dart';
import '../widgets/event_registration_dialogs.dart';
import '../widgets/location_check_dialogs.dart';
import '../widgets/location_permission_dialogs.dart';
import 'certificate_review_screen.dart';
import 'event_feedback_screen.dart';

class EventDetailsScreen extends StatefulWidget {
  const EventDetailsScreen({super.key, required this.event});

  final CaresEvent event;

  static void open(BuildContext context, CaresEvent event) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => EventDetailsScreen(event: event)),
    );
  }

  @override
  State<EventDetailsScreen> createState() => _EventDetailsScreenState();
}

class _EventDetailsScreenState extends State<EventDetailsScreen> {
  final _store = EventRegistrationStore.instance;
  final _feedbackStore = EventFeedbackStore.instance;
  final _verificationStore = BeneficiaryPersonalProfileStore.instance;
  bool _isCheckingLocation = false;
  bool _isRequestingPermission = false;

  @override
  void initState() {
    super.initState();
    _feedbackStore.addListener(_onFeedbackChanged);
    _verificationStore.addListener(_onFeedbackChanged);
    if (widget.event.isCompleted) {
      // Prototype scenario: the volunteer already joined and attended.
      _store.seedCompletedEventParticipation(email: _participantEmail);
    }
  }

  @override
  void dispose() {
    _feedbackStore.removeListener(_onFeedbackChanged);
    _verificationStore.removeListener(_onFeedbackChanged);
    super.dispose();
  }

  void _onFeedbackChanged() {
    if (mounted) setState(() {});
  }

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  bool get _feedbackSubmitted =>
      _feedbackStore.hasSubmitted(widget.event.id, _participantEmail);

  Future<void> _giveFeedback() async {
    final submitted = await EventFeedbackScreen.open(context, widget.event);
    if (!mounted || !submitted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Thank you for your feedback!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _viewCertificate() {
    CertificateReviewScreen.open(context, certificateForEvent(widget.event));
  }

  EventParticipation? get _participation =>
      _store.participationFor(widget.event.id, _participantEmail);

  bool get _isRegistered =>
      _store.isRegistered(widget.event.id, _participantEmail);

  /// Beneficiaries must have a verified identity/residency document on file
  /// before they can join an event.
  bool get _isBeneficiary => isBeneficiarySession;

  BeneficiaryVerificationState get _verificationState =>
      _verificationStore.verificationState;

  VerificationDocument? get _verificationDocument =>
      switch (_verificationState) {
        BeneficiaryVerificationState.rejected =>
          _verificationStore.profile.rejectedDocument,
        BeneficiaryVerificationState.underReview =>
          _verificationStore.profile.documentUnderReview,
        _ => null,
      };

  bool get _blockedByVerification =>
      _isBeneficiary && !_verificationStore.canJoinEvents;

  Future<void> _openVerificationGate() async {
    final uploaded = await showBeneficiaryVerificationRequiredDialog(context);
    if (!mounted) return;
    setState(() {});
    if (uploaded) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Document submitted. You can join events once it is verified.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  /// Location access is required before anyone — volunteer or beneficiary —
  /// can be registered for an event. Returns true only once the device grants
  /// permission.
  Future<bool> _ensureLocationPermission() async {
    final proceed = await showLocationPermissionRequestDialog(
      context,
      widget.event,
    );
    if (!proceed || !mounted) return false;

    while (true) {
      setState(() => _isRequestingPermission = true);
      final result = await requestEventLocationPermission();
      if (!mounted) return false;
      setState(() => _isRequestingPermission = false);

      if (result.isGranted) return true;

      final action = await showLocationPermissionDeniedDialog(context, result);
      if (!mounted) return false;

      switch (action) {
        case LocationDeniedAction.tryAgain:
          continue;
        case LocationDeniedAction.openSettings:
          if (result.outcome == LocationPermissionOutcome.serviceDisabled) {
            await Geolocator.openLocationSettings();
          } else {
            await Geolocator.openAppSettings();
          }
          if (!mounted) return false;
          continue;
        case LocationDeniedAction.cancel:
          return false;
      }
    }
  }

  Future<void> _confirmJoin() async {
    if (_blockedByVerification) {
      await _openVerificationGate();
      return;
    }

    // Ask for location access before anything is registered.
    final locationAllowed = await _ensureLocationPermission();
    if (!locationAllowed || !mounted) return;

    final confirmed = await showEventJoinConfirmationDialog(
      context,
      widget.event,
    );

    if (!confirmed || !mounted) return;

    _store.register(widget.event, email: _participantEmail);
    setState(() {});

    if (!mounted) return;
    await showEventRegistrationSuccessDialog(context);
  }

  /// Static location check — reads mock distance data instead of the device
  /// GPS, then lets the participant record attendance when inside the radius.
  Future<void> _checkLocation() async {
    final participation = _participation;
    if (participation == null || _isCheckingLocation) return;

    setState(() => _isCheckingLocation = true);
    final verifyAttendance = await runStaticLocationCheck(
      context,
      widget.event,
    );
    if (!mounted) return;
    setState(() => _isCheckingLocation = false);

    if (!verifyAttendance) return;

    _store.markAttendanceVerified(
      widget.event.id,
      participation.participantEmail,
    );
    setState(() {});

    if (!mounted) return;
    await showAttendanceVerifiedDialog(context);
  }

  /// Cancels participation locally and returns the event to its join state.
  Future<void> _cancelParticipation() async {
    final confirmed = await showCancelParticipationDialog(
      context,
      widget.event,
    );
    if (!confirmed || !mounted) return;

    _store.cancelParticipation(widget.event.id, _participantEmail);
    setState(() {});

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Your participation has been cancelled.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _infoTile({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.inputFill,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w800,
        color: AppColors.textPrimary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    final participation = _participation;
    final isRegistered = _isRegistered;
    final isCompleted = event.isCompleted;
    final feedbackSubmitted = _feedbackSubmitted;
    final filledPercent = (event.capacityFilled * 100).round();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 220,
                  pinned: true,
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  flexibleSpace: FlexibleSpaceBar(
                    background: Stack(
                      fit: StackFit.expand,
                      children: [
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                AppColors.primary,
                                AppColors.primaryLight,
                              ],
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
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 72, 20, 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (event.isFeatured)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.22),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'Featured Event',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: eventCategoryColor(
                                        event.category,
                                      ),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      event.category,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  if (isCompleted) ...[
                                    const SizedBox(width: 8),
                                    Text(
                                      'Completed',
                                      style: TextStyle(
                                        color: Colors.white.withValues(
                                          alpha: 0.9,
                                        ),
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          event.title,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                            height: 1.2,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: isCompleted
                              ? [
                                  _StatusChip(
                                    label: 'Completed',
                                    color: AppColors.primary,
                                    background: AppColors.primary.withValues(
                                      alpha: 0.12,
                                    ),
                                  ),
                                  _StatusChip(
                                    label: 'Participated',
                                    color: AppColors.primary,
                                    background: AppColors.accent.withValues(
                                      alpha: 0.15,
                                    ),
                                  ),
                                  _StatusChip(
                                    label: feedbackSubmitted
                                        ? 'Feedback submitted'
                                        : 'Feedback required',
                                    color: feedbackSubmitted
                                        ? AppColors.primary
                                        : AppColors.accentOrange,
                                    background:
                                        (feedbackSubmitted
                                                ? AppColors.primary
                                                : AppColors.accentOrange)
                                            .withValues(alpha: 0.12),
                                  ),
                                ]
                              : [
                                  _CountdownChip(daysUntil: event.daysUntil),
                                  _StatusChip(
                                    label: '${event.slotsLeft} slots left',
                                    color: AppColors.primary,
                                    background: AppColors.primary.withValues(
                                      alpha: 0.12,
                                    ),
                                  ),
                                  if (isRegistered)
                                    _StatusChip(
                                      label: 'Registered',
                                      color: AppColors.primary,
                                      background: AppColors.accent.withValues(
                                        alpha: 0.15,
                                      ),
                                    ),
                                ],
                        ),
                        const SizedBox(height: 24),
                        _sectionTitle('About this event'),
                        const SizedBox(height: 10),
                        Text(
                          event.description,
                          style: const TextStyle(
                            fontSize: 15,
                            height: 1.55,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.inputFill),
                          ),
                          child: Column(
                            children: [
                              _infoTile(
                                icon: Icons.calendar_today_rounded,
                                label: 'Date & Time',
                                value: event.dateTimeLabel,
                              ),
                              _infoTile(
                                icon: Icons.location_on_outlined,
                                label: 'Venue',
                                value: event.location,
                              ),
                              _infoTile(
                                icon: Icons.groups_rounded,
                                label: 'Organizer',
                                value: event.organization,
                              ),
                            ],
                          ),
                        ),
                        if (event.requirements.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          _sectionTitle('Event requirements'),
                          const SizedBox(height: 10),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.inputFill),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: event.requirements.map((req) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        '• ',
                                        style: TextStyle(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      Expanded(
                                        child: Text(
                                          req,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            height: 1.45,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ],
                        if (isCompleted) ...[
                          const SizedBox(height: 24),
                          _sectionTitle('Completed event'),
                          const SizedBox(height: 12),
                          CompletedEventStatusCard(
                            event: event,
                            participated:
                                participation?.attendanceVerified ?? true,
                            feedbackSubmitted: feedbackSubmitted,
                          ),
                          const SizedBox(height: 16),
                          CertificateStatusBanner(unlocked: feedbackSubmitted),
                        ] else ...[
                          const SizedBox(height: 24),
                          _sectionTitle('Available slots'),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.inputFill),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '$filledPercent% filled',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      '${event.registeredCount}/${event.totalCapacity} registered',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value: event.capacityFilled,
                                    minHeight: 8,
                                    backgroundColor: AppColors.inputFill,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${event.slotsLeft} spots still available',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (participation?.attendanceVerified == true) ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(
                                  alpha: 0.08,
                                ),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppColors.primary.withValues(
                                    alpha: 0.2,
                                  ),
                                ),
                              ),
                              child: const Row(
                                children: [
                                  Icon(
                                    Icons.verified_rounded,
                                    color: AppColors.primary,
                                    size: 20,
                                  ),
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
                            ),
                          ],
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!isCompleted && !isRegistered && _blockedByVerification)
                    BeneficiaryVerificationBanner(
                      state: _verificationState,
                      document: _verificationDocument,
                      onAction: _openVerificationGate,
                    ),
                  isCompleted
                      ? (feedbackSubmitted
                            ? FilledButton.icon(
                                onPressed: _viewCertificate,
                                icon: const Icon(
                                  Icons.workspace_premium_rounded,
                                ),
                                label: const Text('View Certificate'),
                                style: FilledButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                ),
                              )
                            : FilledButton.icon(
                                onPressed: _giveFeedback,
                                icon: const Icon(Icons.rate_review_rounded),
                                label: const Text('Give Feedback'),
                                style: FilledButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                ),
                              ))
                      : isRegistered
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            FilledButton.icon(
                              onPressed:
                                  _isCheckingLocation || participation == null
                                  ? null
                                  : _checkLocation,
                              icon: _isCheckingLocation
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.my_location_rounded),
                              label: Text(
                                _isCheckingLocation
                                    ? 'Verifying your location...'
                                    : 'Verify Location',
                              ),
                              style: FilledButton.styleFrom(
                                minimumSize: const Size.fromHeight(52),
                              ),
                            ),
                            const SizedBox(height: 10),
                            OutlinedButton.icon(
                              onPressed: _isCheckingLocation
                                  ? null
                                  : _cancelParticipation,

                              label: const Text('Cancel Participation'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.error,
                                side: BorderSide(
                                  color: AppColors.error.withValues(alpha: 0.5),
                                ),
                                minimumSize: const Size.fromHeight(48),
                              ),
                            ),
                          ],
                        )
                      : FilledButton.icon(
                          onPressed:
                              event.slotsLeft > 0 && !_isRequestingPermission
                              ? _confirmJoin
                              : null,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                          ),
                          icon: _isRequestingPermission
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const SizedBox.shrink(),
                          label: Text(
                            _isRequestingPermission
                                ? 'Checking location access...'
                                : _blockedByVerification
                                ? 'Verify Document to Join'
                                : 'Join Event',
                          ),
                        ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CountdownChip extends StatelessWidget {
  const _CountdownChip({required this.daysUntil});

  final int daysUntil;

  @override
  Widget build(BuildContext context) {
    final urgent = daysUntil <= 3;
    return _StatusChip(
      label: daysUntil == 0 ? 'Today' : 'In ${daysUntil}d',
      color: urgent ? AppColors.error : AppColors.primary,
      background: urgent
          ? AppColors.error.withValues(alpha: 0.12)
          : AppColors.inputFill,
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.label,
    required this.color,
    required this.background,
  });

  final String label;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
      ),
    );
  }
}
