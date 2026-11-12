// Unit tests for email verification — the OTP step every self-registration
// (and an unverified sign-in) goes through:
//
//   POST /v1/auth/send-verification   AuthRegistrationService.sendVerificationCode
//   POST /v1/auth/verification-status AuthRegistrationService.getVerificationStatus
//   POST /v1/auth/verify-otp          AuthRegistrationService.verifyOtp
//   EmailVerificationScreen           countdown, code entry, resend, conflicts
//
// The network is replaced with package:http's MockClient, and the screen gets
// its service through an `authRegistrationServiceProvider` override, so nothing
// here reaches a real server. Each test records the requests it captured and
// replies with a mock `{ ok, message, data }` envelope.

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/presentation/providers/register_flow_provider.dart';
import 'package:mobile/features/auth/presentation/screens/email_verification_screen.dart';

const _origin = 'http://api.test';
const _email = 'juan@uclm.edu.ph';

const _sendPath = '/v1/auth/send-verification';
const _statusPath = '/v1/auth/verification-status';
const _verifyPath = '/v1/auth/verify-otp';

/// A MockClient that keeps every request so the test can inspect them.
class _Recorder {
  _Recorder([Future<http.Response> Function(http.Request request)? reply])
    : _reply = reply ?? _defaultReply;

  final Future<http.Response> Function(http.Request request) _reply;
  final List<http.Request> requests = [];

  http.Request get last => requests.last;

  ApiClient apiClient() => ApiClient(
    client: MockClient((request) async {
      requests.add(request);
      return _reply(request);
    }),
  );

  AuthRegistrationService service() =>
      AuthRegistrationService(apiClient: apiClient());

  List<String> get paths => requests.map((r) => r.url.path).toList();

  Iterable<http.Request> to(String path) =>
      requests.where((r) => r.url.path == path);

  Map<String, dynamic> bodyOf(http.Request request) =>
      jsonDecode(request.body) as Map<String, dynamic>;

  Map<String, dynamic> get body => bodyOf(last);
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok([Map<String, dynamic> data = const {}]) =>
    _json(200, {'ok': true, 'message': 'OK', 'data': data});

Map<String, dynamic> _sendData({
  bool sent = true,
  bool reused = false,
  bool verified = false,
  int expiresInSeconds = 300,
}) => {
  'email': _email,
  'sent': sent,
  'reused': reused,
  'verified': verified,
  'expiresInSeconds': expiresInSeconds,
};

Map<String, dynamic> _statusData({
  bool hasActiveCode = true,
  bool verified = false,
  int expiresInSeconds = 120,
}) => {
  'email': _email,
  'hasActiveCode': hasActiveCode,
  'verified': verified,
  'expiresInSeconds': expiresInSeconds,
};

Future<http.Response> _defaultReply(http.Request request) async {
  switch (request.url.path) {
    case _sendPath:
      return _ok(_sendData());
    case _statusPath:
      return _ok(_statusData());
    case _verifyPath:
      return _ok({'email': _email, 'verified': true});
  }
  return _json(404, {'ok': false, 'message': 'Not found'});
}

http.Response _conflict(String path, String message) => _json(409, {
  'ok': false,
  'message': message,
  'errors': [
    {'path': path, 'message': message},
  ],
});

// ---------------------------------------------------------------------------
// Screen harness
// ---------------------------------------------------------------------------

/// What happened around the screen while the test drove it.
class _Outcome {
  int verifiedCalls = 0;
  RegistrationConflict? conflict;
  bool popped = false;
}

/// Pumps a launcher page and pushes the verification screen on top, the way
/// the registration and sign-in flows do, so a pop and the snackbars shown
/// afterwards can both be observed.
Future<_Outcome> _openScreen(
  WidgetTester tester,
  _Recorder rec, {
  int initialExpiresInSeconds = 300,
  bool emailAlreadyVerified = false,
  bool codeReused = false,
  VerificationPurpose purpose = VerificationPurpose.registration,
  bool withConflictHandler = false,
  Future<void> Function(BuildContext context)? onVerified,
}) async {
  final outcome = _Outcome();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRegistrationServiceProvider.overrideWithValue(rec.service()),
      ],
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async {
                  await Navigator.of(context).push<void>(
                    MaterialPageRoute<void>(
                      builder: (_) => EmailVerificationScreen(
                        email: _email,
                        initialExpiresInSeconds: initialExpiresInSeconds,
                        emailAlreadyVerified: emailAlreadyVerified,
                        codeReused: codeReused,
                        purpose: purpose,
                        onConflict: withConflictHandler
                            ? (conflict) => outcome.conflict = conflict
                            : null,
                        onVerified: (ctx) async {
                          outcome.verifiedCalls++;
                          await onVerified?.call(ctx);
                        },
                      ),
                    ),
                  );
                  outcome.popped = true;
                },
                child: const Text('open verification'),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  await tester.tap(find.text('open verification'));
  await _settle(tester);
  expect(find.byType(EmailVerificationScreen), findsOneWidget);
  return outcome;
}

