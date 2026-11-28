import '../../../core/session/static_user_session.dart';
import '../domain/location_records.dart';
import 'location_capture_db.dart';
import 'location_sync_service.dart';

/// One [LocationRecordFile] per day, built from the SQLite rows.
class LocationRecordsRepository {
  LocationRecordsRepository({LocationCaptureDb? db, LocationSyncService? sync})
    : _db = db ?? LocationCaptureDb.instance,
      _sync = sync ?? LocationSyncService();

  final LocationCaptureDb _db;
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
          sizeKb: day.total * LocationRecords.bytesPerCapture / 1024,
          syncState: day.pending > 0
              ? LocationRecordSyncState.pending
              : LocationRecordSyncState.synced,
        ),
      );
    }
    return files;
  }

  /// In CSV column order.
  Future<List<LocationCapture>> preview(String dayKey, {int limit = 25}) async {
    final rows = await _db.rowsForDay(dayKey, _email, limit: limit);
    return rows.map((r) => r.toCapture()).toList();
  }

  Future<int> inAreaCount(String dayKey) async {
    final rows = await _db.rowsForDay(dayKey, _email);
    return rows.where((r) => r.inArea).length;
  }

  Future<void> deleteDay(String dayKey) => _db.deleteDay(dayKey, _email);

  /// Returns rows accepted and the first error, if any.
  Future<({int uploaded, String? error})> uploadPending() =>
      _sync.syncPending(email: _email);
}
