// Unit tests for event sync — pushing the geofence coordinates a joined
// event recorded on the phone up to the server, so attendance can be
// validated:
//
//   POST /v1/attendance/geofence/mobile/coordinates  LocationSyncService.submitLive
//   POST /v1/attendance/geofence/mobile/sync         LocationSyncService.syncEvent
//                                                    LocationSyncService.syncPending
//   LocationCaptureRow / LocationCaptureStats / LocationSyncResult
//   EventLocationTracker.stateFor                    what the sheet's header shows
//   showEventSyncSheet                               status rows, Area, Sync button
//
// The captures live in SQLite on a real phone. Here the sqflite platform
// channel is answered by an in-memory table, the network is package:http's
// MockClient (through `http.runWithClient` for the sheet, which builds its own
// service), and the documents folder points at a temp directory. Every event,
// volunteer and coordinate is a local fixture — nothing reaches a server.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_location_tracker.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/data/location_capture_db.dart';
import 'package:mobile/features/dashboard/data/location_sync_service.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/utils/geo_utils.dart';
import 'package:mobile/features/dashboard/widgets/event_sync_sheet.dart';
import 'package:sqflite/sqflite.dart' as sqflite;

const _origin = 'http://api.test';
const _syncPath = '/v1/attendance/geofence/mobile/sync';
const _livePath = '/v1/attendance/geofence/mobile/coordinates';

const _email = 'juan.delacruz@uclm.edu.ph';
const _otherEmail = 'maria.santos@uclm.edu.ph';
const _eventId = 'event-42';
const _title = 'Coastal Clean-up Drive';

/// path_provider's channel — where the CSV copy's documents folder comes from.
const _pathProvider = MethodChannel('plugins.flutter.io/path_provider');

const _venueLat = 10.3297;
const _venueLng = 123.9496;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

CaresEvent _event({String id = _eventId, bool completed = false}) => CaresEvent(
  id: id,
  title: _title,
  organization: 'UCLM CARES Office',
  date: DateTime(2031, 3, 14),
  time: '8:00 AM',
  location: 'Looc Seawall, Mandaue City',
  description: 'Help clear the shoreline of plastic waste.',
  slotsLeft: 10,
  daysUntil: 30,
  capacityFilled: 0.8,
  category: 'Environment',
  tags: const [],
  registeredCount: 40,
  totalCapacity: 50,
  requirements: const [],
  venueLatitude: _venueLat,
  venueLongitude: _venueLng,
  isCompleted: completed,
);

EventParticipation _participation(
  CaresEvent event, {
  String email = _email,
  DateTime? registeredAt,
}) => EventParticipation(
  event: event,
  participantEmail: email,
  participantName: 'Juan Dela Cruz',
  registeredAt: registeredAt ?? DateTime(2031, 3, 1, 9, 5),
);

/// One second of the clean-up drive, 8:00:00 AM local on March 14, 2031.
DateTime _at(int second) => DateTime(2031, 3, 14, 8, 0, second);

LocationCaptureRow _fix({
  required DateTime at,
  String eventId = _eventId,
  String email = _email,
  double lat = _venueLat,
  double lng = _venueLng,
  double accuracy = 8.4,
  bool inArea = true,
  bool synced = false,
}) => LocationCaptureRow(
  eventId: eventId,
  eventTitle: _title,
  participantEmail: email,
  capturedAt: at,
  latitude: lat,
  longitude: lng,
  accuracyMeters: accuracy,
  inArea: inArea,
  synced: synced,
);

// ---------------------------------------------------------------------------
// In-memory SQLite (answers the sqflite platform channel)
// ---------------------------------------------------------------------------

/// Stands in for the phone's `cares_geofence.db`. It answers the handful of
/// statements [LocationCaptureDb] sends for captures — filtered selects, the
/// per-event stats, the pending-events group and the batched "mark synced"
/// update — against a plain list of rows.
class _FakeSqlite {
  static const channel = MethodChannel('com.tekartik.sqflite');

  final List<Map<String, Object?>> rows = [];
  var _nextId = 1;

  /// Ids passed to each `UPDATE … WHERE id IN (…)`, one entry per statement.
  final List<List<int>> updateBatches = [];

  void reset() {
    rows.clear();
    updateBatches.clear();
  }

  int add(LocationCaptureRow row) {
    final id = _nextId++;
    rows.add({...row.toMap(), 'id': id});
    return id;
  }

  void addAll(Iterable<LocationCaptureRow> fixes) => fixes.forEach(add);

  List<Map<String, Object?>> rowsFor(String eventId) =>
      rows.where((r) => r['event_id'] == eventId).toList();

  int pendingCount([String eventId = _eventId]) =>
      rowsFor(eventId).where((r) => r['synced'] == 0).length;

  Future<Object?> handle(MethodCall call) async {
    final args = Map<String, Object?>.from(
      (call.arguments as Map?) ?? const {},
    );
    final sql = (args['sql'] as String?) ?? '';
    final params = List<Object?>.from((args['arguments'] as List?) ?? const []);
    switch (call.method) {
      case 'getDatabasesPath':
        return '/fake/databases';
      case 'openDatabase':
        return {'id': 1};
      case 'closeDatabase':
      case 'execute':
        return null;
      case 'query':
        return _query(sql, params);
      case 'update':
        return _update(sql, params);
      case 'insert':
        return null;
      case 'batch':
        final results = <Object?>[];
        for (final raw in (args['operations'] as List)) {
          final op = Map<String, Object?>.from(raw as Map);
          final opSql = op['sql'] as String;
          final opArgs = List<Object?>.from((op['arguments'] as List?) ?? []);
          results.add({
            'result': switch (op['method']) {
              'update' => _update(opSql, opArgs),
              'query' => _query(opSql, opArgs),
              _ => null,
            },
          });
        }
        return args['noResult'] == true ? null : results;
    }
    return null;
  }

  static Map<String, Object?> _result(
    List<String> columns,
    List<List<Object?>> values,
  ) => {'columns': columns, 'rows': values};

