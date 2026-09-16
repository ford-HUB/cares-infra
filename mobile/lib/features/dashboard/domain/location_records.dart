/// Daily geolocation CSV logs kept on the device for attendance validation.
///
/// Rows are recorded by `EventLocationTracker` once a second while a joined
/// event's window is open, into SQLite (source of truth) and appended to that
/// day's CSV file under the app documents folder.
enum LocationRecordSyncState { synced, pending, uploading }

extension LocationRecordSyncStateX on LocationRecordSyncState {
  String get label => switch (this) {
    LocationRecordSyncState.synced => 'Synced',
    LocationRecordSyncState.pending => 'Pending upload',
    LocationRecordSyncState.uploading => 'Uploading',
  };
}

/// One row inside a daily CSV: a single coordinate capture.
class LocationCapture {
  const LocationCapture({
    required this.time,
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.inArea,
  });

  final String time;
  final double latitude;
  final double longitude;
  final int accuracyMeters;
  final bool inArea;
}

/// One CSV file — one calendar day of captures.
class LocationRecordFile {
  const LocationRecordFile({
    required this.date,
    required this.eventTitle,
    required this.captureCount,
    required this.pendingCount,
    required this.sizeKb,
    required this.syncState,
    this.path,
  });

  final DateTime date;

  /// Title(s) of the event(s) recorded that day, joined with " · ".
  final String eventTitle;
  final int captureCount;
  final int pendingCount;
  final double sizeKb;
  final LocationRecordSyncState syncState;

  /// Absolute path of the CSV on the device, null when it hasn't been written.
  final String? path;

  /// `yyyy-MM-dd`, the key the tracker groups rows by.
  String get dayKey => LocationRecords.dayKeyFor(date);

  String get fileName => LocationRecords.fileNameFor(date);

  LocationRecordFile copyWith({LocationRecordSyncState? syncState}) =>
      LocationRecordFile(
        date: date,
        eventTitle: eventTitle,
        captureCount: captureCount,
        pendingCount: pendingCount,
        sizeKb: sizeKb,
        syncState: syncState ?? this.syncState,
        path: path,
      );
}

abstract final class LocationRecords {
  static const retentionDays = 30;

  /// Columns of the daily on-device file. The first five are exactly what
  /// the server ingests; `event_id` tells which joined event a row belongs
  /// to when two events fall on one day.
  static const csvHeader = 'time,latitude,longitude,accuracy_m,in_area,event_id';

  /// How often a fix is written while an event window is open.
  static const captureInterval = Duration(seconds: 1);

  static String dayKeyFor(DateTime d) {
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '${d.year}-$m-$day';
  }

  static String fileNameFor(DateTime d) => 'geolocation_${dayKeyFor(d)}.csv';

  static DateTime? parseDayKey(String key) {
    final parts = key.split('-');
    if (parts.length != 3) return null;
    final y = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    final d = int.tryParse(parts[2]);
    if (y == null || m == null || d == null) return null;
    return DateTime(y, m, d);
  }
}
