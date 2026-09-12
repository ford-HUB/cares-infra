import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_location_records.dart';

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/// "Today" / "Yesterday" / "Wed, Sep 10" relative to [today].
String locationRecordDayLabel(DateTime date, DateTime today) {
  final diff = today.difference(DateTime(date.year, date.month, date.day)).inDays;
  if (diff == 0) return 'Today';
  if (diff == 1) return 'Yesterday';
  return '${_weekdays[date.weekday - 1]}, ${_months[date.month - 1]} ${date.day}';
}

Color locationSyncColor(LocationRecordSyncState state) => switch (state) {
  LocationRecordSyncState.synced => AppColors.primary,
  LocationRecordSyncState.pending => AppColors.accentOrange,
  LocationRecordSyncState.uploading => AppColors.secondary,
};

/// Small pill showing whether the day's CSV has reached the server.
class LocationSyncBadge extends StatelessWidget {
  const LocationSyncBadge({super.key, required this.state});

  final LocationRecordSyncState state;

  @override
  Widget build(BuildContext context) {
    final color = locationSyncColor(state);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (state == LocationRecordSyncState.uploading)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: SizedBox(
                width: 9,
                height: 9,
                child: CircularProgressIndicator(strokeWidth: 1.5, color: color),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.only(right: 3),
              child: Icon(
                state == LocationRecordSyncState.synced
                    ? Icons.cloud_done_outlined
                    : Icons.cloud_upload_outlined,
                size: 11,
                color: color,
              ),
            ),
          Text(
            state.label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// One daily CSV in the list: file icon, day label + filename, event and
/// capture count, sync badge, chevron.
class LocationRecordTile extends StatelessWidget {
  const LocationRecordTile({
    super.key,
    required this.file,
    required this.today,
    required this.onTap,
  });

  final LocationRecordFile file;
  final DateTime today;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: 1),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.accentLight.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.description_outlined,
                  size: 20,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          locationRecordDayLabel(file.date, today),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        const SizedBox(width: 8),
                        LocationSyncBadge(state: file.syncState),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      file.fileName,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontFamily: 'monospace',
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${file.eventTitle} · ${file.captureCount} captures · '
                      '${file.sizeKb.toStringAsFixed(1)} KB',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: AppColors.primaryDark.withValues(alpha: 0.7),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Storage / sync summary shown above the file list.
class LocationRecordsSummaryCard extends StatelessWidget {
  const LocationRecordsSummaryCard({
    super.key,
    required this.fileCount,
    required this.pendingCount,
    required this.totalKb,
  });

  final int fileCount;
  final int pendingCount;
  final double totalKb;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard(),
      child: Row(
        children: [
          _Stat(label: 'Files', value: '$fileCount'),
          _Divider(),
          _Stat(
            label: 'Pending',
            value: '$pendingCount',
            color: pendingCount > 0 ? AppColors.accentOrange : null,
          ),
          _Divider(),
          _Stat(label: 'On device', value: '${totalKb.toStringAsFixed(0)} KB'),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.color});

  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: color ?? AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 32, color: AppColors.fieldBorder);
}
