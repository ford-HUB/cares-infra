import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_location_records.dart';
import 'package:mobile/features/dashboard/presentation/screens/location_record_detail_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/location_record_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Geolocation Records landing, opened from the Profile tab. One CSV per day of
/// coordinate captures made during event attendance, with its upload state.
///
/// Design-only for now — runs on [MockLocationRecords]; "Upload now" just
/// flips the pending files to synced after a mock delay.
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
  final DateTime _today = DateTime(2026, 9, 12);
  List<LocationRecordFile> _files = List.of(MockLocationRecords.files);
  bool _uploading = false;

  int get _pendingCount => _files
      .where((f) => f.syncState != LocationRecordSyncState.synced)
      .length;

  Future<void> _uploadPending() async {
    setState(() => _uploading = true);
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() {
      _files = [
        for (final f in _files)
          LocationRecordFile(
            date: f.date,
            eventTitle: f.eventTitle,
            captureCount: f.captureCount,
            sizeKb: f.sizeKb,
            syncState: LocationRecordSyncState.synced,
            preview: f.preview,
          ),
      ];
      _uploading = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('All geolocation records uploaded.'),
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
                'Daily CSV logs of the coordinates captured while you attend '
                'events. Used only to validate your attendance.',
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
                        label: Text(
                          _uploading ? 'Uploading…' : 'Upload now',
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                for (final file in _files)
                  LocationRecordTile(
                    file: file,
                    today: _today,
                    onTap: () => LocationRecordDetailScreen.open(
                      context,
                      file: file,
                      today: _today,
                    ),
                  ),
                const SizedBox(height: 24),
                const SecurityInfoNote(
                  icon: Icons.shield_outlined,
                  text:
                      'Files stay on this device for '
                      '${MockLocationRecords.retentionDays} days and are '
                      'uploaded automatically when you\'re online. Captures '
                      'only happen during events you\'ve checked in to.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
