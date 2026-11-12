// Unit tests for keeping a person signed in across app restarts:
//
//   AuthSession.start / replaceAccessToken / clear   what is saved, and when
//   SessionRestoreService.restore                     launch-time restore
//     GET  /v1/profile/me/mobile                      the server-side check
//   SignOutService.signOut                            explicit sign-out
//     POST /v1/auth/logout                            server-side revoke
//
// The secure store and preferences are the plugins' in-memory test doubles and
// the network is package:http's MockClient, so nothing leaves the test.

import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/session_storage.dart';
import 'package:mobile/features/auth/data/session_restore_service.dart';
import 'package:mobile/features/auth/data/sign_out_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _origin = 'http://api.test';
const _sessionKey = 'auth.session';
const _installMarkerKey = 'auth.session.install_marker';

const _notificationsChannel = MethodChannel(
  'dexterous.com/flutter/local_notifications',
);

final _now = DateTime.utc(2026, 11, 13, 9);

/// An unsigned JWT whose payload carries [exp]; only `exp` is ever read.
String _jwt({required DateTime exp}) {
  String part(Map<String, dynamic> json) =>
      base64Url.encode(utf8.encode(jsonEncode(json))).replaceAll('=', '');
  return '${part({'alg': 'HS256', 'typ': 'JWT'})}.'
      '${part({'sub': 'usr_123', 'sid': 'sess_1', 'exp': exp.millisecondsSinceEpoch ~/ 1000})}'
      '.signature';
}

StoredSession _session({String? token}) => StoredSession(
  accessToken: token ?? _jwt(exp: _now.add(const Duration(days: 7))),
  roleType: 'VOLUNTEER',
  email: 'juan@uclm.edu.ph',
  firstName: 'Juan',
  hasInterests: true,
);

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

/// Seeds the stores as a previous run of the app would have left them.
void _seedStores({StoredSession? saved, bool installSeen = true}) {
  FlutterSecureStorage.setMockInitialValues({
    if (saved != null) _sessionKey: jsonEncode(saved.toJson()),
  });
  SharedPreferences.setMockInitialValues({
    if (installSeen) _installMarkerKey: true,
  });
}

Future<String?> _savedRaw() =>
    const FlutterSecureStorage().read(key: _sessionKey);

