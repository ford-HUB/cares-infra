import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/event_registration_store.dart';
import '../data/mock_events.dart';
import '../utils/geo_utils.dart';
import '../widgets/event_qr_code_sheet.dart';
import '../widgets/event_registration_dialogs.dart';

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
  bool _isCheckingLocation = false;

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

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

    _store.register(widget.event, email: _participantEmail);
    setState(() {});

    if (!mounted) return;
    await showEventRegistrationSuccessDialog(context);
  }

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
                              Text(
                                event.category,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
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
                          children: [
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
                              color: AppColors.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.2),
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
              child: isRegistered
                  ? Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: participation == null
                                ? null
                                : () => showEventQrCodeSheet(
                                    context,
                                    participation,
                                    event.title,
                                  ),
                            icon: const Icon(Icons.qr_code_rounded),
                            label: const Text('QR Code'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              side: const BorderSide(color: AppColors.primary),
                              minimumSize: const Size.fromHeight(52),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: _isCheckingLocation
                                ? null
                                : _verifyGeolocation,
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
                                  ? 'Checking...'
                                  : 'Geolocation',
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
                      child: const Text('Join Event'),
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
