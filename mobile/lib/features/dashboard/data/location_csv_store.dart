import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../domain/location_records.dart';
import 'location_capture_db.dart';

/// The daily CSV files under `<app documents>/geolocation/`.
///
/// One file per local calendar day (`geolocation_yyyy-MM-dd.csv`); every fix
/// the tracker records is appended as one line, header written on first use.
/// Writes are serialised through [_queue] so one-second ticks never
/// interleave inside a line.
class LocationCsvStore {
  LocationCsvStore._();

  static final LocationCsvStore instance = LocationCsvStore._();

  Directory? _dir;
  Future<void> _queue = Future.value();

  Future<Directory> directory() async {
    final cached = _dir;
    if (cached != null) return cached;
    final dir = Directory(
      p.join((await getApplicationDocumentsDirectory()).path, 'geolocation'),
    );
    if (!await dir.exists()) await dir.create(recursive: true);
    return _dir = dir;
  }

  Future<File> fileForDay(String dayKey) async =>
      File(p.join((await directory()).path, 'geolocation_$dayKey.csv'));

  /// Appends one capture to its day's file. Never throws — a failed disk
  /// write must not stop the SQLite recording, which is what gets synced.
  Future<void> append(LocationCaptureRow row) {
    return _queue = _queue.then((_) async {
      try {
        final file = await fileForDay(row.dayKey);
        final isNew = !await file.exists();
        final sink = file.openWrite(mode: FileMode.append);
        if (isNew) sink.writeln(LocationRecords.csvHeader);
        sink.writeln(row.toCsvLine(withEventId: true));
        await sink.flush();
        await sink.close();
      } catch (_) {
        // Documents dir unavailable; the row is still in SQLite.
      }
    });
  }

  /// Size in KB of the day's file, 0 when it doesn't exist.
  Future<double> sizeKbForDay(String dayKey) async {
    try {
      final file = await fileForDay(dayKey);
      if (!await file.exists()) return 0;
      return (await file.length()) / 1024;
    } catch (_) {
      return 0;
    }
  }

  Future<String?> pathForDay(String dayKey) async {
    try {
      final file = await fileForDay(dayKey);
      return await file.exists() ? file.path : null;
    } catch (_) {
      return null;
    }
  }

  Future<void> deleteDay(String dayKey) async {
    await _queue;
    try {
      final file = await fileForDay(dayKey);
      if (await file.exists()) await file.delete();
    } catch (_) {}
  }
}
