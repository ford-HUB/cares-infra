import 'package:flutter/material.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/location_records_repository.dart';
import 'package:mobile/features/dashboard/domain/location_records.dart';
import 'package:mobile/features/dashboard/presentation/widgets/location_record_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// One day's captures: facts up top, then a preview of the first rows in the
/// same columns the server receives. Rows come from SQLite for that day;
/// Delete removes the day's rows from the device.
class LocationRecordDetailScreen extends StatefulWidget {
  const LocationRecordDetailScreen({
    super.key,
    required this.file,
    required this.today,
  });

  final LocationRecordFile file;
  final DateTime today;

  static Future<void> open(
    BuildContext context, {
    required LocationRecordFile file,
    required DateTime today,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LocationRecordDetailScreen(file: file, today: today),
      ),
    );
  }

  @override
  State<LocationRecordDetailScreen> createState() =>
      _LocationRecordDetailScreenState();
}

class _LocationRecordDetailScreenState
    extends State<LocationRecordDetailScreen> {
  final _repository = LocationRecordsRepository();

  static const _previewLimit = 25;

  List<LocationCapture> _preview = const [];
  int _inArea = 0;
  bool _loading = true;

  LocationRecordFile get file => widget.file;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final preview = await _repository.preview(
      file.dayKey,
      limit: _previewLimit,
    );
    final inArea = await _repository.inAreaCount(file.dayKey);
    if (!mounted) return;
    setState(() {
      _preview = preview;
      _inArea = inArea;
      _loading = false;
    });
  }

  void _snack(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete this day?'),
        content: Text(
          '${file.dayKey} and its ${file.captureCount} captures will be '
          'removed from this device.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.heart),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _repository.deleteDay(file.dayKey);
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final synced = file.syncState == LocationRecordSyncState.synced;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: () => Navigator.of(context).pop(),
            title: locationRecordDayLabel(file.date, widget.today),
            subtitle: file.dayKey,
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: AppDecorations.surfaceCard(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              file.eventTitle,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ),
                          LocationSyncBadge(state: file.syncState),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _Fact(label: 'Captures', value: '${file.captureCount}'),
                      _Fact(
                        label: 'Pending',
                        value: file.pendingCount == 0
                            ? 'All uploaded'
                            : '${file.pendingCount} waiting',
                      ),
                      _Fact(
                        label: 'Upload size',
                        value: '${file.sizeKb.toStringAsFixed(1)} KB',
                      ),
                      const _Fact(
                        label: 'Interval',
                        value: 'Every second while an event runs',
                      ),
                      const _Fact(
                        label: 'Columns',
                        value: LocationRecords.csvHeader,
                        mono: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    const Text(
                      'Preview',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'first ${_preview.length} of ${file.captureCount} · '
                      '$_inArea in area',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                else
                  _CsvPreviewTable(rows: _preview),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _snack('Share sheet coming soon.'),
                        icon: const Icon(Icons.ios_share_rounded, size: 18),
                        label: const Text('Share CSV'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: synced ? _delete : null,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.heart,
                          side: BorderSide(
                            color: AppColors.heart.withValues(alpha: 0.5),
                          ),
                        ),
                        icon: const Icon(Icons.delete_outline, size: 18),
                        label: const Text('Delete'),
                      ),
                    ),
                  ],
                ),
                if (!synced)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'You can delete this file once it has been uploaded.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: AppColors.textMuted,
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

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value, this.mono = false});

  final String label;
  final String value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 12.5,
                fontFamily: mono ? 'monospace' : null,
                color: AppColors.primaryDark,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Horizontally scrollable table mirroring the CSV columns.
class _CsvPreviewTable extends StatelessWidget {
  const _CsvPreviewTable({required this.rows});

  final List<LocationCapture> rows;

  static const _headStyle = TextStyle(
    fontSize: 11.5,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryDark,
  );
  static const _cellStyle = TextStyle(
    fontSize: 12,
    fontFamily: 'monospace',
    color: AppColors.primaryDark,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 38,
          dataRowMinHeight: 36,
          dataRowMaxHeight: 36,
          columnSpacing: 20,
          horizontalMargin: 14,
          headingRowColor: WidgetStatePropertyAll(
            AppColors.accentLight.withValues(alpha: 0.35),
          ),
          columns: const [
            DataColumn(label: Text('time', style: _headStyle)),
            DataColumn(label: Text('latitude', style: _headStyle)),
            DataColumn(label: Text('longitude', style: _headStyle)),
            DataColumn(label: Text('accuracy_m', style: _headStyle)),
            DataColumn(label: Text('in_area', style: _headStyle)),
          ],
          rows: [
            for (final r in rows)
              DataRow(
                cells: [
                  DataCell(Text(r.time, style: _cellStyle)),
                  DataCell(
                    Text(r.latitude.toStringAsFixed(4), style: _cellStyle),
                  ),
                  DataCell(
                    Text(r.longitude.toStringAsFixed(4), style: _cellStyle),
                  ),
                  DataCell(Text('${r.accuracyMeters}', style: _cellStyle)),
                  DataCell(
                    Text(
                      r.inArea ? 'true' : 'false',
                      style: _cellStyle.copyWith(
                        color: r.inArea ? AppColors.primary : AppColors.heart,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
