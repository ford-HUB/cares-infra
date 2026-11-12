// Unit tests for every POST the forgot-password flow sends:
//
//   POST /v1/auth/forgot-password    PasswordResetService.requestCode
//   POST /v1/auth/verify-reset-otp   PasswordResetService.verifyCode
//   POST /v1/auth/reset-password     PasswordResetService.resetPassword
//
// The network is replaced with package:http's MockClient, so nothing here
// reaches a real server. Each test records the request it captured and
// replies with a mock `{ ok, message, data }` envelope.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/auth/data/models/password_reset_models.dart';
import 'package:mobile/features/auth/data/password_reset_service.dart';

const _origin = 'http://api.test';
const _email = 'juan@uclm.edu.ph';
const _resetToken = '3f1c2b8e-7a4d-4e8b-9c61-2d5f0a9b7e11';

/// A MockClient that keeps every request so the test can inspect them.
class _Recorder {
  final List<http.Request> requests = [];

  http.Request get last => requests.last;
  int get calls => requests.length;

  ApiClient client(
    Future<http.Response> Function(http.Request request) reply,
  ) {
    return ApiClient(
      client: MockClient((request) async {
        requests.add(request);
        return reply(request);
      }),
    );
  }

  Map<String, dynamic> bodyOf(http.Request request) =>
      jsonDecode(request.body) as Map<String, dynamic>;

  Map<String, dynamic> get body => bodyOf(last);
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok(Map<String, dynamic> data, {String message = 'OK'}) =>
    _json(200, {'ok': true, 'message': message, 'data': data});

Map<String, dynamic> _requestCodeData({
  bool sent = true,
  bool reused = false,
  int expiresInSeconds = 600,
}) => {
  'email': _email,
  'sent': sent,
  'reused': reused,
  'expiresInSeconds': expiresInSeconds,
};

Map<String, dynamic> _verifyCodeData() => {
  'email': _email,
  'resetToken': _resetToken,
  'expiresInSeconds': 900,
};

void main() {
  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  group('POST /auth/forgot-password (requestCode)', () {
    test('sends a JSON POST to the versioned forgot-password path', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok(_requestCodeData())),
      );

      await service.requestCode(email: _email);

      expect(rec.calls, 1);
      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin/v1/auth/forgot-password');
      expect(rec.last.headers['Content-Type'], startsWith('application/json'));
      expect(rec.last.headers['User-Agent'], startsWith('CARES-Mobile'));
    });

