import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/services/api_client.dart';
import 'location_capture_db.dart';

/// Outcome of one sync attempt for one event.
class LocationSyncResult {
  const LocationSyncResult({
    required this.uploaded,
    required this.csvPath,
    this.error,
  });

  /// Rows the server accepted (0 when there was nothing pending).
  final int uploaded;

  /// Where the CSV copy sits on the device — written even when the upload
  /// fails, so the trail survives offline until the next attempt.
  final String? csvPath;

  final String? error;

  bool get succeeded => error == null;
}

/// Turns pending SQLite captures into the server's CSV and pushes it.
///
/// Flow: pending rows → CSV text → saved under
/// `<app documents>/geolocation/<event>_<yyyy-MM-dd>.csv` → multipart upload
/// → rows flipped to synced. Any failure after the file is written leaves the
/// rows pending and the file on disk, so a later "Sync" simply retries.
class LocationSyncService {
  LocationSyncService({ApiClient? apiClient, LocationCaptureDb? db})
    : _api = apiClient ?? ApiClient(),
      _db = db ?? LocationCaptureDb.instance;

  /// Upload columns — the daily on-device file adds `event_id` after these.
  static const csvHeader = 'time,latitude,longitude,accuracy_m,in_area';

  /// Server endpoint that ingests one event's CSV for the signed-in
  /// volunteer. Not built on the NestJS side yet — until it is, the request
  /// fails and rows stay pending, which is the same path as being offline.
  static const syncPath = '/attendance/geofence/mobile/sync';

  final ApiClient _api;
  final LocationCaptureDb _db;

  /// Uploads the event's pending rows. With [resync], and nothing pending,
  /// the whole trail is sent again — the manual button on the sync sheet, so
  /// the volunteer never has to wait on an automatic push.
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

  /// Writes (or rewrites) the event's upload CSV under
  /// `<app documents>/geolocation/uploads/` — separate from the daily logs.
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