  Object _query(String sql, List<Object?> params) {
    if (sql.contains('PRAGMA user_version')) {
      // Already at the current schema — no onCreate / onUpgrade.
      return _result(
        ['user_version'],
        [
          [5],
        ],
      );
    }
    if (!sql.contains('location_captures')) {
      return _result(['value'], []); // tracker_state, joined_events
    }

    if (sql.contains('COUNT(*) AS total')) {
      final match = rows
          .where(
            (r) =>
                r['event_id'] == params[0] &&
                r['participant_email'] == params[1],
          )
          .toList();
      if (match.isEmpty) {
        return _result(
          ['total', 'pending', 'in_area', 'first_at', 'last_at'],
          [
            [0, null, null, null, null],
          ],
        );
      }
      final times = match.map((r) => r['captured_at'] as int).toList()..sort();
      return _result(
        ['total', 'pending', 'in_area', 'first_at', 'last_at'],
        [
          [
            match.length,
            match.where((r) => r['synced'] == 0).length,
            match.fold<int>(0, (sum, r) => sum + (r['in_area'] as int)),
            times.first,
            times.last,
          ],
        ],
      );
    }

    if (sql.contains('GROUP BY event_id')) {
      final ids = <String>[];
      for (final r in rows) {
        if (r['participant_email'] == params[0] &&
            r['synced'] == 0 &&
            !ids.contains(r['event_id'])) {
          ids.add(r['event_id'] as String);
        }
      }
      return _result(
        ['event_id', 'event_title'],
        [
          for (final id in ids) [id, _title],
        ],
      );
    }

    // Plain SELECT * … WHERE a = ? AND b = 0 ORDER BY captured_at … LIMIT n
    var match = List<Map<String, Object?>>.of(rows);
    final where = RegExp(
      r'WHERE (.+?)(?: ORDER BY| LIMIT|$)',
    ).firstMatch(sql)?.group(1);
    if (where != null) {
      var next = 0;
      for (final term in where.split(' AND ')) {
        final m = RegExp(r'(\w+) = (\S+)').firstMatch(term.trim())!;
        final column = m.group(1)!;
        final Object? want = m.group(2) == '?'
            ? params[next++]
            : int.parse(m.group(2)!);
        match = match.where((r) => r[column] == want).toList();
      }
    }
    final order = RegExp(r'ORDER BY (\w+) (ASC|DESC)').firstMatch(sql);
    if (order != null) {
      final column = order.group(1)!;
      match.sort((a, b) => (a[column] as int).compareTo(b[column] as int));
      if (order.group(2) == 'DESC') match = match.reversed.toList();
    }
    final limit = RegExp(r'LIMIT (\d+)').firstMatch(sql);
    if (limit != null) match = match.take(int.parse(limit.group(1)!)).toList();

    const columns = [
      'id',
      'event_id',
      'event_title',
      'participant_email',
      'captured_at',
      'day',
      'latitude',
      'longitude',
      'accuracy_m',
      'in_area',
      'synced',
    ];
    return _result(columns, [
      for (final r in match) [for (final c in columns) r[c]],
    ]);
  }

  int _update(String sql, List<Object?> params) {
    expect(sql, contains('UPDATE location_captures SET synced = ?'));
    final value = params.first;
    final ids = params.skip(1).cast<int>().toList();
    updateBatches.add(ids);
    var changed = 0;
    for (final r in rows) {
      if (ids.contains(r['id'])) {
        r['synced'] = value;
        changed++;
      }
    }
    return changed;
  }
}

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

class _Server {
  /// Overrides the reply to a CSV upload; null accepts it.
  Future<http.Response> Function(http.Request request)? onSync;

  /// Overrides the reply to a live fix; null accepts it.
  Future<http.Response> Function(http.Request request)? onLive;

  final List<http.Request> requests = [];

  List<http.Request> to(String path) =>
      requests.where((r) => r.url.path == path).toList();

  http.Client client() => MockClient((request) async {
    requests.add(request);
    if (request.url.path == _syncPath) {
      final custom = onSync;
      if (custom != null) return custom(request);
      return _ok({'accepted': true});
    }
    if (request.url.path == _livePath) {
      final custom = onLive;
      if (custom != null) return custom(request);
      return _ok({'accepted': true});
    }
    return _fail(404, 'Not found');
  });

  LocationSyncService service() =>
      LocationSyncService(apiClient: ApiClient(client: client()));
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok(Map<String, dynamic> data) =>
    _json(200, {'ok': true, 'message': 'OK', 'data': data});

http.Response _fail(int status, String message) =>
    _json(status, {'ok': false, 'message': message});

/// One part of a captured multipart/form-data body.
class _Part {
  _Part(this.headers, this.content);

  final Map<String, String> headers;
  final String content;

