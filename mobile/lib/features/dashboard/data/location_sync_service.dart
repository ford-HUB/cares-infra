import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/services/api_client.dart';
import '../domain/location_records.dart';
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

/// Pushes coordinates to the server — live one fix at a time while online,
/// or as one CSV per event for whatever piled up in SQLite while offline.
///
/// Offline flow: pending rows → CSV text → saved under
/// `<app documents>/geolocation/uploads/<event>_<yyyy-MM-dd>.csv` → multipart
/// upload → rows flipped to synced. Any failure after the file is written
/// leaves the rows pending and the file on disk, so a later "Sync" simply
/// retries.
class LocationSyncService {
  LocationSyncService({ApiClient? apiClient, LocationCaptureDb? db})
    : _api = apiClient ?? ApiClient(),
      _db = db ?? LocationCaptureDb.instance;

  static const csvHeader = LocationRecords.csvHeader;

  /// Server endpoint that ingests one event's CSV for the signed-in
  /// volunteer. Not built on the NestJS side yet — until it is, the request
  /// fails and rows stay pending, which is the same path as being offline.
  static const syncPath = '/attendance/geofence/mobile/sync';

  /// Server endpoint that takes one fix as JSON while the volunteer is
  /// online. Not built on the NestJS side yet either — a failure sends the
  /// fix down the offline path instead.
  static const livePath = '/attendance/geofence/mobile/coordinates';

  /// Short so a slow server can't stack up one-second ticks.
  static const liveTimeout = Duration(seconds: 8);

  final ApiClient _api;
  final LocationCaptureDb _db;

  /// Sends one fix straight to the server. False on any failure — the caller
  /// stores the row locally instead.
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

  /// Uploads every event that still has pending rows. Returns the number of
  /// rows accepted and the first error, if any event failed.
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
