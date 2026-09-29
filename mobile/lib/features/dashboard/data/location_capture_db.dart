import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../domain/location_records.dart';
import '../domain/tracked_event.dart';

/// One GPS fix recorded while a joined event's tracking window was open.
class LocationCaptureRow {
  const LocationCaptureRow({
    this.id,
    required this.eventId,
    required this.eventTitle,
    required this.participantEmail,
    required this.capturedAt,
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.inArea,
    this.synced = false,
  });

  final int? id;
  final String eventId;
  final String eventTitle;
  final String participantEmail;
  final DateTime capturedAt;
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final bool inArea;
  final bool synced;

  Map<String, Object?> toMap() => {
    if (id != null) 'id': id,
    'event_id': eventId,
    'event_title': eventTitle,
    'participant_email': participantEmail,
    'captured_at': capturedAt.toUtc().millisecondsSinceEpoch,
    'day': dayKey,
    'latitude': latitude,
    'longitude': longitude,
    'accuracy_m': accuracyMeters,
    'in_area': inArea ? 1 : 0,
    'synced': synced ? 1 : 0,
  };

  static LocationCaptureRow fromMap(Map<String, Object?> m) =>
      LocationCaptureRow(
        id: m['id'] as int?,
        eventId: m['event_id'] as String,
        eventTitle: m['event_title'] as String,
        participantEmail: m['participant_email'] as String,
        capturedAt: DateTime.fromMillisecondsSinceEpoch(
          m['captured_at'] as int,
          isUtc: true,
        ).toLocal(),
        latitude: (m['latitude'] as num).toDouble(),
        longitude: (m['longitude'] as num).toDouble(),
        accuracyMeters: (m['accuracy_m'] as num).toDouble(),
        inArea: (m['in_area'] as int) == 1,
        synced: (m['synced'] as int) == 1,
      );

  LocationCaptureRow copyWith({bool? synced}) => LocationCaptureRow(
    id: id,
    eventId: eventId,
    eventTitle: eventTitle,
    participantEmail: participantEmail,
    capturedAt: capturedAt,
    latitude: latitude,
    longitude: longitude,
    accuracyMeters: accuracyMeters,
    inArea: inArea,
    synced: synced ?? this.synced,
  );

  /// Local calendar day the fix belongs to (`yyyy-MM-dd`).
  String get dayKey => LocationRecords.dayKeyFor(capturedAt);

  String get timeLabel {
    final t = capturedAt;
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    final ss = t.second.toString().padLeft(2, '0');
    return '$hh:$mm:$ss';
  }

  /// One CSV line in the `time,latitude,longitude,accuracy_m,in_area` shape
  /// the server expects. `time` is the full UTC timestamp so the server can
  /// place the row without guessing the day.
  String toCsvLine() =>
      '${capturedAt.toUtc().toIso8601String()},'
      '${latitude.toStringAsFixed(6)},'
      '${longitude.toStringAsFixed(6)},'
      '${accuracyMeters.round()},'
      '${inArea ? 1 : 0}';

  /// JSON body of one fix for the realtime endpoint.
  Map<String, dynamic> toLiveJson() => {
    'eventId': eventId,
    'capturedAt': capturedAt.toUtc().toIso8601String(),
    'latitude': latitude,
    'longitude': longitude,
    'accuracyMeters': accuracyMeters,
    'inArea': inArea,
  };

  LocationCapture toCapture() => LocationCapture(
    time: timeLabel,
    latitude: latitude,
    longitude: longitude,
    accuracyMeters: accuracyMeters.round(),
    inArea: inArea,
  );
}

/// One calendar day of captures, as grouped for the Geolocation Records list.
class LocationDaySummary {
  const LocationDaySummary({
    required this.dayKey,
    required this.eventTitles,
    required this.total,
    required this.pending,
  });

  final String dayKey;
  final List<String> eventTitles;
  final int total;
  final int pending;
}

/// A joined event that still has rows waiting for the server.
class PendingEventRef {
  const PendingEventRef({required this.eventId, required this.eventTitle});

  final String eventId;
  final String eventTitle;
}

/// Per-event summary used by the sync sheet.
class LocationCaptureStats {
  const LocationCaptureStats({
    required this.total,
    required this.pending,
    required this.inArea,
    this.firstCapturedAt,
    this.lastCapturedAt,
  });

  static const empty = LocationCaptureStats(total: 0, pending: 0, inArea: 0);

  final int total;
  final int pending;
  final int inArea;
  final DateTime? firstCapturedAt;
  final DateTime? lastCapturedAt;

  int get synced => total - pending;
}

/// SQLite-backed store for geofence captures. Rows are appended live while an
/// event runs, flipped to `synced` once their CSV export was accepted by the
/// server, and purged after [retentionDays].
///
/// SQLite rather than a raw CSV file on disk: every fix is an atomic insert
/// (no torn last line on a crash), "unsynced rows for event X" is a query
/// instead of a file rewrite, and the CSV is generated from the rows only at
/// upload time — so the upload format stays exactly the CSV the server wants.
class LocationCaptureDb {
  LocationCaptureDb._();