  String get _disposition => headers['content-disposition'] ?? '';
  String? get name => RegExp(r'name="([^"]*)"').firstMatch(_disposition)?[1];
  String? get filename =>
      RegExp(r'filename="([^"]*)"').firstMatch(_disposition)?[1];
}

List<_Part> _partsOf(http.Request request) {
  final contentType = request.headers['content-type'] ?? '';
  expect(contentType, startsWith('multipart/form-data'));
  final boundary = RegExp(r'boundary=(.+)$').firstMatch(contentType)![1]!;

  final raw = utf8.decode(request.bodyBytes, allowMalformed: true);
  final parts = <_Part>[];
  for (final chunk in raw.split('--$boundary')) {
    final split = chunk.indexOf('\r\n\r\n');
    if (split < 0) continue;
    final headers = <String, String>{};
    for (final line in chunk.substring(0, split).split('\r\n')) {
      final colon = line.indexOf(':');
      if (colon < 0) continue;
      headers[line.substring(0, colon).trim().toLowerCase()] = line
          .substring(colon + 1)
          .trim();
    }
    var content = chunk.substring(split + 4);
    if (content.endsWith('\r\n')) {
      content = content.substring(0, content.length - 2);
    }
    parts.add(_Part(headers, content));
  }
  return parts;
}

Map<String, String> _fieldsOf(http.Request request) => {
  for (final part in _partsOf(request))
    if (part.filename == null) part.name!: part.content,
};

_Part _csvPartOf(http.Request request) =>
    _partsOf(request).singleWhere((p) => p.filename != null);

/// The CSV lines sent for these fixes, header first.
List<String> _csvLines(Iterable<LocationCaptureRow> fixes) => [
  LocationSyncService.csvHeader,
  for (final f in fixes) f.toCsvLine(),
];

List<String> _linesOf(String csv) =>
    const LineSplitter().convert(csv).where((l) => l.isNotEmpty).toList();

// ---------------------------------------------------------------------------
// Sheet harness
// ---------------------------------------------------------------------------

Finder _button(String label) => find.ancestor(
  of: find.text(label),
  matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
);

bool _enabled(WidgetTester tester, String label) =>
    tester.widget<ButtonStyleButton>(_button(label)).onPressed != null;

/// The value shown next to a status row label (Registered, Area, …).
String _row(WidgetTester tester, String label) {
  final row = find.ancestor(of: find.text(label), matching: find.byType(Row));
  final texts = tester
      .widgetList<Text>(
        find.descendant(of: row.first, matching: find.byType(Text)),
      )
      .map((t) => t.data)
      .where((t) => t != label)
      .toList();
  return texts.single!;
}

Color? _rowColor(WidgetTester tester, String label) {
  final value = _row(tester, label);
  return tester.widget<Text>(find.text(value)).style?.color;
}

/// Opens the sync sheet from a launcher, the way the event details screen
/// does, then waits for the first read of the captures.
Future<void> _openSheet(
  WidgetTester tester, {
  CaresEvent? event,
  EventParticipation? participation,
}) async {
  tester.view.physicalSize = const Size(900, 1800);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  final e = event ?? _event();
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () => showEventSyncSheet(
                context,
                event: e,
                participation: participation ?? _participation(e),
              ),
              child: const Text('Open sync'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open sync'));
  await tester.pumpAndSettle();
}

/// Lets a held server reply through and the sheet re-read the captures.
Future<void> _release(
  WidgetTester tester,
  Completer<http.Response> reply,
  http.Response response,
) async {
  reply.complete(response);
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final db = _FakeSqlite();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  setUpAll(() {
    // Tests don't register plugins, so point sqflite at its channel factory
    // and answer that channel in memory.
    sqflite.databaseFactory = sqflite.databaseFactorySqflitePlugin;
    messenger.setMockMethodCallHandler(_FakeSqlite.channel, db.handle);
  });

  tearDownAll(() {
    messenger.setMockMethodCallHandler(_FakeSqlite.channel, null);
  });

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    db.reset();
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  // -------------------------------------------------------------------------
  // Live submit
  // -------------------------------------------------------------------------

  group('LocationSyncService.submitLive', () {
    test(
      'posts one fix as JSON to the coordinates endpoint with the token',
      () async {
        AuthSession.setAccessToken('jwt.volunteer');
        final server = _Server();
        final fix = _fix(at: _at(1), accuracy: 6.5, inArea: false);

        final ok = await server.service().submitLive(fix);

        expect(ok, isTrue);
        final request = server.to(_livePath).single;
        expect(request.method, 'POST');
        expect(request.url.toString(), '$_origin$_livePath');
        expect(request.headers['authorization'], 'Bearer jwt.volunteer');
        expect(request.headers['content-type'], startsWith('application/json'));
        expect(jsonDecode(request.body), {
          'eventId': _eventId,
          'capturedAt': _at(1).toUtc().toIso8601String(),
          'latitude': _venueLat,
          'longitude': _venueLng,
          'accuracyMeters': 6.5,
          'inArea': false,
        });
      },
    );

    test('returns false when the server refuses the fix', () async {
      final server = _Server()
        ..onLive = (_) async => _fail(503, 'Geofence ingest offline.');

      expect(await server.service().submitLive(_fix(at: _at(1))), isFalse);
    });

    test('returns false when the phone is offline', () async {
      final service = LocationSyncService(
        apiClient: ApiClient(
          client: MockClient(
            (_) async => throw const SocketException('offline'),
          ),
        ),
      );

      expect(await service.submitLive(_fix(at: _at(1))), isFalse);
    });

    test('never stores anything itself — the recorder keeps the row', () async {
      final server = _Server()..onLive = (_) async => _fail(500, 'Boom');

      await server.service().submitLive(_fix(at: _at(1)));

      expect(db.rows, isEmpty);
    });
  });

  // -------------------------------------------------------------------------
  // Event CSV upload
  // -------------------------------------------------------------------------

  group('LocationSyncService.syncEvent', () {
    test('uploads the pending rows as one CSV with the event fields', () async {
      AuthSession.setAccessToken('jwt.volunteer');
      final fixes = [
        _fix(at: _at(1)),
        _fix(at: _at(2), inArea: false, lat: 10.3352, accuracy: 12.6),
        _fix(at: _at(3)),
      ];
      db.addAll(fixes);
      final server = _Server();

      final result = await server.service().syncEvent(
        eventId: _eventId,
        email: _email,
      );

      expect(result.succeeded, isTrue);
      expect(result.error, isNull);
      expect(result.uploaded, 3);

      final request = server.to(_syncPath).single;
      expect(request.method, 'POST');
      expect(request.url.toString(), '$_origin$_syncPath');
      expect(request.headers['authorization'], 'Bearer jwt.volunteer');
      expect(_fieldsOf(request), {
        'eventId': _eventId,
        'capturedFrom': _at(1).toUtc().toIso8601String(),
        'capturedTo': _at(3).toUtc().toIso8601String(),
        'rowCount': '3',
      });

      final csv = _csvPartOf(request);
      expect(csv.name, 'file');
      expect(csv.filename, 'geolocation_event-42_2031-03-14.csv');
      expect(csv.headers['content-type'], 'text/csv; charset=utf-8');
      expect(_linesOf(csv.content), _csvLines(fixes));
    });

    test('flips the uploaded rows to synced', () async {
      db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);

      await _Server().service().syncEvent(eventId: _eventId, email: _email);

      expect(db.pendingCount(), 0);
      expect(db.rows.map((r) => r['synced']), everyElement(1));
    });

    test('sends only rows still pending, oldest first', () async {
      db.addAll([
        _fix(at: _at(1), synced: true),
        _fix(at: _at(4)),
        _fix(at: _at(2), synced: true),
        _fix(at: _at(3)),
      ]);
      final server = _Server();

      final result = await server.service().syncEvent(
        eventId: _eventId,
        email: _email,
      );

      expect(result.uploaded, 2);
      final request = server.to(_syncPath).single;
      expect(_fieldsOf(request)['rowCount'], '2');
      expect(
        _fieldsOf(request)['capturedFrom'],
        _at(3).toUtc().toIso8601String(),
      );
      expect(
        _fieldsOf(request)['capturedTo'],
        _at(4).toUtc().toIso8601String(),
      );
      expect(
        _linesOf(_csvPartOf(request).content),
        _csvLines([_fix(at: _at(3)), _fix(at: _at(4))]),
      );
    });

    test('leaves other events and other volunteers alone', () async {
      db.addAll([
        _fix(at: _at(1)),
        _fix(at: _at(2), eventId: 'event-77'),
        _fix(at: _at(3), email: _otherEmail),
      ]);
      final server = _Server();

      final result = await server.service().syncEvent(
        eventId: _eventId,
        email: _email,
      );

      expect(result.uploaded, 1);
      expect(_fieldsOf(server.to(_syncPath).single)['rowCount'], '1');
      expect(db.pendingCount('event-77'), 1);
      expect(
        db.rows.singleWhere(
          (r) => r['participant_email'] == _otherEmail,
        )['synced'],
        0,
      );
    });

    test('matches the volunteer email regardless of case and spaces', () async {
      db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);

      final result = await _Server().service().syncEvent(
        eventId: _eventId,
        email: '  Juan.DelaCruz@UCLM.edu.ph ',
      );

      expect(result.uploaded, 2);
    });

    test(
      'nothing pending: no request, nothing uploaded, still a success',
      () async {
        db.add(_fix(at: _at(1), synced: true));
        final server = _Server();

        final result = await server.service().syncEvent(
          eventId: _eventId,
          email: _email,
        );

        expect(server.requests, isEmpty);
        expect(result.uploaded, 0);
        expect(result.csvPath, isNull);
        expect(result.succeeded, isTrue);
      },
    );

    test('resync with nothing pending re-sends the whole trail', () async {
      final fixes = [
        _fix(at: _at(1), synced: true),
        _fix(at: _at(2), synced: true),
        _fix(at: _at(3), synced: true),
      ];
      db.addAll(fixes);
      final server = _Server();

      final result = await server.service().syncEvent(
        eventId: _eventId,
        email: _email,
        resync: true,
      );

      expect(result.uploaded, 3);
      final request = server.to(_syncPath).single;
      expect(_fieldsOf(request)['rowCount'], '3');
      expect(_linesOf(_csvPartOf(request).content), _csvLines(fixes));
    });

    test(
      'resync still sends only the pending rows when some are pending',
      () async {
        db.addAll([_fix(at: _at(1), synced: true), _fix(at: _at(2))]);
        final server = _Server();

        final result = await server.service().syncEvent(
          eventId: _eventId,
          email: _email,
          resync: true,
        );

        expect(result.uploaded, 1);
        expect(_fieldsOf(server.to(_syncPath).single)['rowCount'], '1');
      },
    );

    test('resync with nothing recorded at all makes no request', () async {
      final server = _Server();

      final result = await server.service().syncEvent(
        eventId: _eventId,
        email: _email,
        resync: true,
      );

      expect(server.requests, isEmpty);
      expect(result.uploaded, 0);
      expect(result.succeeded, isTrue);
    });

    test(
      'a server refusal keeps every row pending and returns its message',
      () async {
        db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);
        final server = _Server()
          ..onSync = (_) async => _fail(422, 'Attendance window is closed.');

        final result = await server.service().syncEvent(
          eventId: _eventId,
          email: _email,
        );

        expect(result.succeeded, isFalse);
        expect(result.error, 'Attendance window is closed.');
        expect(result.uploaded, 0);
        expect(db.pendingCount(), 2);
        expect(db.updateBatches, isEmpty);
      },
    );

    test('an "ok: false" reply counts as a refusal too', () async {
      db.add(_fix(at: _at(1)));
      final server = _Server()
        ..onSync = (_) async =>
            _json(200, {'ok': false, 'message': 'CSV header mismatch.'});

      final result = await server.service().syncEvent(
        eventId: _eventId,
        email: _email,
      );

      expect(result.error, 'CSV header mismatch.');
      expect(db.pendingCount(), 1);
    });

    test('offline: rows stay pending and the error comes back', () async {
      db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);
      final service = LocationSyncService(
        apiClient: ApiClient(
          client: MockClient(
            (_) async => throw const SocketException('offline'),
          ),
        ),
      );

      final result = await service.syncEvent(eventId: _eventId, email: _email);

      expect(result.succeeded, isFalse);
      expect(result.uploaded, 0);
      expect(db.pendingCount(), 2);
      // ApiClient wraps every transport failure in an ApiException, so the
      // service's friendly "No connection — your trail is saved and will sync
      // later." branch is never reached; the developer-facing message wins.
      expect(
        result.error,
        startsWith('Cannot reach API at $_origin$_syncPath'),
      );
    });

