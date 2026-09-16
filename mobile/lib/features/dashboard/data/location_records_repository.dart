import '../../../core/session/static_user_session.dart';
import '../domain/location_records.dart';
import 'location_capture_db.dart';
import 'location_csv_store.dart';
import 'location_sync_service.dart';

/// Read model for the Geolocation Records screens: one [LocationRecordFile]
/// per day, built from the SQLite rows (counts, titles, sync state) and the
/// daily CSV on disk (size, path).
class LocationRecordsRepository {
  LocationRecordsRepository({
    LocationCaptureDb? db,
    LocationCsvStore? csv,
    LocationSyncService? sync,
  }) : _db = db ?? LocationCaptureDb.instance,
       _csv = csv ?? LocationCsvStore.instance,
       _sync = sync ?? LocationSyncService();

  final LocationCaptureDb _db;
  final LocationCsvStore _csv;
  final LocationSyncService _sync;

  String get _email =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  Future<List<LocationRecordFile>> files() async {
    final days = await _db.daySummaries(_email);
    final files = <LocationRecordFile>[];
    for (final day in days) {
      final date = LocationRecords.parseDayKey(day.dayKey);
      if (date == null) continue;
      files.add(
        LocationRecordFile(
          date: date,
          eventTitle: day.eventTitles.isEmpty
              ? 'Event'
              : day.eventTitles.join(' · '),
          captureCount: day.total,
          pendingCount: day.pending,
          sizeKb: await _csv.sizeKbForDay(day.dayKey),
          syncState: day.pending > 0
              ? LocationRecordSyncState.pending
              : LocationRecordSyncState.synced,
          path: await _csv.pathForDay(day.dayKey),
        ),
      );
    }
    return files;
  }

  /// First [limit] rows of a day, in CSV column order.
  Future<List<LocationCapture>> preview(String dayKey, {int limit = 25}) async {
    final rows = await _db.rowsForDay(dayKey, _email, limit: limit);
    return rows.map((r) => r.toCapture()).toList();
  }

  Future<int> inAreaCount(String dayKey) async {
    final rows = await _db.rowsForDay(dayKey, _email);
    return rows.where((r) => r.inArea).length;
  }

  /// Removes the day's rows and its CSV file.
  Future<void> deleteDay(String dayKey) async {
    await _db.deleteDay(dayKey, _email);
    await _csv.deleteDay(dayKey);
  }

  /// Pushes every event that still has pending rows. Returns the number of
  /// rows accepted and the first error, if any event failed.
  Future<({int uploaded, String? error})> uploadPending() async {
    var uploaded = 0;
    String? error;
    for (final ref in await _db.eventsWithPending(_email)) {
      final result = await _sync.syncEvent(eventId: ref.eventId, email: _email);
      uploaded += result.uploaded;
      error ??= result.error;
    }
    return (uploaded: uploaded, error: error);
  }
}
