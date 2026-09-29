import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/event_location_tracker.dart';
import '../data/event_registration_store.dart';
import '../data/location_capture_db.dart';
import '../data/location_sync_service.dart';
import '../domain/cares_event.dart';

/// Bottom sheet for a joined event: what the geofence is doing right now,
/// how many fixes sit on the device, and a button to push the pending ones
/// to the server as CSV.
Future<void> showEventSyncSheet(
  BuildContext context, {
  required CaresEvent event,
  required EventParticipation participation,
}) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: AppColors.surface,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) =>
        _EventSyncSheet(event: event, participation: participation),
  );
}

class _EventSyncSheet extends StatefulWidget {
  const _EventSyncSheet({required this.event, required this.participation});

  final CaresEvent event;
  final EventParticipation participation;

  @override
  State<_EventSyncSheet> createState() => _EventSyncSheetState();
}

class _EventSyncSheetState extends State<_EventSyncSheet> {
  final _tracker = EventLocationTracker.instance;
  final _db = LocationCaptureDb.instance;
  final _sync = LocationSyncService();

  LocationCaptureStats _stats = LocationCaptureStats.empty;
  bool _syncing = false;
  String? _notice;
  bool _noticeIsError = false;

  String get _email => widget.participation.participantEmail;

  @override
  void initState() {
    super.initState();
    _tracker.addListener(_reload);
    _reload();
  }

  @override
  void dispose() {
    _tracker.removeListener(_reload);
    super.dispose();
  }

  Future<void> _reload() async {
    final stats = await _db.statsForEvent(widget.event.id, _email);
    if (mounted) setState(() => _stats = stats);
  }

  Future<void> _syncNow() async {
    setState(() {
      _syncing = true;
      _notice = null;
    });
    final result = await _sync.syncEvent(
      eventId: widget.event.id,
      email: _email,
      resync: true,
    );
    await _reload();
    if (!mounted) return;
    setState(() {
      _syncing = false;
      _noticeIsError = !result.succeeded;
      _notice = result.succeeded
          ? (result.uploaded == 0
                ? 'No coordinates recorded for this event yet.'
                : '${result.uploaded} coordinates synced.')
          : result.error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = _tracker.stateFor(widget.event);
    final color = switch (state) {
      EventTrackingState.recording => AppColors.primary,
      EventTrackingState.blocked => AppColors.error,
      EventTrackingState.ended => AppColors.textSecondary,
      EventTrackingState.inactive => AppColors.accentOrange,
    };
    final icon = switch (state) {
      EventTrackingState.recording => Icons.radio_button_checked_rounded,
      EventTrackingState.blocked => Icons.location_off_rounded,
      EventTrackingState.ended => Icons.flag_rounded,
      EventTrackingState.inactive => Icons.pause_circle_outline_rounded,
    };
    final hasPending = _stats.pending > 0;

    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          24,
          12,
          24,
          20 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.inputFill,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 28, color: color),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _title(state),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _subtitle(state),
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.inputFill),
              ),
              child: Column(
                children: [
                  _StatusRow(
                    icon: Icons.event_available_rounded,
                    label: 'Registered',
                    value: _formatDateTime(widget.participation.registeredAt),
                  ),
                  const SizedBox(height: 12),
                  const _StatusRow(
                    icon: Icons.schedule_rounded,
                    label: 'Recording',
                    value: 'Every second while you have a joined event',
                  ),
                  const SizedBox(height: 12),
                  _StatusRow(
                    icon: Icons.my_location_rounded,
                    label: 'Captured',
                    value: _stats.total == 0
                        ? '—'
                        : '${_stats.total} fixes · ${_stats.inArea} in area',
                    valueColor: _stats.total == 0 ? AppColors.textMuted : null,
                  ),
                  const SizedBox(height: 12),
                  _StatusRow(
                    icon: Icons.cloud_upload_outlined,
                    label: 'Pending',
                    value: hasPending
                        ? '${_stats.pending} waiting to upload'
                        : 'All synced',
                    valueColor: hasPending ? AppColors.accentOrange : null,
                  ),
                  const SizedBox(height: 12),
                  _StatusRow(
                    icon: Icons.update_rounded,
                    label: 'Last fix',
                    value: _stats.lastCapturedAt == null
                        ? '—'
                        : _formatDateTime(_stats.lastCapturedAt!),
                    valueColor: _stats.lastCapturedAt == null
                        ? AppColors.textMuted
                        : null,
                  ),
                ],
              ),
            ),
            if (_notice != null) ...[
              const SizedBox(height: 12),
              Text(
                _notice!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: _noticeIsError ? AppColors.error : AppColors.primary,
                ),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _syncing || _stats.total == 0 ? null : _syncNow,
              icon: _syncing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.sync_rounded),
              label: Text(
                _syncing
                    ? 'Syncing...'
                    : hasPending
                    ? 'Sync ${_stats.pending} coordinates'
                    : _stats.total == 0
                    ? 'Nothing recorded yet'
                    : 'Re-sync all ${_stats.total} coordinates',
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 6),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  String _title(EventTrackingState state) => switch (state) {
    EventTrackingState.recording => 'Recording Your Location',
    EventTrackingState.blocked => 'Location Unavailable',
    EventTrackingState.ended => 'Event Ended',
    EventTrackingState.inactive => 'Recording Paused',
  };

  String _subtitle(EventTrackingState state) => switch (state) {
    EventTrackingState.recording =>
      'Coordinates are saved on this phone and synced when online.',
    EventTrackingState.blocked =>
      'Turn location on so your attendance can be recorded.',
    EventTrackingState.ended =>
      'Sync your trail so attendance can be validated.',
    EventTrackingState.inactive =>
      'Recording turns on automatically once you join an event.',
  };

  static String _formatTime(DateTime dt) {
    final hour12 = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final minute = dt.minute.toString().padLeft(2, '0');
    final suffix = dt.hour < 12 ? 'AM' : 'PM';
    return '$hour12:$minute $suffix';
  }

  static String _formatDateTime(DateTime dt) =>
      '${dt.month}/${dt.day}/${dt.year} · ${_formatTime(dt)}';
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 10),
        SizedBox(
          width: 82,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: valueColor ?? AppColors.textPrimary,
              height: 1.35,
            ),
          ),
        ),
      ],
    );
  }
}