/// Lets the route transition and the mock network finish. The countdown timer
/// and the progress spinner never go idle, so `pumpAndSettle` can't be used —
/// it would run the countdown out.
Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  // A pop started by the reply above needs one more frame to finish.
  await tester.pump(const Duration(milliseconds: 400));
}

Finder get _codeField => find.byType(TextField);
Finder get _resendButton => find.widgetWithText(TextButton, 'Resend code');

Future<void> _typeCode(WidgetTester tester, String code) async {
  await tester.enterText(_codeField, code);
  await tester.pump();
}

bool _resendEnabled(WidgetTester tester) =>
    tester.widget<TextButton>(_resendButton).onPressed != null;

String _codeText(WidgetTester tester) =>
    tester.widget<TextField>(_codeField).controller!.text;

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

  // -------------------------------------------------------------------------
  // Service
  // -------------------------------------------------------------------------

  group('POST /auth/send-verification (registration)', () {
    test('sends a JSON POST with the trimmed email and purpose "registration"',
        () async {
      final rec = _Recorder();

      await rec.service().sendVerificationCode(email: '  $_email ');

      expect(rec.requests, hasLength(1));
      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin$_sendPath');
      expect(rec.last.headers['Content-Type'], startsWith('application/json'));
      expect(rec.body, {'email': _email, 'purpose': 'registration'});
    });

    test('normalises a local PH number to +63 and trims the ID number',
        () async {
      final rec = _Recorder();

      await rec.service().sendVerificationCode(
        email: _email,
        phoneNumber: '0917 123 4567',
        idNumber: ' 12345678 ',
      );

      expect(rec.body, {
        'email': _email,
        'phone_number': '+639171234567',
        'id_number': '12345678',
        'purpose': 'registration',
      });
    });

    test('leaves out blank phone and ID numbers instead of sending ""',
        () async {
      final rec = _Recorder();

      await rec.service().sendVerificationCode(
        email: _email,
        phoneNumber: '   ',
        idNumber: '',
      );

      expect(rec.body.containsKey('phone_number'), isFalse);
      expect(rec.body.containsKey('id_number'), isFalse);
    });

    test('only sends `resend: true` when a new code is forced', () async {
      final rec = _Recorder();
      final service = rec.service();

      await service.sendVerificationCode(email: _email);
      expect(rec.body.containsKey('resend'), isFalse);

      await service.sendVerificationCode(email: _email, resend: true);
      expect(rec.body['resend'], isTrue);
    });

    test('parses a freshly mailed code', () async {
      final rec = _Recorder();

      final result = await rec.service().sendVerificationCode(email: _email);

      expect(result.email, _email);
      expect(result.sent, isTrue);
      expect(result.reused, isFalse);
      expect(result.verified, isFalse);
      expect(result.expiresInSeconds, 300);
    });

    test('reports an already-verified email so the OTP can be skipped',
        () async {
      final rec = _Recorder(
        (_) async => _ok(_sendData(sent: false, verified: true)),
      );

      final result = await rec.service().sendVerificationCode(email: _email);

      expect(result.sent, isFalse);
      expect(result.verified, isTrue);
    });

    test('a 409 on the phone number becomes a phone RegistrationConflict',
        () async {
      final rec = _Recorder(
        (_) async => _conflict(
          'phone_number',
          'This phone number is already registered',
        ),
      );

      try {
        await rec.service().sendVerificationCode(
          email: _email,
          phoneNumber: '09171234567',
        );
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.statusCode, 409);
        final conflict = RegistrationConflict.fromException(e);
        expect(conflict, isNotNull);
        expect(conflict!.field, RegistrationConflictField.phoneNumber);
        expect(conflict.message, 'This phone number is already registered');
      }
    });

    test('a 429 rate limit throws with the server message', () async {
      final rec = _Recorder(
        (_) async => _json(429, {
          'ok': false,
          'message': 'Too many codes requested. Try again later.',
        }),
      );

      await expectLater(
        rec.service().sendVerificationCode(email: _email),
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

    test('a network failure is wrapped in a "Cannot reach API" ApiException',
        () async {
      final service = AuthRegistrationService(
        apiClient: ApiClient(
          client: MockClient(
            (_) async => throw const SocketException('Connection refused'),
          ),
        ),
      );

      await expectLater(
        service.sendVerificationCode(email: _email),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('Cannot reach API at $_origin$_sendPath'),
          ),
        ),
      );
    });
  });

  group('POST /auth/verification-status', () {
    test('sends the trimmed email and parses the live code state', () async {
      final rec = _Recorder();

      final result = await rec.service().getVerificationStatus(
        email: ' $_email ',
      );

      expect(rec.last.method, 'POST');
      expect(rec.last.url.path, _statusPath);
      expect(rec.body, {'email': _email});
      expect(result.email, _email);
      expect(result.hasActiveCode, isTrue);
      expect(result.verified, isFalse);
      expect(result.expiresInSeconds, 120);
    });

    test('reports no active code once it has lapsed', () async {
      final rec = _Recorder(
        (_) async => _ok(_statusData(hasActiveCode: false, expiresInSeconds: 0)),
      );

      final result = await rec.service().getVerificationStatus(email: _email);

      expect(result.hasActiveCode, isFalse);
      expect(result.expiresInSeconds, 0);
    });
  });

  group('POST /auth/verify-otp', () {
    test('sends the trimmed email and trimmed code', () async {
      final rec = _Recorder();

      await rec.service().verifyOtp(email: ' $_email', otp: ' 123456 ');

      expect(rec.last.method, 'POST');
      expect(rec.last.url.path, _verifyPath);
      expect(rec.body, {'email': _email, 'otp': '123456'});
    });

    test('a wrong or expired code throws the server message', () async {
      final rec = _Recorder(
        (_) async => _json(400, {
          'ok': false,
          'message': 'Invalid or expired verification code',
        }),
      );

      await expectLater(
        rec.service().verifyOtp(email: _email, otp: '000000'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 400)
              .having(
                (e) => e.message,
                'message',
                'Invalid or expired verification code',
              ),
        ),
      );
    });
  });

  group('verification models', () {
    test('SendVerificationResponse assumes a code was sent when unstated', () {
      final result = SendVerificationResponse.fromJson({});

      expect(result.email, '');
      expect(result.sent, isTrue);
      expect(result.reused, isFalse);
      expect(result.verified, isFalse);
      expect(result.expiresInSeconds, 0);
    });

    test('VerificationStatusResponse falls back to "nothing active"', () {
      final result = VerificationStatusResponse.fromJson({
        'expiresInSeconds': 59.0,
      });

      expect(result.hasActiveCode, isFalse);
      expect(result.verified, isFalse);
      expect(result.expiresInSeconds, 59);
    });

    test('RegistrationConflict ignores non-409s and unknown fields', () {
      expect(
        RegistrationConflict.fromException(
          ApiException(
            'Bad request',
            statusCode: 400,
            errors: [
              {'path': 'email', 'message': 'x'},
            ],
          ),
        ),
        isNull,
      );
      expect(
        RegistrationConflict.fromException(
          ApiException(
            'Conflict',
            statusCode: 409,
            errors: [
              {'path': 'nickname', 'message': 'x'},
            ],
          ),
        ),
        isNull,
      );
      expect(
        RegistrationConflict.fromException(Exception('boom')),
        isNull,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Screen
  // -------------------------------------------------------------------------

  group('EmailVerificationScreen — content and countdown', () {
    testWidgets('tells the user where the code went', (tester) async {
      final rec = _Recorder();
      await _openScreen(tester, rec);

      expect(find.text('Verify email'), findsOneWidget);
      expect(find.text('Check your inbox'), findsOneWidget);
      expect(
        find.textContaining('We sent a 6-digit code to $_email.'),
        findsOneWidget,
      );
    });

    testWidgets('a reused code says to use the one already sent',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(tester, rec, codeReused: true);

      expect(
        find.textContaining('Use the verification code already sent to $_email'),
        findsOneWidget,
      );
    });

    testWidgets('counts the code down and keeps resend off while it is live',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(tester, rec, initialExpiresInSeconds: 300);

      expect(find.text('Code expires in 5:00'), findsOneWidget);
      expect(_resendEnabled(tester), isFalse);

      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Code expires in 4:59'), findsOneWidget);

      // A live code is not re-checked with the server.
      expect(rec.to(_statusPath), isEmpty);
    });

    testWidgets('once the countdown runs out it says so and enables resend',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(tester, rec, initialExpiresInSeconds: 3);

      await tester.pump(const Duration(seconds: 3));

      expect(
        find.text('Code expired. Tap resend to get a new one.'),
        findsOneWidget,
      );
      expect(_resendEnabled(tester), isTrue);
    });

    testWidgets('with no countdown it asks the server for the live code state',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(tester, rec, initialExpiresInSeconds: 0);

      expect(rec.to(_statusPath), hasLength(1));
      expect(rec.bodyOf(rec.to(_statusPath).single), {'email': _email});
      expect(find.text('Code expires in 2:00'), findsOneWidget);
      expect(_resendEnabled(tester), isFalse);
    });

    testWidgets('a failed status lookup leaves the code shown as expired',
        (tester) async {
      final rec = _Recorder((request) async {
        if (request.url.path == _statusPath) {
          return http.Response('', 503);
        }
        return _defaultReply(request);
      });
      await _openScreen(tester, rec, initialExpiresInSeconds: 0);

      expect(
        find.text('Code expired. Tap resend to get a new one.'),
        findsOneWidget,
      );
      expect(_resendEnabled(tester), isTrue);
      expect(find.byType(SnackBar), findsNothing);
    });
  });

  group('EmailVerificationScreen — entering the code', () {
    testWidgets('accepts digits only and waits for all six', (tester) async {
      final rec = _Recorder();
      final outcome = await _openScreen(tester, rec);

      await _typeCode(tester, '12ab34');
      expect(_codeText(tester), '1234');

      await _typeCode(tester, '12345');
      await _settle(tester);

      expect(rec.to(_verifyPath), isEmpty);
      expect(outcome.verifiedCalls, 0);
    });

    testWidgets('the sixth digit verifies the code, then hands off',
        (tester) async {
      final rec = _Recorder();
      final outcome = await _openScreen(tester, rec);

      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(rec.to(_verifyPath), hasLength(1));
      expect(
        rec.bodyOf(rec.to(_verifyPath).single),
        {'email': _email, 'otp': '123456'},
      );
      expect(outcome.verifiedCalls, 1);
    });

    testWidgets('shows progress while verifying and locks the input',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(
        tester,
        rec,
        // Keeps the screen in its submitting state.
        onVerified: (_) => Future<void>.delayed(const Duration(seconds: 30)),
      );

      await _typeCode(tester, '123456');
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(tester.widget<TextField>(_codeField).enabled, isFalse);
      expect(_resendEnabled(tester), isFalse);

      await tester.pump(const Duration(seconds: 30));
    });

    testWidgets('an already-verified email skips verify-otp', (tester) async {
      final rec = _Recorder();
      final outcome = await _openScreen(
        tester,
        rec,
        emailAlreadyVerified: true,
      );

      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(rec.to(_verifyPath), isEmpty);
      expect(outcome.verifiedCalls, 1);
    });

    testWidgets('a wrong code shows the server message and clears the boxes',
        (tester) async {
      final rec = _Recorder((request) async {
        if (request.url.path == _verifyPath) {
          return _json(400, {
            'ok': false,
            'message': 'Invalid or expired verification code',
          });
        }
        return _defaultReply(request);
      });
      final outcome = await _openScreen(tester, rec);

      await _typeCode(tester, '000000');
      await _settle(tester);

      expect(
        find.text('Invalid or expired verification code'),
        findsOneWidget,
      );
      expect(_codeText(tester), isEmpty);
      expect(tester.widget<TextField>(_codeField).enabled, isTrue);
      expect(outcome.verifiedCalls, 0);
    });

    testWidgets('a code typed after it expired is refused locally',
        (tester) async {
      final rec = _Recorder();
      final outcome = await _openScreen(tester, rec, initialExpiresInSeconds: 2);

      await tester.pump(const Duration(seconds: 2));
      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(
        find.text('Verification code expired. Please request a new code.'),
        findsOneWidget,
      );
      expect(rec.to(_verifyPath), isEmpty);
      expect(outcome.verifiedCalls, 0);
    });

    testWidgets('an account-creation error after a good code is shown, and '
        'the next try skips verify-otp', (tester) async {
      var attempt = 0;
      final rec = _Recorder();
      final outcome = await _openScreen(
        tester,
        rec,
        onVerified: (_) async {
          attempt++;
          if (attempt == 1) {
            throw ApiException('Registration session expired', statusCode: 410);
          }
        },
      );

      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(find.text('Registration session expired'), findsOneWidget);
      expect(_codeText(tester), isEmpty);

      await _typeCode(tester, '123456');
      await _settle(tester);

      // The code was already spent on the first try.
      expect(rec.to(_verifyPath), hasLength(1));
      expect(outcome.verifiedCalls, 2);
    });

    testWidgets('a non-API failure during registration shows a generic message',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(
        tester,
        rec,
        onVerified: (_) async => throw StateError('boom'),
      );

      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(find.text('Registration failed. Please try again.'), findsOneWidget);
    });

    testWidgets('the same failure during sign-in says "Sign in failed"',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(
        tester,
        rec,
        purpose: VerificationPurpose.login,
        onVerified: (_) async => throw StateError('boom'),
      );

      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(find.text('Sign in failed. Please try again.'), findsOneWidget);
    });
  });

  group('EmailVerificationScreen — resend', () {
    testWidgets('mails a new code with `resend: true` and restarts the timer',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(tester, rec, initialExpiresInSeconds: 1);

      await tester.pump(const Duration(seconds: 1));
      await tester.tap(_resendButton);
      await _settle(tester);

      expect(rec.to(_sendPath), hasLength(1));
      expect(rec.bodyOf(rec.to(_sendPath).single), {
        'email': _email,
        'purpose': 'registration',
        'resend': true,
      });
      expect(
        find.text('A new verification code was sent to $_email'),
        findsOneWidget,
      );
      expect(find.text('Code expires in 5:00'), findsOneWidget);
      expect(_resendEnabled(tester), isFalse);
    });

    testWidgets('a sign-in verification resends with purpose "login"',
        (tester) async {
      final rec = _Recorder();
      await _openScreen(
        tester,
        rec,
        initialExpiresInSeconds: 1,
        purpose: VerificationPurpose.login,
      );

      await tester.pump(const Duration(seconds: 1));
      await tester.tap(_resendButton);
      await _settle(tester);

      expect(rec.bodyOf(rec.to(_sendPath).single)['purpose'], 'login');
    });

    testWidgets('a code that is still live is reported instead of re-sent',
        (tester) async {
      final rec = _Recorder((request) async {
        if (request.url.path == _sendPath) {
          return _ok(_sendData(sent: false, reused: true, expiresInSeconds: 90));
        }
        return _defaultReply(request);
      });
      await _openScreen(tester, rec, initialExpiresInSeconds: 1);

      await tester.pump(const Duration(seconds: 1));
      await tester.tap(_resendButton);
      await _settle(tester);

      expect(
        find.text('Your existing verification code is still active.'),
        findsOneWidget,
      );
      expect(find.text('Code expires in 1:30'), findsOneWidget);
    });

    testWidgets('a resend error shows the server message and allows a retry',
        (tester) async {
      final rec = _Recorder((request) async {
        if (request.url.path == _sendPath) {
          return _json(429, {
            'ok': false,
            'message': 'Too many codes requested. Try again later.',
          });
        }
        return _defaultReply(request);
      });
      await _openScreen(tester, rec, initialExpiresInSeconds: 1);

      await tester.pump(const Duration(seconds: 1));
      await tester.tap(_resendButton);
      await _settle(tester);

      expect(
        find.text('Too many codes requested. Try again later.'),
        findsOneWidget,
      );
      expect(_resendEnabled(tester), isTrue);
    });
  });

  group('EmailVerificationScreen — conflicts', () {
    testWidgets('a 409 on verify pops back and hands the field to the caller',
        (tester) async {
      final rec = _Recorder((request) async {
        if (request.url.path == _verifyPath) {
          return _conflict('email', 'This email is already registered');
        }
        return _defaultReply(request);
      });
      final outcome = await _openScreen(tester, rec, withConflictHandler: true);

      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(outcome.popped, isTrue);
      expect(find.byType(EmailVerificationScreen), findsNothing);
      expect(outcome.conflict?.field, RegistrationConflictField.email);
      expect(outcome.conflict?.message, 'This email is already registered');
      expect(outcome.verifiedCalls, 0);
    });

    testWidgets('a 409 on resend hands off the conflicting ID number',
        (tester) async {
      final rec = _Recorder((request) async {
        if (request.url.path == _sendPath) {
          return _conflict('id_number', 'This ID number is already registered');
        }
        return _defaultReply(request);
      });
      final outcome = await _openScreen(
        tester,
        rec,
        initialExpiresInSeconds: 1,
        withConflictHandler: true,
      );

      await tester.pump(const Duration(seconds: 1));
      await tester.tap(_resendButton);
      await _settle(tester);

      expect(outcome.popped, isTrue);
      expect(outcome.conflict?.field, RegistrationConflictField.idNumber);
    });

    testWidgets('without a conflict handler the message stays on screen',
        (tester) async {
      final rec = _Recorder((request) async {
        if (request.url.path == _verifyPath) {
          return _conflict('email', 'This email is already registered');
        }
        return _defaultReply(request);
      });
      final outcome = await _openScreen(tester, rec);

      await _typeCode(tester, '123456');
      await _settle(tester);

      expect(outcome.popped, isFalse);
      expect(find.byType(EmailVerificationScreen), findsOneWidget);
      expect(find.text('This email is already registered'), findsOneWidget);
    });
  });
}
