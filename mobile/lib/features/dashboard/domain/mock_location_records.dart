/// Daily geolocation CSV logs kept on the device for attendance validation.
///
/// Mock fixtures — the real files will be written by the geofence tracker and
/// pushed to the server once the device is back online.
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
    required this.sizeKb,
    required this.syncState,
    required this.preview,
  });

  final DateTime date;
  final String eventTitle;
  final int captureCount;
  final double sizeKb;
  final LocationRecordSyncState syncState;

  /// First few rows, shown on the detail screen.
  final List<LocationCapture> preview;

  String get fileName {
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return 'geolocation_${date.year}-$m-$d.csv';
  }
}

abstract final class MockLocationRecords {
  static const retentionDays = 30;
  static const csvHeader = 'time,latitude,longitude,accuracy_m,in_area';

  static final DateTime _today = DateTime(2026, 9, 12);

  static final List<LocationRecordFile> files = [
    LocationRecordFile(
      date: _today,
      eventTitle: 'Coastal Cleanup Drive',
      captureCount: 214,
      sizeKb: 11.8,
      syncState: LocationRecordSyncState.pending,
      preview: const [
        LocationCapture(time: '07:58:12', latitude: 10.3157, longitude: 123.8854, accuracyMeters: 8, inArea: true),
        LocationCapture(time: '08:00:12', latitude: 10.3158, longitude: 123.8855, accuracyMeters: 6, inArea: true),
        LocationCapture(time: '08:02:12', latitude: 10.3159, longitude: 123.8853, accuracyMeters: 7, inArea: true),
        LocationCapture(time: '08:04:12', latitude: 10.3171, longitude: 123.8869, accuracyMeters: 12, inArea: false),
        LocationCapture(time: '08:06:12', latitude: 10.3160, longitude: 123.8854, accuracyMeters: 5, inArea: true),
      ],
    ),
    LocationRecordFile(
      date: _today.subtract(const Duration(days: 1)),
      eventTitle: 'Blood Donation Drive',
      captureCount: 96,
      sizeKb: 5.3,
      syncState: LocationRecordSyncState.uploading,
      preview: const [
        LocationCapture(time: '13:30:04', latitude: 10.3120, longitude: 123.9180, accuracyMeters: 9, inArea: true),
        LocationCapture(time: '13:32:04', latitude: 10.3121, longitude: 123.9181, accuracyMeters: 7, inArea: true),
        LocationCapture(time: '13:34:04', latitude: 10.3121, longitude: 123.9179, accuracyMeters: 6, inArea: true),
      ],
    ),
    LocationRecordFile(
      date: _today.subtract(const Duration(days: 3)),
      eventTitle: 'Tree Planting – Barangay Talamban',
      captureCount: 302,
      sizeKb: 16.4,
      syncState: LocationRecordSyncState.synced,
      preview: const [
        LocationCapture(time: '06:15:00', latitude: 10.3540, longitude: 123.9120, accuracyMeters: 10, inArea: true),
        LocationCapture(time: '06:17:00', latitude: 10.3541, longitude: 123.9122, accuracyMeters: 8, inArea: true),
        LocationCapture(time: '06:19:00', latitude: 10.3542, longitude: 123.9121, accuracyMeters: 8, inArea: true),
        LocationCapture(time: '06:21:00', latitude: 10.3543, longitude: 123.9123, accuracyMeters: 11, inArea: true),
      ],
    ),
    LocationRecordFile(
      date: _today.subtract(const Duration(days: 6)),
      eventTitle: 'Feeding Program – Sitio Sudlon',
      captureCount: 148,
      sizeKb: 8.1,
      syncState: LocationRecordSyncState.synced,
      preview: const [
        LocationCapture(time: '09:00:30', latitude: 10.2980, longitude: 123.8760, accuracyMeters: 14, inArea: true),
        LocationCapture(time: '09:02:30', latitude: 10.2981, longitude: 123.8762, accuracyMeters: 9, inArea: true),
        LocationCapture(time: '09:04:30', latitude: 10.2979, longitude: 123.8761, accuracyMeters: 9, inArea: true),
      ],
    ),
    LocationRecordFile(
      date: _today.subtract(const Duration(days: 10)),
      eventTitle: 'Community Health Fair',
      captureCount: 187,
      sizeKb: 10.2,
      syncState: LocationRecordSyncState.synced,
      preview: const [
        LocationCapture(time: '08:30:00', latitude: 10.3320, longitude: 123.9050, accuracyMeters: 7, inArea: true),
        LocationCapture(time: '08:32:00', latitude: 10.3321, longitude: 123.9052, accuracyMeters: 6, inArea: true),
      ],
    ),
  ];
}
