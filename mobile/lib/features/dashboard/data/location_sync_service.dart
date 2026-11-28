import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/services/api_client.dart';
import '../domain/location_records.dart';
import 'location_capture_db.dart';

class LocationSyncResult {
  const LocationSyncResult({
    required this.uploaded,
    required this.csvPath,
    this.error,
  });

  /// Rows the server accepted (0 when there was nothing pending).
  final int uploaded;

  /// Written even when the upload fails, so the trail survives offline.
  final String? csvPath;

  final String? error;

  bool get succeeded => error == null;
}

/// Offline flow: pending rows → CSV at
/// `<app documents>/geolocation/uploads/<event>_<yyyy-MM-dd>.csv` →
/// multipart upload → rows marked synced. Failures leave the rows pending and
/// the file on disk for a retry.
class LocationSyncService {
  LocationSyncService({ApiClient? apiClient, LocationCaptureDb? db})
    : _api = apiClient ?? ApiClient(),
      _db = db ?? LocationCaptureDb.instance;

  static const csvHeader = LocationRecords.csvHeader;

  /// Not built on the server yet; until then the request fails and rows stay
  /// pending, like offline.
  static const syncPath = '/attendance/geofence/mobile/sync';

  /// Not built on the server yet; failures take the offline path.
  static const livePath = '/attendance/geofence/mobile/coordinates';

  /// Short so a slow server can't stack up one-second ticks.
  static const liveTimeout = Duration(seconds: 8);

  final ApiClient _api;
  final LocationCaptureDb _db;

  /// False on any failure; the caller stores the row locally.
  Future<bool> submitLive(LocationCaptureRow row) async {
    try {
      await _api.postJson(
        livePath,
        body: row.toLiveJson(),
        timeout: liveTimeout,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Returns rows accepted and the first error, if any.
  Future<({int uploaded, String? error})> syncPending({
    required String email,
  }) async {
    var uploaded = 0;
    String? error;
    for (final ref in await _db.eventsWithPending(email)) {
      final result = await syncEvent(eventId: ref.eventId, email: email);
      uploaded += result.uploaded;
      error ??= result.error;
    }
    return (uploaded: uploaded, error: error);
  }

  /// With [resync] and nothing pending, resends the whole trail (the sync
  /// sheet's manual button).
  Future<LocationSyncResult> syncEvent({
    required String eventId,
    required String email,
    bool resync = false,
  }) async {
    var pending = await _db.pendingForEvent(eventId, email);
    if (pending.isEmpty && resync) {
      pending = await _db.allForEvent(eventId, email);
    }
    if (pending.isEmpty) {
      return const LocationSyncResult(uploaded: 0, csvPath: null);
    }

    String? csvPath;
    try {
      csvPath = await _writeCsv(eventId, pending);
    } catch (_) {
      // Documents dir unavailable — still try to upload from memory.
    }

    try {
      final csv = _csvFor(pending);
      final file = http.MultipartFile.fromString(
        'file',
        csv,
        filename: p.basename(csvPath ?? _fileName(eventId, pending.first)),
        contentType: MediaType('text', 'csv'),
      );
      await _api.postMultipart(
        syncPath,
        fields: {
          'eventId': eventId,
          'capturedFrom': pending.first.capturedAt.toUtc().toIso8601String(),
          'capturedTo': pending.last.capturedAt.toUtc().toIso8601String(),
          'rowCount': pending.length.toString(),
        },
        files: [file],
      );
    } on ApiException catch (error) {
      return LocationSyncResult(
        uploaded: 0,
        csvPath: csvPath,
        error: error.message,
      );
    } catch (_) {
      return LocationSyncResult(
        uploaded: 0,
        csvPath: csvPath,
        error: 'No connection — your trail is saved and will sync later.',
      );
    }

    await _db.markSynced(pending.map((r) => r.id!).toList());
    return LocationSyncResult(uploaded: pending.length, csvPath: csvPath);
  }

  /// Separate from the daily logs.
  Future<String> _writeCsv(
    String eventId,
    List<LocationCaptureRow> rows,
  ) async {
    final dir = Directory(
      p.join(
        (await getApplicationDocumentsDirectory()).path,
        'geolocation',
        'uploads',
      ),
    );
    if (!await dir.exists()) await dir.create(recursive: true);
    final file = File(p.join(dir.path, _fileName(eventId, rows.first)));
    await file.writeAsString(_csvFor(rows), flush: true);
    return file.path;
  }

  static String _csvFor(List<LocationCaptureRow> rows) {
    final buffer = StringBuffer()..writeln(csvHeader);
    for (final row in rows) {
      buffer.writeln(row.toCsvLine());
    }
    return buffer.toString();
  }

  static String _fileName(String eventId, LocationCaptureRow first) {
    final slug = eventId.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
    return 'geolocation_${slug}_${first.dayKey}.csv';
  }
}
