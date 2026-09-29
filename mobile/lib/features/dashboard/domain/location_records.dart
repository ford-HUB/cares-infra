/// Geolocation records kept on the device for attendance validation.
///
/// Fixes are recorded by `EventLocationTracker` once a second while
/// recording is activated. Online they go straight to the server; offline
/// they are stored in SQLite and synced as one CSV per event once the
/// connection is back. The Records screens group those SQLite rows by day.
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

/// One calendar day of captures.
class LocationRecordFile {
  const LocationRecordFile({
    required this.date,
    required this.eventTitle,
    required this.captureCount,
    required this.pendingCount,
    required this.sizeKb,
    required this.syncState,
  });

  final DateTime date;

  /// Title(s) of the event(s) recorded that day, joined with " · ".
  final String eventTitle;
  final int captureCount;
  final int pendingCount;

  /// Estimated size of the day's rows as they upload (see
  /// [LocationRecords.bytesPerCapture]).
  final double sizeKb;
  final LocationRecordSyncState syncState;

  /// `yyyy-MM-dd`, the key the tracker groups rows by.
  String get dayKey => LocationRecords.dayKeyFor(date);

  LocationRecordFile copyWith({LocationRecordSyncState? syncState}) =>
      LocationRecordFile(
        date: date,
        eventTitle: eventTitle,
        captureCount: captureCount,
        pendingCount: pendingCount,
        sizeKb: sizeKb,
        syncState: syncState ?? this.syncState,
      );
}

abstract final class LocationRecords {
  static const retentionDays = 30;

  /// Columns of the per-event CSV the server ingests; `time` is an ISO-8601
  /// UTC timestamp.
  static const csvHeader = 'time,latitude,longitude,accuracy_m,in_area';

  /// Rough bytes of one CSV line, for the size shown on the Records screens.
  static const bytesPerCapture = 40;

  /// How often a fix is written while an event window is open.
  static const captureInterval = Duration(seconds: 1);

  static String dayKeyFor(DateTime d) {
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '${d.year}-$m-$day';
  }

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