/// Waits for the fire-and-forget writes behind AuthSession to land.
Future<void> _flush() => SessionStorage.instance.read();

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    AndroidFlutterLocalNotificationsPlugin.registerWith();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_notificationsChannel, (_) async => true);
  });

  tearDownAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_notificationsChannel, null);
  });

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    _seedStores();
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  tearDown(() async {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    await _flush();
  });

  group('saving the session', () {
    test('a sign-in is saved to the secure store', () async {
      final session = _session();
      AuthSession.start(session);
      await _flush();

      expect(AuthSession.accessToken, session.accessToken);
      final saved = jsonDecode((await _savedRaw())!) as Map<String, dynamic>;
      expect(saved['access_token'], session.accessToken);
      expect(saved['role_type'], 'VOLUNTEER');
      expect(saved['email'], 'juan@uclm.edu.ph');
    });

    test('a re-issued token replaces the saved one', () async {
      AuthSession.start(_session());
      AuthSession.replaceAccessToken('new.token', email: 'new@uclm.edu.ph');

      final saved = await SessionStorage.instance.read();
      expect(saved!.accessToken, 'new.token');
      expect(saved.email, 'new@uclm.edu.ph');
      expect(saved.roleType, 'VOLUNTEER');
    });

    test('a server-ended session wipes the saved copy', () async {
      AuthSession.start(_session());
      AuthSession.notifySessionEnded('Session ended — please sign in again');
      await _flush();

      expect(AuthSession.isSignedIn, isFalse);
      expect(await _savedRaw(), isNull);
    });
  });

  group('restoring on launch', () {
    SessionRestoreService service(
      Future<http.Response> Function(http.Request) reply, {
      List<http.Request>? log,
    }) {
      return SessionRestoreService(
        apiClient: ApiClient(
          client: MockClient((request) async {
            log?.add(request);
            return reply(request);
          }),
        ),
        clock: () => _now,
      );
    }

    test('nothing saved: no session and no request', () async {
      final log = <http.Request>[];
      final result = await service(
        (_) async => _json(500, {}),
        log: log,
      ).restore();

      expect(result.status, SessionRestoreStatus.none);
      expect(log, isEmpty);
      expect(AuthSession.isSignedIn, isFalse);
    });

    test('a live session is confirmed with the server and restored', () async {
      final saved = _session();
      _seedStores(saved: saved);
      final log = <http.Request>[];

      final result = await service(
        (_) async => _json(200, {
          'ok': true,
          'data': {
            'email': 'juan@uclm.edu.ph',
            'firstname': 'Juan',
            'lastname': 'Dela Cruz',
          },
        }),
        log: log,
      ).restore();

      expect(result.status, SessionRestoreStatus.restored);
      expect(result.session!.lastName, 'Dela Cruz');
      expect(result.session!.roleType, 'VOLUNTEER');
      expect(AuthSession.accessToken, saved.accessToken);
      expect(log.single.method, 'GET');
      expect(log.single.url.toString(), '$_origin/v1/profile/me/mobile');
      expect(
        log.single.headers['Authorization'],
        'Bearer ${saved.accessToken}',
      );
    });

    test('a token past its exp is dropped without asking the server', () async {
      _seedStores(
        saved: _session(
          token: _jwt(exp: _now.subtract(const Duration(minutes: 1))),
        ),
      );
      final log = <http.Request>[];

      final result = await service(
        (_) async => _json(200, {}),
        log: log,
      ).restore();
      await _flush();

      expect(result.status, SessionRestoreStatus.expired);
      expect(result.message, SessionRestoreService.expiredMessage);
      expect(log, isEmpty);
      expect(AuthSession.isSignedIn, isFalse);
      expect(await _savedRaw(), isNull);
    });

    test('a session the server ended (401) goes to login with its message, '
        'without the app-wide redirect', () async {
      _seedStores(saved: _session());
      var redirected = false;
      AuthSession.onSessionEnded = (_) => redirected = true;

      final result = await service(
        (_) async => _json(401, {
          'ok': false,
          'message':
              'Signed out after a period of inactivity — please sign in again',
        }),
      ).restore();
      await _flush();

      expect(result.status, SessionRestoreStatus.expired);
      expect(result.message, contains('inactivity'));
      expect(redirected, isFalse);
      expect(AuthSession.isSignedIn, isFalse);
      expect(await _savedRaw(), isNull);
    });

    test(
      'offline: an in-date session is kept rather than signed out',
      () async {
        final saved = _session();
        _seedStores(saved: saved);

        final result = await service(
          (_) async => throw const SocketException('offline'),
        ).restore();

        expect(result.status, SessionRestoreStatus.restored);
        expect(result.session!.accessToken, saved.accessToken);
        expect(AuthSession.accessToken, saved.accessToken);
        expect(await _savedRaw(), isNotNull);
      },
    );

    test(
      'a keychain entry left from before a reinstall is ignored and wiped',
      () async {
        _seedStores(saved: _session(), installSeen: false);

        final result = await service((_) async => _json(200, {})).restore();

        expect(result.status, SessionRestoreStatus.none);
        expect(await _savedRaw(), isNull);
      },
    );
  });

  group('signing out', () {
    SignOutService service(
      Future<http.Response> Function(http.Request) reply, {
      List<http.Request>? log,
    }) {
      return SignOutService(
        apiClient: ApiClient(
          client: MockClient((request) async {
            log?.add(request);
            return reply(request);
          }),
        ),
      );
    }

    test('revokes the session on the server and wipes the saved one', () async {
      final session = _session();
      AuthSession.start(session);
      final log = <http.Request>[];

      await service(
        (_) async => _json(200, {'ok': true, 'message': 'Signed out'}),
        log: log,
      ).signOut();
      await _flush();

      expect(log.single.method, 'POST');
      expect(log.single.url.toString(), '$_origin/v1/auth/logout');
      expect(
        log.single.headers['Authorization'],
        'Bearer ${session.accessToken}',
      );
      expect(AuthSession.isSignedIn, isFalse);
      expect(await _savedRaw(), isNull);
      expect(await SessionStorage.instance.read(), isNull);
    });

    test('still signs out locally when the server cannot be reached', () async {
      AuthSession.start(_session());

      await service(
        (_) async => throw const SocketException('offline'),
      ).signOut();
      await _flush();

      expect(AuthSession.isSignedIn, isFalse);
      expect(await _savedRaw(), isNull);
    });

    test(
      'an already-ended session (401) does not trigger the app redirect',
      () async {
        AuthSession.start(_session());
        var redirected = false;
        AuthSession.onSessionEnded = (_) => redirected = true;

        await service(
          (_) async => _json(401, {'ok': false, 'message': 'Session ended'}),
        ).signOut();
        await _flush();

        expect(redirected, isFalse);
        expect(AuthSession.isSignedIn, isFalse);
        expect(await _savedRaw(), isNull);
      },
    );
  });

  group('jwtExpiry', () {
    test('reads exp from the payload', () {
      final exp = DateTime.utc(2026, 12, 1);
      expect(jwtExpiry(_jwt(exp: exp)), exp);
    });

    test('is null for anything that is not a JWT with exp', () {
      expect(jwtExpiry('opaque-token'), isNull);
      expect(jwtExpiry('a.b.c'), isNull);
    });
  });
}
