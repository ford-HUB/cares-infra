// Unit tests for every POST the sign-in screen sends:
//
//   POST /v1/auth/login              AuthLoginService.login
//   POST /v1/auth/send-verification  AuthRegistrationService.sendVerificationCode (purpose: login)
//   POST /v1/auth/donor/oauth        DonorAuthService.exchangeProviderToken
//   POST /v1/auth/forgot-password    PasswordResetService.requestCode
//   POST /v1/auth/verify-reset-otp   PasswordResetService.verifyCode
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
import 'package:mobile/features/auth/data/auth_login_service.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';
import 'package:mobile/features/auth/data/donor_auth_service.dart';
import 'package:mobile/features/auth/data/password_reset_service.dart';
import 'package:mobile/features/auth/data/social_auth_client.dart';
import 'package:mobile/features/auth/presentation/screens/registration_under_review_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';

const _origin = 'http://api.test';

/// A MockClient that keeps the last request so the test can inspect it.
class _Recorder {
  http.Request? last;
  int calls = 0;

  ApiClient client(
    Future<http.Response> Function(http.Request request) reply,
  ) {
    return ApiClient(
      client: MockClient((request) async {
        last = request;
        calls++;
        return reply(request);
      }),
    );
  }

  Map<String, dynamic> get body =>
      jsonDecode(last!.body) as Map<String, dynamic>;
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok(Map<String, dynamic> data) =>
    _json(200, {'ok': true, 'message': 'OK', 'data': data});

Map<String, dynamic> _loginData({String roleType = 'VOLUNTEER'}) => {
  'user_id': 'usr_123',
  'role_type': roleType,
  'email': 'juan@uclm.edu.ph',
  'firstname': 'Juan',
  'has_interests': true,
  'access_token': 'jwt.mock.token',
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

  group('POST /auth/login', () {
    test('sends a JSON POST to the versioned login path', () async {
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client((_) async => _ok(_loginData())),
      );

      await service.login(email: 'juan@uclm.edu.ph', password: 'Secret#123');

      expect(rec.calls, 1);
      expect(rec.last!.method, 'POST');
      expect(rec.last!.url.toString(), '$_origin/v1/auth/login');
      expect(rec.last!.headers['Content-Type'], startsWith('application/json'));
      expect(rec.last!.headers['User-Agent'], startsWith('CARES-Mobile'));
    });

    test('trims and lowercases the email but leaves the password as typed',
        () async {
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client((_) async => _ok(_loginData())),
      );

      await service.login(
        email: '  Juan@UCLM.edu.PH ',
        password: ' Secret#123 ',
      );

      expect(rec.body, {
        'email': 'juan@uclm.edu.ph',
        'password': ' Secret#123 ',
      });
    });

    test('never sends a stale bearer token with the login request', () async {
      AuthSession.setAccessToken('old.token');
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client((_) async => _ok(_loginData())),
      );

      await service.login(email: 'juan@uclm.edu.ph', password: 'Secret#123');

      expect(rec.last!.headers.containsKey('Authorization'), isFalse);
    });

