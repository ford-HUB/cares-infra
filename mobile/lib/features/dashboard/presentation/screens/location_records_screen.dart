import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_location_tracker.dart';
import 'package:mobile/features/dashboard/data/location_records_repository.dart';
import 'package:mobile/features/dashboard/domain/location_records.dart';
import 'package:mobile/features/dashboard/presentation/screens/location_record_detail_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/location_record_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Geolocation Records landing, opened from the Profile tab. One entry per day of
/// coordinate captures made during event attendance, with its upload state.
///
/// Reads the day summaries through [LocationRecordsRepository] and
/// refreshes live while the tracker is recording; "Upload now" pushes every
/// event that still has pending rows.
class LocationRecordsScreen extends StatefulWidget {
  const LocationRecordsScreen({super.key});

  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const LocationRecordsScreen()),
    );
  }

  @override
  State<LocationRecordsScreen> createState() => _LocationRecordsScreenState();
}

class _LocationRecordsScreenState extends State<LocationRecordsScreen> {
  final _repository = LocationRecordsRepository();
  final _tracker = EventLocationTracker.instance;

  List<LocationRecordFile> _files = const [];
  bool _loading = true;
  bool _uploading = false;
  bool _reloadQueued = false;

  DateTime get _today {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  int get _pendingCount =>
      _files.where((f) => f.syncState != LocationRecordSyncState.synced).length;

  @override
  void initState() {
    super.initState();
    _tracker.addListener(_onTrackerChanged);
    _reload();
  }

  @override
  void dispose() {
    _tracker.removeListener(_onTrackerChanged);
    super.dispose();
  }

  /// The tracker notifies once a second while recording; coalesce so at most
  /// one reload is in flight.
  void _onTrackerChanged() {
    if (_reloadQueued) return;
    _reloadQueued = true;
    Future<void>.delayed(const Duration(seconds: 1), () {
      _reloadQueued = false;
      if (mounted) _reload();
    });
  }

  Future<void> _reload() async {
    final files = await _repository.files();
    if (!mounted) return;
    setState(() {
      _files = files;
      _loading = false;
    });
  }

  Future<void> _uploadPending() async {
    setState(() => _uploading = true);
    final result = await _repository.uploadPending();
    await _reload();
    if (!mounted) return;
    setState(() => _uploading = false);
    final error = result.error;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error ?? '${result.uploaded} coordinates uploaded.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalKb = _files.fold<double>(0, (sum, f) => sum + f.sizeKb);

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: () => Navigator.of(context).pop(),
            title: 'Geolocation Records',
            subtitle:
                'Coordinates captured on this device while you attend events, '
                'grouped by day. Used only to validate your attendance.',
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              children: [
                LocationRecordsSummaryCard(
                  fileCount: _files.length,
                  pendingCount: _pendingCount,
                  totalKb: totalKb,
                ),
                const SizedBox(height: 12),
                _RecordingStatusStrip(tracker: _tracker),
                const SizedBox(height: 24),
                Row(
                  children: [
                    const Text(
                      'Daily files',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const Spacer(),
                    if (_pendingCount > 0)
                      TextButton.icon(
                        onPressed: _uploading ? null : _uploadPending,
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          visualDensity: VisualDensity.compact,
                          textStyle: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        icon: _uploading
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary,
                                ),
                              )
                            : const Icon(Icons.cloud_upload_outlined, size: 16),
                        label: Text(_uploading ? 'Uploading…' : 'Upload now'),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                else if (_files.isEmpty)
                  const _EmptyRecords()
                else
                  for (final file in _files)
                    LocationRecordTile(
                      file: file,
                      today: _today,
                      onTap: () async {
                        await LocationRecordDetailScreen.open(
                          context,
                          file: file,
                          today: _today,
                        );
                        if (mounted) _reload();
                      },
                    ),
                const SizedBox(height: 24),
                const SecurityInfoNote(
                  icon: Icons.shield_outlined,
                  text:
                      'Files stay on this device for '
                      '${LocationRecords.retentionDays} days. Coordinates are '
                      'captured every second while you have a joined upcoming '
                      'event, and stop once you no longer have one.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyRecords extends StatelessWidget {
  const _EmptyRecords();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: const Column(
        children: [
          Icon(
            Icons.location_searching_rounded,
            size: 32,
            color: AppColors.textMuted,
          ),
          SizedBox(height: 10),
          Text(
            'No records yet',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryDark,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Your first file appears once a joined event starts and your '
            'location is being recorded.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// Live line under the summary: whether the tracker is writing right now,
/// and why (event window open vs. offline fallback).
class _RecordingStatusStrip extends StatelessWidget {
  const _RecordingStatusStrip({required this.tracker});

  final EventLocationTracker tracker;

  @override
  Widget build(BuildContext context) {
    final recording = tracker.isRecording;
    final blocked = tracker.isActivated && !recording;
    final color = recording
        ? AppColors.primary
        : blocked
        ? AppColors.accentOrange
        : AppColors.textMuted;
    final String text;
    if (recording) {
      final next = tracker.upcomingJoinedEvents;
      final hint = next.isEmpty ? 'a joined event' : next.first.title;
      text =
          'Recording every second for $hint '
          '(${tracker.capturesThisSession} captures this session).';
    } else if (blocked) {
      text = 'Recording is on but location is off — turn it on to continue.';
    } else {
      text = 'Not recording — you have no joined upcoming event.';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            recording
                ? Icons.radio_button_checked_rounded
                : Icons.radio_button_off_rounded,
            size: 16,
            color: color,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: recording ? AppColors.primaryDark : AppColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
