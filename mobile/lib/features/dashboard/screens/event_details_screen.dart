import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/certificate_data.dart';
import '../data/event_feedback_store.dart';
import '../data/event_registration_store.dart';
import '../domain/cares_event.dart';
import '../utils/geo_utils.dart';
import '../widgets/completed_event_widgets.dart';
import '../widgets/event_image_carousel.dart';
import '../widgets/event_registration_dialogs.dart';
import '../widgets/event_status_sheet.dart';
import '../widgets/location_permission_dialogs.dart';
import 'certificate_review_screen.dart';
import 'event_feedback_screen.dart';
import 'event_route_map_screen.dart';

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
  bool _isCheckingLocation = false;

  @override
  void initState() {
    super.initState();
    _feedbackStore.addListener(_onFeedbackChanged);
    if (widget.event.isCompleted) {
      // Prototype scenario: the volunteer already joined and attended.
      _store.seedCompletedEventParticipation(email: _participantEmail);
    }
  }

  @override
  void dispose() {
    _feedbackStore.removeListener(_onFeedbackChanged);
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

  Future<void> _confirmJoin() async {
    final confirmed = await showEventJoinConfirmationDialog(
      context,
      widget.event,
    );

    if (!confirmed || !mounted) return;

    if (!await _ensureLocationPermission()) return;
    if (!mounted) return;

    _store.register(widget.event, email: _participantEmail);
    setState(() {});

    if (!mounted) return;
    await showEventRegistrationSuccessDialog(context);
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
          widget.event,
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

  Future<void> _showStatus() async {
    final participation = _participation;
    if (participation == null) return;

    final checkIn = await showEventStatusSheet(
      context,
      event: widget.event,
      participation: participation,
    );
    if (checkIn && mounted) await _verifyGeolocation();
  }

  void _openRouteMap() => EventRouteMapScreen.open(context, widget.event);

  Future<void> _verifyGeolocation() async {
    final participation = _participation;
    if (participation == null) return;

    setState(() => _isCheckingLocation = true);

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showGeoResult(
          success: false,
          message:
              'Location services are disabled. Please enable them and try again.',
        );
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied) {
        _showGeoResult(
          success: false,
          message:
              'Location permission is required to verify event attendance.',
        );
        return;
      }

      if (permission == LocationPermission.deniedForever) {
        _showGeoResult(
          success: false,
          message:
              'Location permission is permanently denied. Enable it in device settings.',
        );
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final distance = GeoUtils.distanceInMeters(
        fromLatitude: position.latitude,
        fromLongitude: position.longitude,
        toLatitude: widget.event.venueLatitude,
        toLongitude: widget.event.venueLongitude,
      );

      if (distance <= widget.event.attendanceRadiusMeters) {
        _store.markAttendanceVerified(
          widget.event.id,
          participation.participantEmail,
        );
        setState(() {});
        _showGeoResult(
          success: true,
          message:
              'Attendance recorded. You are within the event venue area '
              '(${distance.round()}m from location).',
        );
      } else {
        _showGeoResult(
          success: false,
          message:
              'You are ${distance.round()}m from the venue. '
              'You must be within ${widget.event.attendanceRadiusMeters.round()}m to check in.',
        );
      }
    } catch (error) {
      _showGeoResult(
        success: false,
        message: 'Unable to get your location. Please try again.',
      );
    } finally {
      if (mounted) setState(() => _isCheckingLocation = false);
    }
  }

  void _showGeoResult({required bool success, required String message}) {
    if (!mounted) return;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(
              success ? Icons.location_on_rounded : Icons.location_off_rounded,
              color: success ? AppColors.primary : AppColors.error,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(success ? 'Attendance Verified' : 'Check-in Failed'),
            ),
          ],
        ),
        content: Text(message),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
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
                        EventImageCarousel(
                          imageUrls: event.imageUrls,
                          placeholder: const _HeroPlaceholder(),
                        ),
                        // Photos vary; the scrim keeps the back arrow and
                        // category legible over any of them. Overlays ignore
                        // touches so a swipe anywhere still moves the deck.
                        if (event.imageUrls.isNotEmpty)
                          IgnorePointer(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.black.withValues(alpha: 0.35),
                                    Colors.transparent,
                                    Colors.black.withValues(alpha: 0.55),
                                  ],
                                  stops: const [0, 0.4, 1],
                                ),
                              ),
                            ),
                          ),
                        IgnorePointer(
                          child: Padding(
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
                                      color: Colors.white.withValues(
                                        alpha: 0.22,
                                      ),
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
                                Text(
                                  isCompleted
                                      ? '${event.category} · Completed'
                                      : event.category,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
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
                      ? Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _openRouteMap,
                                icon: const Icon(Icons.route_rounded),
                                label: const Text('Route Map'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  side: const BorderSide(
                                    color: AppColors.primary,
                                    width: 1.5,
                                  ),
                                  minimumSize: const Size.fromHeight(52),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton.icon(
                                onPressed:
                                    _isCheckingLocation || participation == null
                                    ? null
                                    : _showStatus,
                                icon: _isCheckingLocation
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Icon(
                                        participation?.attendanceVerified ==
                                                true
                                            ? Icons.verified_rounded
                                            : Icons.how_to_reg_rounded,
                                      ),
                                label: Text(
                                  _isCheckingLocation ? 'Checking...' : 'Status',
                                ),
                                style: FilledButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                ),
                              ),
                            ),
                          ],
                        )
                      : FilledButton(
                          onPressed: event.slotsLeft > 0 ? _confirmJoin : null,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                          ),
                          child: const Text('Join Event'),
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