    test('parses the session out of the data envelope', () async {
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client((_) async => _ok(_loginData())),
      );

      final result = await service.login(
        email: 'juan@uclm.edu.ph',
        password: 'Secret#123',
      );

      expect(result.userId, 'usr_123');
      expect(result.roleType, 'VOLUNTEER');
      expect(result.isVolunteer, isTrue);
      expect(result.email, 'juan@uclm.edu.ph');
      expect(result.firstName, 'Juan');
      expect(result.hasInterests, isTrue);
      expect(result.accessToken, 'jwt.mock.token');
    });

    test('a 401 (wrong password) throws the server message and does not '
        'end an existing session', () async {
      AuthSession.setAccessToken('still.valid');
      var sessionEnded = false;
      AuthSession.onSessionEnded = (_) => sessionEnded = true;

      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client(
          (_) async => _json(401, {
            'ok': false,
            'message': 'Invalid email or password',
            'errors': [],
          }),
        ),
      );

      await expectLater(
        service.login(email: 'juan@uclm.edu.ph', password: 'wrong'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 401)
              .having((e) => e.message, 'message', 'Invalid email or password'),
        ),
      );
      expect(sessionEnded, isFalse);
      expect(AuthSession.accessToken, 'still.valid');
    });

    test('a 403 EMAIL_NOT_VERIFIED keeps the error list for the OTP branch',
        () async {
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client(
          (_) async => _json(403, {
            'ok': false,
            'message': 'Verify your email first',
            'errors': [
              {'code': 'EMAIL_NOT_VERIFIED', 'message': 'Not verified'},
            ],
          }),
        ),
      );

      try {
        await service.login(email: 'juan@uclm.edu.ph', password: 'Secret#123');
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.statusCode, 403);
        expect(e.errors, isA<List>());
        expect((e.errors as List).first['code'], 'EMAIL_NOT_VERIFIED');
      }
    });

    test('a 403 ACCOUNT_PENDING_APPROVAL maps to the review screen state',
        () async {
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client(
          (_) async => _json(403, {
            'ok': false,
            'message': 'Awaiting director approval',
            'errors': [
              {'code': 'ACCOUNT_PENDING_APPROVAL'},
            ],
          }),
        ),
      );

      try {
        await service.login(email: 'ben@example.com', password: 'Secret#123');
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(registrationReviewStateOf(e), RegistrationReviewState.pending);
      }
    });

    test('a 400 validation error surfaces the Zod message and errors',
        () async {
      final rec = _Recorder();
      final service = AuthLoginService(
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
        service.login(email: 'not-an-email', password: 'x'),
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

    test('a 2xx with ok:false is still treated as a failure', () async {
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client(
          (_) async => _json(200, {'ok': false, 'message': 'Account locked'}),
        ),
      );

      await expectLater(
        service.login(email: 'juan@uclm.edu.ph', password: 'Secret#123'),
        throwsA(
          isA<ApiException>().having((e) => e.message, 'message', 'Account locked'),
        ),
      );
    });

    test('a 5xx without a body falls back to a generic message', () async {
      final rec = _Recorder();
      final service = AuthLoginService(
        apiClient: rec.client((_) async => http.Response('', 503)),
      );

      await expectLater(
        service.login(email: 'juan@uclm.edu.ph', password: 'Secret#123'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 503)
              .having((e) => e.message, 'message', 'Request failed (503)'),
        ),
      );
    });

    test('a network failure is wrapped in a "Cannot reach API" ApiException',
        () async {
      final service = AuthLoginService(
        apiClient: ApiClient(
          client: MockClient(
            (_) async => throw const SocketException('Connection refused'),
          ),
        ),
      );

      await expectLater(
        service.login(email: 'juan@uclm.edu.ph', password: 'Secret#123'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('Cannot reach API at $_origin/v1/auth/login'),
          ),
        ),
      );
    });
  });

  group('POST /auth/send-verification (unverified email at sign-in)', () {
    test('sends the email with purpose "login" and no phone/id fields',
        () async {
      final rec = _Recorder();
      final service = AuthRegistrationService(
        apiClient: rec.client(
          (_) async => _ok({
            'email': 'juan@uclm.edu.ph',
            'sent': true,
            'reused': false,
            'verified': false,
            'expiresInSeconds': 300,
          }),
        ),
      );

      final result = await service.sendVerificationCode(
        email: ' juan@uclm.edu.ph ',
        purpose: VerificationPurpose.login,
      );

      expect(rec.last!.method, 'POST');
      expect(rec.last!.url.path, '/v1/auth/send-verification');
      expect(rec.body, {'email': 'juan@uclm.edu.ph', 'purpose': 'login'});

      expect(result.sent, isTrue);
      expect(result.reused, isFalse);
      expect(result.verified, isFalse);
      expect(result.expiresInSeconds, 300);
    });

    test('reports a reused code so the screen says "enter the code we sent"',
        () async {
      final rec = _Recorder();
      final service = AuthRegistrationService(
        apiClient: rec.client(
          (_) async => _ok({
            'email': 'juan@uclm.edu.ph',
            'sent': false,
            'reused': true,
            'expiresInSeconds': 120,
          }),
        ),
      );

      final result = await service.sendVerificationCode(
        email: 'juan@uclm.edu.ph',
        purpose: VerificationPurpose.login,
      );

      expect(result.sent, isFalse);
      expect(result.reused, isTrue);
      expect(result.expiresInSeconds, 120);
    });

    test('a 429 rate limit throws with the server message', () async {
      final rec = _Recorder();
      final service = AuthRegistrationService(
        apiClient: rec.client(
          (_) async => _json(429, {
            'ok': false,
            'message': 'Too many codes requested. Try again later.',
          }),
        ),
      );

      await expectLater(
        service.sendVerificationCode(
          email: 'juan@uclm.edu.ph',
          purpose: VerificationPurpose.login,
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 429)
              .having(
                (e) => e.message,
                'message',
                'Too many codes requested. Try again later.',
              ),
        ),
      );
    });
  });

  group('POST /auth/donor/oauth (social sign-in)', () {
    test('sends the provider enum name and token, unauthenticated', () async {
      AuthSession.setAccessToken('old.token');
      final rec = _Recorder();
      final service = DonorAuthService(
        apiClient: rec.client(
          (_) async => _ok({'status': 'signed_in', 'session': _loginData()}),
        ),
      );

      await service.exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );

      expect(rec.last!.method, 'POST');
      expect(rec.last!.url.path, '/v1/auth/donor/oauth');
      expect(rec.last!.headers.containsKey('Authorization'), isFalse);
      expect(rec.body, {'provider': 'GOOGLE', 'token': 'google.id.token'});
    });

    test('maps Facebook to FACEBOOK', () async {
      final rec = _Recorder();
      final service = DonorAuthService(
        apiClient: rec.client(
          (_) async => _ok({'status': 'signed_in', 'session': _loginData()}),
        ),
      );

      await service.exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.facebook,
          token: 'fb.access.token',
        ),
      );

      expect(rec.body['provider'], 'FACEBOOK');
    });

    test('a known donor comes back signed in with a session', () async {
      final rec = _Recorder();
      final service = DonorAuthService(
        apiClient: rec.client(
          (_) async => _ok({
            'status': 'signed_in',
            'session': _loginData(roleType: 'DONOR'),
          }),
        ),
      );

      final result = await service.exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );

      expect(result.isSignedIn, isTrue);
      expect(result.needsRegistration, isFalse);
      expect(result.session!.roleType, 'DONOR');
      expect(result.session!.accessToken, 'jwt.mock.token');
    });

    test('an unknown account comes back as registration_required with a '
        'ticket', () async {
      final rec = _Recorder();
      final service = DonorAuthService(
        apiClient: rec.client(
          (_) async => _ok({
            'status': 'registration_required',
            'profile': {
              'provider': 'GOOGLE',
              'email': 'new.donor@example.com',
              'firstname': 'New',
              'lastname': 'Donor',
            },
            'oauth_ticket': 'ticket_abc',
          }),
        ),
      );

      final result = await service.exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );

      expect(result.isSignedIn, isFalse);
      expect(result.needsRegistration, isTrue);
      expect(result.oauthTicket, 'ticket_abc');
      expect(result.profile!.email, 'new.donor@example.com');
      expect(result.profile!.firstName, 'New');
    });

    test('an invalid provider token throws the server message', () async {
      final rec = _Recorder();
      final service = DonorAuthService(
        apiClient: rec.client(
          (_) async => _json(401, {
            'ok': false,
            'message': 'Google could not verify this sign-in',
          }),
        ),
      );

      await expectLater(
        service.exchangeProviderToken(
          const SocialAuthToken(
            provider: SocialAuthProvider.google,
            token: 'bad',
          ),
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 401)
              .having(
                (e) => e.message,
                'message',
                'Google could not verify this sign-in',
              ),
        ),
      );
    });
  });

  group('POST /auth/forgot-password + /auth/verify-reset-otp', () {
    test('requestCode trims + lowercases the email and parses the reply',
        () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _ok({
            'email': 'juan@uclm.edu.ph',
            'sent': true,
            'reused': false,
            'expiresInSeconds': 600,
          }),
        ),
      );

      final result = await service.requestCode(email: ' Juan@UCLM.edu.ph ');

      expect(rec.last!.method, 'POST');
      expect(rec.last!.url.path, '/v1/auth/forgot-password');
      expect(rec.last!.headers.containsKey('Authorization'), isFalse);
      expect(rec.body, {'email': 'juan@uclm.edu.ph'});
      expect(result.sent, isTrue);
      expect(result.expiresInSeconds, 600);
    });

    test('verifyCode trims the OTP and returns the reset token', () async {
      final rec = _Recorder();
      final service = PasswordResetService(
        apiClient: rec.client(
          (_) async => _ok({
            'email': 'juan@uclm.edu.ph',
            'resetToken': 'reset_tok_1',
            'expiresInSeconds': 900,
          }),
        ),
      );

      final result = await service.verifyCode(
        email: 'JUAN@uclm.edu.ph',
        otp: ' 123456 ',
      );

      expect(rec.last!.url.path, '/v1/auth/verify-reset-otp');
      expect(rec.body, {'email': 'juan@uclm.edu.ph', 'otp': '123456'});
      expect(result.resetToken, 'reset_tok_1');
      expect(result.expiresInSeconds, 900);
    });

    test('verifyCode with a wrong code throws the server message', () async {
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
        service.verifyCode(email: 'juan@uclm.edu.ph', otp: '000000'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'That code is incorrect or has expired',
          ),
        ),
      );
    });
  });
}