    test('a later sync after a refusal uploads the same rows', () async {
      db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);
      final server = _Server()
        ..onSync = (_) async => _fail(503, 'Try again later.');
      final service = server.service();

      final first = await service.syncEvent(eventId: _eventId, email: _email);
      server.onSync = null;
      final second = await service.syncEvent(eventId: _eventId, email: _email);

      expect(first.succeeded, isFalse);
      expect(second.uploaded, 2);
      expect(server.to(_syncPath), hasLength(2));
      expect(
        _csvPartOf(server.to(_syncPath)[0]).content,
        _csvPartOf(server.to(_syncPath)[1]).content,
      );
      expect(db.pendingCount(), 0);
    });

    test('event ids are made file-name safe', () async {
      db.add(_fix(at: _at(1), eventId: 'evt/42 #1'));
      final server = _Server();

      await server.service().syncEvent(eventId: 'evt/42 #1', email: _email);

      final request = server.to(_syncPath).single;
      expect(
        _csvPartOf(request).filename,
        'geolocation_evt_42__1_2031-03-14.csv',
      );
      expect(_fieldsOf(request)['eventId'], 'evt/42 #1');
    });

    test('marks a long trail synced in chunks of 500', () async {
      final start = DateTime(2031, 3, 14, 8);
      db.addAll([
        for (var i = 0; i < 1200; i++)
          _fix(at: start.add(Duration(seconds: i))),
      ]);

      final result = await _Server().service().syncEvent(
        eventId: _eventId,
        email: _email,
      );

      expect(result.uploaded, 1200);
      expect(db.updateBatches.map((ids) => ids.length), [500, 500, 200]);
      expect(db.pendingCount(), 0);
    });

    test('without a documents folder it still uploads from memory', () async {
      db.add(_fix(at: _at(1)));
      final server = _Server();

      final result = await server.service().syncEvent(
        eventId: _eventId,
        email: _email,
      );

      // No path_provider handler in tests: the CSV copy can't be saved.
      expect(result.csvPath, isNull);
      expect(result.uploaded, 1);
      expect(
        _csvPartOf(server.to(_syncPath).single).filename,
        'geolocation_event-42_2031-03-14.csv',
      );
    });

    group('CSV copy on the phone', () {
      late Directory docs;

      setUp(() {
        docs = Directory.systemTemp.createTempSync('cares_event_sync_');
        messenger.setMockMethodCallHandler(_pathProvider, (call) async {
          return call.method == 'getApplicationDocumentsDirectory'
              ? docs.path
              : null;
        });
      });

      tearDown(() {
        messenger.setMockMethodCallHandler(_pathProvider, null);
        if (docs.existsSync()) docs.deleteSync(recursive: true);
      });

      String expectedPath() => [
        docs.path,
        'geolocation',
        'uploads',
        'geolocation_event-42_2031-03-14.csv',
      ].join(Platform.pathSeparator);

      test(
        'is written under geolocation/uploads and matches the upload',
        () async {
          final fixes = [_fix(at: _at(1)), _fix(at: _at(2), inArea: false)];
          db.addAll(fixes);
          final server = _Server();

          final result = await server.service().syncEvent(
            eventId: _eventId,
            email: _email,
          );

          expect(result.csvPath, expectedPath());
          final saved = File(result.csvPath!).readAsStringSync();
          expect(_linesOf(saved), _csvLines(fixes));
          expect(saved, _csvPartOf(server.to(_syncPath).single).content);
        },
      );

      test('survives a failed upload so the trail is kept offline', () async {
        db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);
        final server = _Server()..onSync = (_) async => _fail(503, 'Down.');

        final result = await server.service().syncEvent(
          eventId: _eventId,
          email: _email,
        );

        expect(result.succeeded, isFalse);
        expect(result.csvPath, expectedPath());
        expect(File(expectedPath()).existsSync(), isTrue);
        expect(_linesOf(File(expectedPath()).readAsStringSync()), hasLength(3));
      });

      test('is rewritten, not appended to, on the next attempt', () async {
        db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);
        final server = _Server()..onSync = (_) async => _fail(503, 'Down.');
        final service = server.service();

        await service.syncEvent(eventId: _eventId, email: _email);
        db.add(_fix(at: _at(3)));
        server.onSync = null;
        await service.syncEvent(eventId: _eventId, email: _email);

        final lines = _linesOf(File(expectedPath()).readAsStringSync());
        expect(lines, hasLength(4)); // header + 3 rows, one header only
        expect(
          lines.where((l) => l == LocationSyncService.csvHeader),
          hasLength(1),
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Every pending event
  // -------------------------------------------------------------------------

  group('LocationSyncService.syncPending', () {
    test('uploads one CSV per event that still has pending rows', () async {
      db.addAll([
        _fix(at: _at(1)),
        _fix(at: _at(2)),
        _fix(at: _at(3), eventId: 'event-77'),
        _fix(at: _at(4), eventId: 'event-90', synced: true),
      ]);
      final server = _Server();

      final result = await server.service().syncPending(email: _email);

      expect(result.uploaded, 3);
      expect(result.error, isNull);
      final events = server.to(_syncPath).map((r) => _fieldsOf(r)['eventId']);
      expect(events, unorderedEquals([_eventId, 'event-77']));
      expect(db.rows.map((r) => r['synced']), everyElement(1));
    });

    test('keeps going after one event fails and reports that error', () async {
      db.addAll([
        _fix(at: _at(1), eventId: 'event-77'),
        _fix(at: _at(2)),
        _fix(at: _at(3)),
      ]);
      final server = _Server()
        ..onSync = (request) async =>
            _fieldsOf(request)['eventId'] == 'event-77'
            ? _fail(422, 'Event 77 is closed.')
            : _ok({'accepted': true});

      final result = await server.service().syncPending(email: _email);

      expect(result.uploaded, 2);
      expect(result.error, 'Event 77 is closed.');
      expect(db.pendingCount(), 0);
      expect(db.pendingCount('event-77'), 1);
    });

    test('only touches the signed-in volunteer', () async {
      db.addAll([_fix(at: _at(1), email: _otherEmail)]);
      final server = _Server();

      final result = await server.service().syncPending(email: _email);

      expect(server.requests, isEmpty);
      expect(result.uploaded, 0);
      expect(result.error, isNull);
    });
  });

  // -------------------------------------------------------------------------
  // Models
  // -------------------------------------------------------------------------

  group('LocationCaptureRow', () {
    final row = LocationCaptureRow(
      id: 7,
      eventId: _eventId,
      eventTitle: _title,
      participantEmail: _email,
      capturedAt: DateTime.utc(2031, 3, 14, 0, 0, 5),
      latitude: 10.32971234,
      longitude: 123.9496,
      accuracyMeters: 8.6,
      inArea: false,
    );

    test('CSV line: UTC time, 6-decimal coordinates, whole metres, 0/1', () {
      expect(
        row.toCsvLine(),
        '2031-03-14T00:00:05.000Z,10.329712,123.949600,9,0',
      );
      expect(
        LocationSyncService.csvHeader,
        'time,latitude,longitude,accuracy_m,in_area',
      );
    });

    test('live JSON carries the event id and the UTC time', () {
      expect(row.toLiveJson(), {
        'eventId': _eventId,
        'capturedAt': '2031-03-14T00:00:05.000Z',
        'latitude': 10.32971234,
        'longitude': 123.9496,
        'accuracyMeters': 8.6,
        'inArea': false,
      });
    });

    test('round-trips through its SQLite map, stored as UTC milliseconds', () {
      final map = row.toMap();
      expect(
        map['captured_at'],
        DateTime.utc(2031, 3, 14, 0, 0, 5).millisecondsSinceEpoch,
      );
      expect(map['in_area'], 0);
      expect(map['synced'], 0);

      final back = LocationCaptureRow.fromMap(map);
      expect(back.id, 7);
      expect(back.capturedAt.isUtc, isFalse);
      expect(back.capturedAt.isAtSameMomentAs(row.capturedAt), isTrue);
      expect(back.latitude, row.latitude);
      expect(back.inArea, isFalse);
      expect(back.synced, isFalse);
    });

    test('a new row has no id in its map', () {
      expect(_fix(at: _at(1)).toMap().containsKey('id'), isFalse);
    });

    test('day key and time label use the local clock, zero-padded', () {
      final fix = _fix(at: DateTime(2031, 3, 4, 7, 5, 9));
      expect(fix.dayKey, '2031-03-04');
      expect(fix.timeLabel, '07:05:09');
    });

    test('copyWith flips synced and keeps everything else', () {
      final synced = row.copyWith(synced: true);
      expect(synced.synced, isTrue);
      expect(synced.id, 7);
      expect(synced.toCsvLine(), row.toCsvLine());
      expect(row.copyWith().synced, isFalse);
    });

    test('toCapture rounds the accuracy for the records screen', () {
      final capture = _fix(
        at: DateTime(2031, 3, 14, 8, 0, 1),
        accuracy: 12.5,
      ).toCapture();
      expect(capture.time, '08:00:01');
      expect(capture.accuracyMeters, 13);
      expect(capture.inArea, isTrue);
    });
  });

  group('LocationCaptureStats / LocationSyncResult', () {
    test('synced is what is not pending', () {
      const stats = LocationCaptureStats(total: 10, pending: 4, inArea: 7);
      expect(stats.synced, 6);
      expect(LocationCaptureStats.empty.total, 0);
      expect(LocationCaptureStats.empty.synced, 0);
      expect(LocationCaptureStats.empty.lastCapturedAt, isNull);
    });

    test('a result succeeds exactly when it has no error', () {
      expect(
        const LocationSyncResult(uploaded: 3, csvPath: null).succeeded,
        isTrue,
      );
      expect(
        const LocationSyncResult(
          uploaded: 0,
          csvPath: 'x.csv',
          error: 'Down',
        ).succeeded,
        isFalse,
      );
    });

    test(
      'LocationCaptureDb.statsForEvent counts pending and in-area rows',
      () async {
        db.addAll([
          _fix(at: _at(3), synced: true),
          _fix(at: _at(1), inArea: false),
          _fix(at: _at(2)),
          _fix(at: _at(9), eventId: 'event-77'),
        ]);

        final stats = await LocationCaptureDb.instance.statsForEvent(
          _eventId,
          'JUAN.DELACRUZ@uclm.edu.ph',
        );

        expect(stats.total, 3);
        expect(stats.pending, 2);
        expect(stats.inArea, 2);
        expect(stats.firstCapturedAt, _at(1));
        expect(stats.lastCapturedAt, _at(3));
      },
    );

    test('statsForEvent with nothing recorded is empty', () async {
      final stats = await LocationCaptureDb.instance.statsForEvent(
        _eventId,
        _email,
      );
      expect(stats.total, 0);
      expect(stats.lastCapturedAt, isNull);
    });
  });

  group('EventLocationTracker.stateFor', () {
    final tracker = EventLocationTracker.instance;

    test('a completed event has ended', () {
      expect(
        tracker.stateFor(_event(completed: true), now: DateTime(2031, 3, 1)),
        EventTrackingState.ended,
      );
    });

    test('an event past its end time has ended, even if not closed out', () {
      final event = _event(); // 8:00 AM + 4 h default
      expect(
        tracker.stateFor(event, now: DateTime(2031, 3, 14, 12)),
        EventTrackingState.ended,
      );
      expect(
        tracker.stateFor(event, now: DateTime(2031, 3, 14, 11, 59)),
        isNot(EventTrackingState.ended),
      );
    });

    test('a running event while recording is not activated is inactive', () {
      expect(tracker.isActivated, isFalse);
      expect(
        tracker.stateFor(_event(), now: DateTime(2031, 3, 14, 9)),
        EventTrackingState.inactive,
      );
    });

    test('labels', () {
      expect(EventTrackingState.recording.label, 'Recording');
      expect(EventTrackingState.blocked.label, 'Location off');
      expect(EventTrackingState.inactive.label, 'Inactive');
      expect(EventTrackingState.ended.label, 'Ended');
    });
  });

  // -------------------------------------------------------------------------
  // Sync sheet
  // -------------------------------------------------------------------------

  group('showEventSyncSheet', () {
    // No documents folder on the test device: the sheet's upload goes out
    // from memory. (Unanswered, the lookup would wait on the real event loop
    // and stall the fake clock.)
    setUp(() {
      messenger.setMockMethodCallHandler(_pathProvider, (_) async => null);
    });

    tearDown(() {
      messenger.setMockMethodCallHandler(_pathProvider, null);
    });

    Future<void> withNetwork(_Server server, Future<void> Function() body) =>
        http.runWithClient(body, server.client);

    testWidgets('ended event with nothing recorded', (tester) async {
      await _openSheet(tester, event: _event(completed: true));

      expect(find.text('Event Ended'), findsOneWidget);
      expect(
        find.text('Sync your trail so attendance can be validated.'),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.flag_rounded), findsOneWidget);
      expect(_row(tester, 'Area'), '—');
      expect(_row(tester, 'Captured'), '—');
      expect(_row(tester, 'Pending'), 'All synced');
      expect(_row(tester, 'Last fix'), '—');
      expect(
        _row(tester, 'Recording'),
        'Every second while you have a joined event',
      );
      expect(_enabled(tester, 'Nothing recorded yet'), isFalse);
    });

    testWidgets('upcoming event before recording is activated', (tester) async {
      await _openSheet(tester);

      expect(find.text('Recording Paused'), findsOneWidget);
      expect(
        find.text('Recording turns on automatically once you join an event.'),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.pause_circle_outline_rounded), findsOneWidget);
      expect(_row(tester, 'Area'), 'Checking your location...');
      expect(_rowColor(tester, 'Area'), AppColors.textMuted);
    });

    testWidgets('shows when the volunteer registered and the last fix', (
      tester,
    ) async {
      db.addAll([_fix(at: DateTime(2031, 3, 14, 13, 7)), _fix(at: _at(1))]);
      final event = _event(completed: true);

      await _openSheet(
        tester,
        event: event,
        participation: _participation(
          event,
          registeredAt: DateTime(2031, 3, 1, 0, 5),
        ),
      );

      expect(_row(tester, 'Registered'), '3/1/2031 · 12:05 AM');
      expect(_row(tester, 'Last fix'), '3/14/2031 · 1:07 PM');
    });

    testWidgets('counts captures and what is still waiting to upload', (
      tester,
    ) async {
      db.addAll([
        _fix(at: _at(1)),
        _fix(at: _at(2), inArea: false),
        _fix(at: _at(3)),
        _fix(at: _at(4), synced: true),
      ]);

      await _openSheet(tester, event: _event(completed: true));

      expect(_row(tester, 'Captured'), '4 fixes · 3 in area');
      expect(_row(tester, 'Pending'), '3 waiting to upload');
      expect(_rowColor(tester, 'Pending'), AppColors.accentOrange);
      expect(_enabled(tester, 'Sync 3 coordinates'), isTrue);
    });

    testWidgets('everything synced offers a re-sync of the whole trail', (
      tester,
    ) async {
      db.addAll([
        _fix(at: _at(1), synced: true),
        _fix(at: _at(2), synced: true),
      ]);

      await _openSheet(tester, event: _event(completed: true));

      expect(_row(tester, 'Pending'), 'All synced');
      expect(_enabled(tester, 'Re-sync all 2 coordinates'), isTrue);
    });

    testWidgets('ignores other events and other volunteers', (tester) async {
      db.addAll([
        _fix(at: _at(1)),
        _fix(at: _at(2), eventId: 'event-77'),
        _fix(at: _at(3), email: _otherEmail),
      ]);

      await _openSheet(tester, event: _event(completed: true));

      expect(_row(tester, 'Captured'), '1 fixes · 1 in area');
      expect(find.text('Sync 1 coordinates'), findsOneWidget);
    });

    testWidgets('finds the trail whatever case the participant email has', (
      tester,
    ) async {
      db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);
      final event = _event(completed: true);

      await _openSheet(
        tester,
        event: event,
        participation: _participation(
          event,
          email: 'Juan.DelaCruz@UCLM.edu.ph',
        ),
      );

      expect(_row(tester, 'Captured'), '2 fixes · 2 in area');
    });

    testWidgets('a fresh fix at the venue reads "In area"', (tester) async {
      db.add(_fix(at: DateTime.now().subtract(const Duration(seconds: 5))));

      await _openSheet(tester);

      expect(_row(tester, 'Area'), 'In area');
      expect(_rowColor(tester, 'Area'), AppColors.primary);
    });

    testWidgets('a fresh fix outside shows how far away, in m or km', (
      tester,
    ) async {
      const nearLat = _venueLat + 0.006;
      db.add(
        _fix(
          at: DateTime.now().subtract(const Duration(seconds: 5)),
          lat: nearLat,
          inArea: false,
        ),
      );
      final near = GeoUtils.distanceInMeters(
        fromLatitude: nearLat,
        fromLongitude: _venueLng,
        toLatitude: _venueLat,
        toLongitude: _venueLng,
      );
      expect(near, inInclusiveRange(500, 999));

      await _openSheet(tester);

      expect(_row(tester, 'Area'), 'Outside the area · ${near.round()} m away');
      expect(_rowColor(tester, 'Area'), AppColors.accentOrange);

      // Move the latest fix 2 km out.
      db.add(
        _fix(
          at: DateTime.now().subtract(const Duration(seconds: 1)),
          lat: _venueLat + 0.02,
          inArea: false,
        ),
      );
      await tester.pump(const Duration(seconds: 5));
      await tester.pump();

      expect(_row(tester, 'Area'), 'Outside the area · 2.2 km away');
    });

    testWidgets('a fix older than a minute no longer says where you are', (
      tester,
    ) async {
      db.add(_fix(at: DateTime.now().subtract(const Duration(minutes: 2))));

      await _openSheet(tester);

      expect(_row(tester, 'Area'), 'Checking your location...');
    });

    testWidgets('an ended event shows no Area even with a fresh fix', (
      tester,
    ) async {
      db.add(_fix(at: DateTime.now().subtract(const Duration(seconds: 5))));

      await _openSheet(tester, event: _event(completed: true));

      expect(_row(tester, 'Area'), '—');
    });

    testWidgets('Area uses the latest fix even if tagged to another event', (
      tester,
    ) async {
      db.add(
        _fix(
          at: DateTime.now().subtract(const Duration(seconds: 3)),
          eventId: 'event-77',
        ),
      );

      await _openSheet(tester);

      expect(_row(tester, 'Area'), 'In area');
      expect(_row(tester, 'Captured'), '—'); // stats stay per event
    });

    testWidgets('refreshes the counts every 5 seconds while open', (
      tester,
    ) async {
      await _openSheet(tester, event: _event(completed: true));
      expect(_row(tester, 'Captured'), '—');

      db.addAll([_fix(at: _at(1)), _fix(at: _at(2), inArea: false)]);
      await tester.pump(const Duration(seconds: 4));
      expect(_row(tester, 'Captured'), '—');

      await tester.pump(const Duration(seconds: 1));
      await tester.pump();
      expect(_row(tester, 'Captured'), '2 fixes · 1 in area');
      expect(find.text('Sync 2 coordinates'), findsOneWidget);
    });

    testWidgets('Sync uploads the pending rows and reports how many', (
      tester,
    ) async {
      final reply = Completer<http.Response>();
      final server = _Server()..onSync = (_) => reply.future;
      final fixes = [_fix(at: _at(1)), _fix(at: _at(2)), _fix(at: _at(3))];
      db.addAll(fixes);

      await withNetwork(server, () async {
        await _openSheet(tester, event: _event(completed: true));
        await tester.tap(_button('Sync 3 coordinates'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 50));

        // In flight: spinner, disabled.
        expect(find.text('Syncing...'), findsOneWidget);
        expect(_enabled(tester, 'Syncing...'), isFalse);
        expect(find.byType(CircularProgressIndicator), findsOneWidget);

        final request = server.to(_syncPath).single;
        expect(_fieldsOf(request)['eventId'], _eventId);
        expect(_fieldsOf(request)['rowCount'], '3');
        expect(_linesOf(_csvPartOf(request).content), _csvLines(fixes));

        await _release(tester, reply, _ok({'accepted': true}));
      });

      expect(find.text('3 coordinates synced.'), findsOneWidget);
      expect(_row(tester, 'Pending'), 'All synced');
      expect(_enabled(tester, 'Re-sync all 3 coordinates'), isTrue);
      expect(db.pendingCount(), 0);
    });

    testWidgets('Re-sync sends the whole trail again', (tester) async {
      final server = _Server();
      db.addAll([
        _fix(at: _at(1), synced: true),
        _fix(at: _at(2), synced: true),
      ]);

      await withNetwork(server, () async {
        await _openSheet(tester, event: _event(completed: true));
        await tester.tap(_button('Re-sync all 2 coordinates'));
        await tester.pumpAndSettle();
      });

      expect(_fieldsOf(server.to(_syncPath).single)['rowCount'], '2');
      expect(find.text('2 coordinates synced.'), findsOneWidget);
    });

    testWidgets('a refusal shows the server message and keeps rows pending', (
      tester,
    ) async {
      final server = _Server()
        ..onSync = (_) async => _fail(422, 'Attendance window is closed.');
      db.addAll([_fix(at: _at(1)), _fix(at: _at(2))]);

      await withNetwork(server, () async {
        await _openSheet(tester, event: _event(completed: true));
        await tester.tap(_button('Sync 2 coordinates'));
        await tester.pumpAndSettle();
      });

      final notice = find.text('Attendance window is closed.');
      expect(notice, findsOneWidget);
      expect(tester.widget<Text>(notice).style?.color, AppColors.error);
      expect(_row(tester, 'Pending'), '2 waiting to upload');
      expect(_enabled(tester, 'Sync 2 coordinates'), isTrue);
      expect(db.pendingCount(), 2);
    });

    testWidgets('offline shows the connection error and keeps rows pending', (
      tester,
    ) async {
      db.add(_fix(at: _at(1)));

      await http.runWithClient(() async {
        await _openSheet(tester, event: _event(completed: true));
        await tester.tap(_button('Sync 1 coordinates'));
        await tester.pumpAndSettle();
      }, () => MockClient((_) async => throw const SocketException('offline')));

      // See the service test: the friendly "No connection" text never shows.
      expect(find.textContaining('Cannot reach API at'), findsOneWidget);
      expect(_row(tester, 'Pending'), '1 waiting to upload');
      expect(db.pendingCount(), 1);
    });

    testWidgets('a new attempt clears the previous notice', (tester) async {
      final server = _Server()..onSync = (_) async => _fail(503, 'Down.');
      db.add(_fix(at: _at(1)));
      final reply = Completer<http.Response>();

      await withNetwork(server, () async {
        await _openSheet(tester, event: _event(completed: true));
        await tester.tap(_button('Sync 1 coordinates'));
        await tester.pumpAndSettle();
        expect(find.text('Down.'), findsOneWidget);

        server.onSync = (_) => reply.future;
        await tester.tap(_button('Sync 1 coordinates'));
        await tester.pump();
        expect(find.text('Down.'), findsNothing);

        await _release(tester, reply, _ok({'accepted': true}));
      });

      expect(find.text('1 coordinates synced.'), findsOneWidget);
      expect(
        tester.widget<Text>(find.text('1 coordinates synced.')).style?.color,
        AppColors.primary,
      );
    });

    testWidgets('Close dismisses the sheet', (tester) async {
      await _openSheet(tester);
      expect(find.text('Recording Paused'), findsOneWidget);

      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();

      expect(find.text('Recording Paused'), findsNothing);
      expect(find.text('Open sync'), findsOneWidget);
    });
  });
}