  static final LocationCaptureDb instance = LocationCaptureDb._();

  static const retentionDays = 30;
  static const _table = 'location_captures';
  static const _stateTable = 'tracker_state';
  static const _joinedTable = 'joined_events';

  Database? _db;

  Future<Database> get _database async {
    final open = _db;
    if (open != null) return open;
    final path = p.join(await getDatabasesPath(), 'cares_geofence.db');
    final db = await openDatabase(
      path,
      version: 4,
      onCreate: (db, _) async {
        await _createStateTable(db);
        await _createJoinedTable(db);
        await db.execute('''
          CREATE TABLE $_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            event_title TEXT NOT NULL,
            participant_email TEXT NOT NULL,
            captured_at INTEGER NOT NULL,
            day TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy_m REAL NOT NULL,
            in_area INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute(
          'CREATE INDEX idx_${_table}_event_synced '
          'ON $_table (event_id, participant_email, synced)',
        );
        await db.execute(
          'CREATE INDEX idx_${_table}_day ON $_table (participant_email, day)',
        );
      },
      onUpgrade: (db, oldVersion, _) async {
        if (oldVersion < 4) await _createJoinedTable(db);
        if (oldVersion < 3) await _createStateTable(db);
        if (oldVersion < 2) {
          await db.execute(
            "ALTER TABLE $_table ADD COLUMN day TEXT NOT NULL DEFAULT ''",
          );
          await db.execute(
            'CREATE INDEX idx_${_table}_day ON $_table (participant_email, day)',
          );
        }
      },
    );
    _db = db;
    return db;
  }

  static Future<void> _createStateTable(Database db) => db.execute(
    'CREATE TABLE IF NOT EXISTS $_stateTable '
    '(key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  );

  /// The joined events the recorder tracks, mirrored from the in-memory
  /// registration store so the background service (and a cold restart) can
  /// read them without the app's UI being alive.
  static Future<void> _createJoinedTable(Database db) => db.execute(
    'CREATE TABLE IF NOT EXISTS $_joinedTable ('
    'event_id TEXT NOT NULL, '
    'participant_email TEXT NOT NULL, '
    'title TEXT NOT NULL, '
    'venue_lat REAL NOT NULL, '
    'venue_lng REAL NOT NULL, '
    'radius_m REAL NOT NULL, '
    'tracking_starts_at INTEGER NOT NULL, '
    'starts_at INTEGER NOT NULL, '
    'ends_at INTEGER NOT NULL, '
    'is_completed INTEGER NOT NULL, '
    'PRIMARY KEY (event_id, participant_email))',
  );

  Future<List<TrackedEvent>> readJoinedEvents(String email) async {
    final db = await _database;
    final rows = await db.query(
      _joinedTable,
      where: 'participant_email = ?',
      whereArgs: [email.trim().toLowerCase()],
      orderBy: 'starts_at ASC',
    );
    return rows.map(TrackedEvent.fromMap).toList();
  }

  Future<void> upsertJoinedEvent(TrackedEvent event, String email) async {
    final db = await _database;
    await db.insert(
      _joinedTable,
      event.toMap(email.trim().toLowerCase()),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> deleteJoinedEvent(String eventId, String email) async {
    final db = await _database;
    await db.delete(
      _joinedTable,
      where: 'event_id = ? AND participant_email = ?',
      whereArgs: [eventId, email.trim().toLowerCase()],
    );
  }

  /// Free-form persisted state shared with the background service
  /// (e.g. the signed-in email, since the service can't read the session).
  Future<String?> readState(String key) async {
    final db = await _database;
    final rows = await db.query(
      _stateTable,
      where: 'key = ?',
      whereArgs: [key],
    );
    return rows.isEmpty ? null : rows.first['value'] as String?;
  }

  Future<void> writeState(String key, String value) async {
    final db = await _database;
    await db.insert(_stateTable, {
      'key': key,
      'value': value,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  /// Persisted "recording is activated" flag, so an app restart while
  /// offline keeps saving until the server can be asked again.
  Future<bool> readActivated() async {
    final db = await _database;
    final rows = await db.query(
      _stateTable,
      where: 'key = ?',
      whereArgs: ['activated'],
    );
    return rows.isNotEmpty && rows.first['value'] == '1';
  }

  Future<void> writeActivated(bool activated) async {
    final db = await _database;
    await db.insert(_stateTable, {
      'key': 'activated',
      'value': activated ? '1' : '0',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> insert(LocationCaptureRow row) async {
    final db = await _database;
    return db.insert(_table, row.toMap());
  }

  Future<List<LocationCaptureRow>> pendingForEvent(
    String eventId,
    String email,
  ) async {
    final db = await _database;
    final rows = await db.query(
      _table,
      where: 'event_id = ? AND participant_email = ? AND synced = 0',
      whereArgs: [eventId, _norm(email)],
      orderBy: 'captured_at ASC',
    );
    return rows.map(LocationCaptureRow.fromMap).toList();
  }

  Future<List<LocationCaptureRow>> allForEvent(
    String eventId,
    String email,
  ) async {
    final db = await _database;
    final rows = await db.query(
      _table,
      where: 'event_id = ? AND participant_email = ?',
      whereArgs: [eventId, _norm(email)],
      orderBy: 'captured_at ASC',
    );
    return rows.map(LocationCaptureRow.fromMap).toList();
  }

  Future<LocationCaptureStats> statsForEvent(
    String eventId,
    String email,
  ) async {
    final db = await _database;
    final result = await db.rawQuery(
      '''
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) AS pending,
             SUM(in_area) AS in_area,
             MIN(captured_at) AS first_at,
             MAX(captured_at) AS last_at
      FROM $_table
      WHERE event_id = ? AND participant_email = ?
      ''',
      [eventId, _norm(email)],
    );
    if (result.isEmpty) return LocationCaptureStats.empty;
    final m = result.first;
    final total = (m['total'] as int?) ?? 0;
    if (total == 0) return LocationCaptureStats.empty;
    DateTime? at(Object? v) => v == null
        ? null
        : DateTime.fromMillisecondsSinceEpoch(v as int, isUtc: true).toLocal();
    return LocationCaptureStats(
      total: total,
      pending: (m['pending'] as int?) ?? 0,
      inArea: (m['in_area'] as int?) ?? 0,
      firstCapturedAt: at(m['first_at']),
      lastCapturedAt: at(m['last_at']),
    );
  }

  /// Days with captures, newest first — one entry per daily CSV.
  Future<List<LocationDaySummary>> daySummaries(String email) async {
    final db = await _database;
    final result = await db.rawQuery(
      '''
      SELECT day,
             COUNT(*) AS total,
             SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) AS pending,
             GROUP_CONCAT(DISTINCT event_title) AS titles
      FROM $_table
      WHERE participant_email = ? AND day <> ''
      GROUP BY day
      ORDER BY day DESC
      ''',
      [_norm(email)],
    );
    return [
      for (final m in result)
        LocationDaySummary(
          dayKey: m['day'] as String,
          eventTitles: ((m['titles'] as String?) ?? '')
              .split(',')
              .where((t) => t.isNotEmpty)
              .toList(),
          total: (m['total'] as int?) ?? 0,
          pending: (m['pending'] as int?) ?? 0,
        ),
    ];
  }

  Future<List<LocationCaptureRow>> rowsForDay(
    String dayKey,
    String email, {
    int? limit,
  }) async {
    final db = await _database;
    final rows = await db.query(
      _table,
      where: 'participant_email = ? AND day = ?',
      whereArgs: [_norm(email), dayKey],
      orderBy: 'captured_at ASC',
      limit: limit,
    );
    return rows.map(LocationCaptureRow.fromMap).toList();
  }

  Future<int> deleteDay(String dayKey, String email) async {
    final db = await _database;
    return db.delete(
      _table,
      where: 'participant_email = ? AND day = ?',
      whereArgs: [_norm(email), dayKey],
    );
  }

  /// Events that still have unsynced rows for this volunteer.
  Future<List<PendingEventRef>> eventsWithPending(String email) async {
    final db = await _database;
    final result = await db.rawQuery(
      '''
      SELECT event_id, MAX(event_title) AS event_title
      FROM $_table
      WHERE participant_email = ? AND synced = 0
      GROUP BY event_id
      ''',
      [_norm(email)],
    );
    return [
      for (final m in result)
        PendingEventRef(
          eventId: m['event_id'] as String,
          eventTitle: (m['event_title'] as String?) ?? '',
        ),
    ];
  }

  Future<void> markSynced(Iterable<int> ids) async {
    final list = ids.toList();
    if (list.isEmpty) return;
    final db = await _database;
    final batch = db.batch();
    // Chunked so a big event doesn't blow SQLite's bound-variable limit.
    const chunk = 500;
    for (var i = 0; i < list.length; i += chunk) {
      final part = list.sublist(
        i,
        i + chunk > list.length ? list.length : i + chunk,
      );
      batch.update(
        _table,
        {'synced': 1},
        where: 'id IN (${List.filled(part.length, '?').join(',')})',
        whereArgs: part,
      );
    }
    await batch.commit(noResult: true);
  }

  /// Drops synced rows older than [retentionDays]. Unsynced rows are kept
  /// regardless of age — they still owe the server a CSV.
  Future<int> purgeExpired() async {
    final db = await _database;
    final cutoff = DateTime.now()
        .toUtc()
        .subtract(const Duration(days: retentionDays))
        .millisecondsSinceEpoch;
    return db.delete(
      _table,
      where: 'synced = 1 AND captured_at < ?',
      whereArgs: [cutoff],
    );
  }

  static String _norm(String email) => email.trim().toLowerCase();
}