    test('trims + lowercases the email and sends nothing else', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok(_requestCodeData())),
      );

      await service.requestCode(email: '  Juan@UCLM.edu.PH ');

      expect(rec.body, {'email': _email});
    });

    test('never attaches a bearer token, even when a session exists',
        () async {
      AuthSession.setAccessToken('old.token');
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok(_requestCodeData())),
      );

      await service.requestCode(email: _email);

      expect(rec.last.headers.containsKey('Authorization'), isFalse);
    });

    test('parses a freshly mailed code out of the data envelope', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok(_requestCodeData())),
      );

      final result = await service.requestCode(email: _email);

      expect(result.email, _email);
      expect(result.sent, isTrue);
      expect(result.reused, isFalse);
      expect(result.expiresInSeconds, 600);
    });

    test('reports a reused code so the countdown continues where it was',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _ok(
            _requestCodeData(sent: false, reused: true, expiresInSeconds: 142),
          ),
        ),
      );

      final result = await service.requestCode(email: _email);

      expect(result.sent, isFalse);
      expect(result.reused, isTrue);
      expect(result.expiresInSeconds, 142);
    });

    test('a 404 (no account for that email) throws the server message',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(404, {
            'ok': false,
            'message': 'No account is registered with that email',
          }),
        ),
      );

      await expectLater(
        service.requestCode(email: 'nobody@example.com'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 404)
              .having(
                (e) => e.message,
                'message',
                'No account is registered with that email',
              ),
        ),
      );
    });

    test('a 400 validation error surfaces the Zod message and errors',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(400, {
            'ok': false,
            'message': 'Email must be a valid email address',
            'errors': [
              {'path': 'email', 'message': 'Email must be a valid email address'},
            ],
          }),
        ),
      );

      await expectLater(
        service.requestCode(email: 'not-an-email'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 400)
              .having(
                (e) => e.message,
                'message',
                'Email must be a valid email address',
              )
              .having((e) => e.errors, 'errors', isNotEmpty),
        ),
      );
    });

    test('a 429 rate limit throws with the server message', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(429, {
            'ok': false,
            'message': 'Too many reset requests. Try again later.',
          }),
        ),
      );

      await expectLater(
        service.requestCode(email: _email),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 429)
              .having(
                (e) => e.message,
                'message',
                'Too many reset requests. Try again later.',
              ),
        ),
      );
    });

    test('a 5xx without a body falls back to a generic message', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => http.Response('', 503)),
      );

      await expectLater(
        service.requestCode(email: _email),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 503)
              .having((e) => e.message, 'message', 'Request failed (503)'),
        ),
      );
    });

    test('a network failure is wrapped in a "Cannot reach API" ApiException',
        () async {
      final service = PasswordResetService(
        apiClient: ApiClient(
          client: MockClient(
            (_) async => throw const SocketException('Connection refused'),
          ),
        ),
      );

      await expectLater(
        service.requestCode(email: _email),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('Cannot reach API at $_origin/v1/auth/forgot-password'),
          ),
        ),
      );
    });
  });

  group('POST /auth/verify-reset-otp (verifyCode)', () {
    test('sends the normalised email and trimmed OTP, unauthenticated',
        () async {
      AuthSession.setAccessToken('old.token');
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok(_verifyCodeData())),
      );

      await service.verifyCode(email: ' JUAN@uclm.edu.ph', otp: ' 123456 ');

      expect(rec.last.method, 'POST');
      expect(rec.last.url.path, '/v1/auth/verify-reset-otp');
      expect(rec.last.headers.containsKey('Authorization'), isFalse);
      expect(rec.body, {'email': _email, 'otp': '123456'});
    });

    test('returns the reset token that authorises the new password',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok(_verifyCodeData())),
      );

      final result = await service.verifyCode(email: _email, otp: '123456');

      expect(result.email, _email);
      expect(result.resetToken, _resetToken);
      expect(result.expiresInSeconds, 900);
    });

    test('a wrong or expired code throws the server message', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(400, {
            'ok': false,
            'message': 'That code is incorrect or has expired',
          }),
        ),
      );

      await expectLater(
        service.verifyCode(email: _email, otp: '000000'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 400)
              .having(
                (e) => e.message,
                'message',
                'That code is incorrect or has expired',
              ),
        ),
      );
    });

    test('too many wrong attempts surfaces the lockout message', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(429, {
            'ok': false,
            'message': 'Too many attempts. Request a new code.',
          }),
        ),
      );

      await expectLater(
        service.verifyCode(email: _email, otp: '111111'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 429)
              .having(
                (e) => e.message,
                'message',
                'Too many attempts. Request a new code.',
              ),
        ),
      );
    });
  });

  group('POST /auth/reset-password (resetPassword)', () {
    test('sends email, reset token and new password, unauthenticated',
        () async {
      AuthSession.setAccessToken('old.token');
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _ok({'email': _email}, message: 'Password updated'),
        ),
      );

      await service.resetPassword(
        email: ' Juan@UCLM.edu.ph ',
        resetToken: _resetToken,
        newPassword: 'NewSecret#456',
      );

      expect(rec.calls, 1);
      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin/v1/auth/reset-password');
      expect(rec.last.headers.containsKey('Authorization'), isFalse);
      expect(rec.body, {
        'email': _email,
        'resetToken': _resetToken,
        'newPassword': 'NewSecret#456',
      });
    });

    test('leaves the new password and reset token exactly as given',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok({'email': _email})),
      );

      await service.resetPassword(
        email: _email,
        resetToken: _resetToken,
        newPassword: ' Spaced Out#1 ',
      );

      expect(rec.body['newPassword'], ' Spaced Out#1 ');
      expect(rec.body['resetToken'], _resetToken);
    });

    test('completes without a value on success', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((_) async => _ok({'email': _email})),
      );

      await expectLater(
        service.resetPassword(
          email: _email,
          resetToken: _resetToken,
          newPassword: 'NewSecret#456',
        ),
        completes,
      );
    });

    test('an expired or reused reset token throws the server message',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(401, {
            'ok': false,
            'message': 'This reset link has expired. Start again.',
          }),
        ),
      );

      await expectLater(
        service.resetPassword(
          email: _email,
          resetToken: _resetToken,
          newPassword: 'NewSecret#456',
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 401)
              .having(
                (e) => e.message,
                'message',
                'This reset link has expired. Start again.',
              ),
        ),
      );
    });

    test('a weak password is refused with the Zod message and errors',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(400, {
            'ok': false,
            'message': 'Password must be at least 8 characters',
            'errors': [
              {
                'path': 'newPassword',
                'message': 'Password must be at least 8 characters',
              },
            ],
          }),
        ),
      );

      try {
        await service.resetPassword(
          email: _email,
          resetToken: _resetToken,
          newPassword: 'short',
        );
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.statusCode, 400);
        expect(e.message, 'Password must be at least 8 characters');
        expect((e.errors as List).first['path'], 'newPassword');
      }
    });

    test('a 2xx with ok:false is still treated as a failure', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _json(200, {
            'ok': false,
            'message': 'Choose a password you have not used before',
          }),
        ),
      );

      await expectLater(
        service.resetPassword(
          email: _email,
          resetToken: _resetToken,
          newPassword: 'OldSecret#123',
        ),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'Choose a password you have not used before',
          ),
        ),
      );
    });
  });

  group('full forgot-password flow', () {
    test('request → verify → reset hands the earned token to the last call',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client((request) async {
          switch (request.url.path) {
            case '/v1/auth/forgot-password':
              return _ok(_requestCodeData());
            case '/v1/auth/verify-reset-otp':
              return _ok(_verifyCodeData());
            case '/v1/auth/reset-password':
              return _ok({'email': _email});
          }
          return _json(404, {'ok': false, 'message': 'Not found'});
        }),
      );

      final sent = await service.requestCode(email: 'Juan@uclm.edu.ph');
      final verified = await service.verifyCode(
        email: sent.email,
        otp: '654321',
      );
      await service.resetPassword(
        email: verified.email,
        resetToken: verified.resetToken,
        newPassword: 'NewSecret#456',
      );

      expect(rec.requests.map((r) => r.url.path), [
        '/v1/auth/forgot-password',
        '/v1/auth/verify-reset-otp',
        '/v1/auth/reset-password',
      ]);
      expect(rec.bodyOf(rec.requests[2])['resetToken'], _resetToken);
      expect(
        rec.requests.every((r) => !r.headers.containsKey('Authorization')),
        isTrue,
      );
    });
  });

  group('password reset response models', () {
    test('PasswordResetRequestResponse falls back to safe defaults', () {
      final result = PasswordResetRequestResponse.fromJson({});

      expect(result.email, '');
      expect(result.sent, isFalse);
      expect(result.reused, isFalse);
      expect(result.expiresInSeconds, 0);
    });

    test('PasswordResetRequestResponse accepts a double expiry', () {
      final result = PasswordResetRequestResponse.fromJson({
        'expiresInSeconds': 299.0,
      });

      expect(result.expiresInSeconds, 299);
    });

    test('PasswordResetTokenResponse falls back to safe defaults', () {
      final result = PasswordResetTokenResponse.fromJson({});

      expect(result.email, '');
      expect(result.resetToken, '');
      expect(result.expiresInSeconds, 0);
    });
  });
}
