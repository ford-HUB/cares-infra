enum LocationRecordSyncState { synced, pending, uploading }

extension LocationRecordSyncStateX on LocationRecordSyncState {
  String get label => switch (this) {
    LocationRecordSyncState.synced => 'Synced',
    LocationRecordSyncState.pending => 'Pending upload',
    LocationRecordSyncState.uploading => 'Uploading',
  };
}

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

  /// Joined with " · " when several.
  final String eventTitle;
  final int captureCount;
  final int pendingCount;

  /// Estimated via [LocationRecords.bytesPerCapture].
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

  /// The server's CSV columns; `time` is ISO-8601 UTC.
  static const csvHeader = 'time,latitude,longitude,accuracy_m,in_area';

  /// Rough bytes of one CSV line, for the size shown on the Records screens.
  static const bytesPerCapture = 40;

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
