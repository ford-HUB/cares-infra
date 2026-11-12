// Integration tests for the sign-in screen.
//
// Unlike the unit tests in test/unit/modules/auth/login/, these drive the real
// LoginScreen widget end to end: typing into the fields, tapping "Sign In",
// and following the request through AuthLoginService -> ApiClient ->
// AuthSession -> navigation. Only the HTTP transport is replaced: every
// http.Client the app creates inside the test zone is a MockClient that
// answers with a mock `{ ok, message, data }` envelope, so nothing here
// reaches a real server.
//
//   POST /v1/auth/login              email + password sign-in
//   POST /v1/auth/send-verification  unverified-email branch (purpose: login)

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/models/sun_weather_mood.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/auth/presentation/providers/weather_provider.dart';
import 'package:mobile/features/auth/presentation/screens/email_verification_screen.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/screens/registration_under_review_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/home_screen.dart';

const _origin = 'http://api.test';
const _loginPath = '/v1/auth/login';
const _sendVerificationPath = '/v1/auth/send-verification';

/// Keeps every request the app sends and answers each one through [reply].
/// Paths the test does not handle get a 404 envelope, so a screen that loads
/// after sign-in fails quietly instead of reaching the network.
class _MockServer {
  _MockServer(this.reply);

  final FutureOr<http.Response?> Function(http.Request request) reply;
  final List<http.Request> requests = [];

  late final MockClient client = MockClient((request) async {
    requests.add(request);
    return await reply(request) ??
        _json(404, {'ok': false, 'message': 'Not mocked: ${request.url.path}'});
  });

  List<http.Request> to(String path) =>
      requests.where((r) => r.url.path == path).toList();

  Map<String, dynamic> bodyOf(http.Request request) =>
      jsonDecode(request.body) as Map<String, dynamic>;
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

/// Fixed weather so the header never calls OpenWeather.
class _StubWeather extends WeatherNotifier {
  @override
  Future<WeatherSnapshot?> build() async =>
      const WeatherSnapshot(tempCelsius: 29, mood: SunWeatherMood.clear);
}

/// Records pushes so a test can tell the screen navigated away.
class _NavRecorder extends NavigatorObserver {
  final List<Route<dynamic>> pushed = [];

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    pushed.add(route);
  }
}

final _email = find.widgetWithText(TextField, 'Email address');
final _password = find.widgetWithText(TextField, 'Password');
final _signInButton = find.widgetWithText(ElevatedButton, 'Sign In');

/// Runs [body] with [server] standing in for every http.Client the app makes.
Future<void> _withServer(
  _MockServer server,
  Future<void> Function() body,
) {
  return http.runWithClient(body, () => server.client);
}

Future<_NavRecorder> _pumpLogin(WidgetTester tester) async {
  final nav = _NavRecorder();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [weatherProvider.overrideWith(_StubWeather.new)],
      child: MaterialApp(
        navigatorObservers: [nav],
        home: const LoginScreen(),
      ),
    ),
  );
  // Let the 2.2 s intro finish so the form is fully on screen. The weather
  // ambience animates forever, so pumpAndSettle would never return.
  await tester.pump(const Duration(milliseconds: 2400));
  nav.pushed.clear(); // drop the initial home route
  return nav;
}

Future<void> _signIn(
  WidgetTester tester, {
  required String email,
  required String password,
}) async {
  await tester.enterText(_email, email);
  await tester.enterText(_password, password);
  await tester.ensureVisible(_signInButton);
  await tester.tap(_signInButton);
  await tester.pump(); // start the request
  await tester.pump(); // deliver the mock response
  await tester.pump(const Duration(milliseconds: 400)); // snackbar / route
}

/// The dashboard reached after a successful sign-in asks for notification
/// permission. `flutter test` reports Android as the platform but registers no
/// plugin implementation, so register it here and answer its channel.
const _notificationsChannel = MethodChannel(
  'dexterous.com/flutter/local_notifications',
);

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
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  group('Login screen - form', () {
    testWidgets('renders the email, password and sign-in controls',
        (tester) async {
      final server = _MockServer((_) => null);
      await _withServer(server, () async {
        await _pumpLogin(tester);

        expect(find.text('Sign in to your account'), findsOneWidget);
        expect(_email, findsOneWidget);
        expect(_password, findsOneWidget);
        expect(_signInButton, findsOneWidget);
        expect(find.text('Forgot password?'), findsOneWidget);
        expect(find.text('Register'), findsOneWidget);
        expect(server.to(_loginPath), isEmpty);
      });
    });

    testWidgets('the password is hidden until the eye icon is tapped',
        (tester) async {
      final server = _MockServer((_) => null);
      await _withServer(server, () async {
        await _pumpLogin(tester);

        bool obscured() =>
            tester.widget<TextField>(_password).obscureText;

        expect(obscured(), isTrue);
        await tester.tap(find.byIcon(Icons.visibility_outlined));
        await tester.pump();
        expect(obscured(), isFalse);
        await tester.tap(find.byIcon(Icons.visibility_off_outlined));
        await tester.pump();
        expect(obscured(), isTrue);
      });
    });

    testWidgets('empty fields are refused on the device and never reach the '
        'API', (tester) async {
      final server = _MockServer((_) => _ok(_loginData()));
      await _withServer(server, () async {
        final nav = await _pumpLogin(tester);

        await _signIn(tester, email: '', password: '');
        expect(find.text('Please enter your email and password.'),
            findsOneWidget);

        await _signIn(tester, email: 'juan@uclm.edu.ph', password: '');
        expect(find.text('Please enter your email and password.'),
            findsWidgets);

        await _signIn(tester, email: '   ', password: 'Secret#123');
        expect(find.text('Please enter your email and password.'),
            findsWidgets);

        expect(server.requests, isEmpty);
        expect(nav.pushed, isEmpty);
        expect(AuthSession.isSignedIn, isFalse);
      });
    });
  });

  group('Login screen - POST /auth/login', () {
    testWidgets('valid credentials send one normalised request, store the '
        'token and leave the login screen', (tester) async {
      final server = _MockServer(
        (r) => r.url.path == _loginPath ? _ok(_loginData()) : null,
      );
      await _withServer(server, () async {
        final nav = await _pumpLogin(tester);

        await _signIn(
          tester,
          email: '  Juan@UCLM.edu.PH ',
          password: ' Secret#123 ',
        );

        final logins = server.to(_loginPath);
        expect(logins, hasLength(1));
        expect(logins.single.method, 'POST');
        expect(logins.single.url.toString(), '$_origin$_loginPath');
        expect(logins.single.headers.containsKey('Authorization'), isFalse);
        expect(server.bodyOf(logins.single), {
          'email': 'juan@uclm.edu.ph',
          'password': ' Secret#123 ',
        });

        expect(AuthSession.accessToken, 'jwt.mock.token');
        expect(nav.pushed, hasLength(1));
        // pushAndRemoveUntil keeps login mounted until the transition ends.
        await tester.pump(const Duration(milliseconds: 600));
        expect(find.byType(LoginScreen), findsNothing);
        expect(find.byType(HomeScreen), findsOneWidget); // VOLUNTEER landing

        // Tear the dashboard down before its pollers outlive the test.
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump(const Duration(seconds: 1));
      });
    });

    testWidgets('a stale token from an earlier session is dropped before '
        'signing in', (tester) async {
      AuthSession.setAccessToken('old.token');
      final server = _MockServer(
        (r) => r.url.path == _loginPath
            ? _json(401, {
                'ok': false,
                'message': 'Invalid email or password',
                'errors': [],
              })
            : null,
      );
      await _withServer(server, () async {
        await _pumpLogin(tester);

        await _signIn(tester, email: 'juan@uclm.edu.ph', password: 'wrong');

        expect(server.to(_loginPath).single.headers['Authorization'], isNull);
        expect(AuthSession.isSignedIn, isFalse);
      });
    });

    testWidgets('a 401 wrong password shows the server message and stays on '
        'the form', (tester) async {
      final server = _MockServer(
        (r) => r.url.path == _loginPath
            ? _json(401, {
                'ok': false,
                'message': 'Invalid email or password',
                'errors': [],
              })
            : null,
      );
      await _withServer(server, () async {
        final nav = await _pumpLogin(tester);

        await _signIn(tester, email: 'juan@uclm.edu.ph', password: 'wrong');

        expect(find.text('Invalid email or password'), findsOneWidget);
        expect(find.byType(LoginScreen), findsOneWidget);
        expect(nav.pushed, isEmpty);
        expect(AuthSession.isSignedIn, isFalse);
        // The button is usable again for another attempt.
        expect(tester.widget<ElevatedButton>(_signInButton).enabled, isTrue);
        // What was typed is kept so the user only fixes the password.
        expect(find.text('juan@uclm.edu.ph'), findsOneWidget);
      });
    });

    testWidgets('a 400 validation error surfaces the Zod message',
        (tester) async {
      final server = _MockServer(
        (r) => r.url.path == _loginPath
            ? _json(400, {
                'ok': false,
                'message': 'Email must be a valid email address',
                'errors': [
                  {
                    'path': 'email',
                    'message': 'Email must be a valid email address',
                  },
                ],
              })
            : null,
      );
      await _withServer(server, () async {
        await _pumpLogin(tester);

        await _signIn(tester, email: 'not-an-email', password: 'Secret#123');

        expect(find.text('Email must be a valid email address'),
            findsOneWidget);
        expect(AuthSession.isSignedIn, isFalse);
      });
    });

    testWidgets('a 2xx with ok:false is still treated as a failure',
        (tester) async {
      final server = _MockServer(
        (r) => r.url.path == _loginPath
            ? _json(200, {'ok': false, 'message': 'Account locked'})
            : null,
      );
      await _withServer(server, () async {
        final nav = await _pumpLogin(tester);

        await _signIn(tester, email: 'juan@uclm.edu.ph', password: 'Secret#123');

        expect(find.text('Account locked'), findsOneWidget);
        expect(nav.pushed, isEmpty);
        expect(AuthSession.isSignedIn, isFalse);
      });
    });

    testWidgets('a 5xx without a body shows the generic request failure',
        (tester) async {
      final server = _MockServer(
        (r) => r.url.path == _loginPath ? http.Response('', 503) : null,
      );
      await _withServer(server, () async {
        await _pumpLogin(tester);

        await _signIn(tester, email: 'juan@uclm.edu.ph', password: 'Secret#123');

        expect(find.text('Request failed (503)'), findsOneWidget);
        expect(AuthSession.isSignedIn, isFalse);
      });
    });

    testWidgets('an unreachable server shows the "Cannot reach API" message',
        (tester) async {
      final server = _MockServer((r) {
        if (r.url.path == _loginPath) {
          throw const SocketException('Connection refused');
        }
        return null;
      });
      await _withServer(server, () async {
        await _pumpLogin(tester);

        await _signIn(tester, email: 'juan@uclm.edu.ph', password: 'Secret#123');

        expect(
          find.textContaining('Cannot reach API at $_origin$_loginPath'),
          findsOneWidget,
        );
        expect(find.byType(LoginScreen), findsOneWidget);
        expect(AuthSession.isSignedIn, isFalse);
      });
    });

    testWidgets('while the request is in flight the button shows a spinner '
        'and repeated taps send nothing more', (tester) async {
      final pending = Completer<http.Response>();
      final server = _MockServer(
        (r) => r.url.path == _loginPath ? pending.future : null,
      );
      await _withServer(server, () async {
        await _pumpLogin(tester);

        await tester.enterText(_email, 'juan@uclm.edu.ph');
        await tester.enterText(_password, 'Secret#123');
        await tester.ensureVisible(_signInButton);
        await tester.tap(_signInButton);
        await tester.pump();

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(tester.widget<ElevatedButton>(find.byType(ElevatedButton))
            .enabled, isFalse);

        await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
        await tester.pump();
        expect(server.to(_loginPath), hasLength(1));

        pending.complete(
          _json(401, {'ok': false, 'message': 'Invalid email or password'}),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));

        expect(find.byType(CircularProgressIndicator), findsNothing);
        expect(_signInButton, findsOneWidget);
        expect(server.to(_loginPath), hasLength(1));
      });
    });
  });

  group('Login screen - account state branches', () {
    testWidgets('403 EMAIL_NOT_VERIFIED mails a login code and opens the OTP '
        'screen', (tester) async {
      final server = _MockServer((r) {
        switch (r.url.path) {
          case _loginPath:
            return _json(403, {
              'ok': false,
              'message': 'Verify your email first',
              'errors': [
                {'code': 'EMAIL_NOT_VERIFIED', 'message': 'Not verified'},
              ],
            });
          case _sendVerificationPath:
            return _ok({
              'email': 'juan@uclm.edu.ph',
              'sent': true,
              'reused': false,
              'verified': false,
              'expiresInSeconds': 300,
            });
        }
        return null;
      });
      await _withServer(server, () async {
        final nav = await _pumpLogin(tester);

        await _signIn(tester, email: ' juan@uclm.edu.ph ', password: 'Secret#123');
        await tester.pump(const Duration(milliseconds: 400));

        final sends = server.to(_sendVerificationPath);
        expect(sends, hasLength(1));
        expect(server.bodyOf(sends.single), {
          'email': 'juan@uclm.edu.ph',
          'purpose': 'login',
        });

        expect(nav.pushed, hasLength(1));
        expect(find.byType(EmailVerificationScreen), findsOneWidget);
        expect(AuthSession.isSignedIn, isFalse);
      });
    });

    testWidgets('403 EMAIL_NOT_VERIFIED with a failing code request stays on '
        'login and shows why', (tester) async {
      final server = _MockServer((r) {
        switch (r.url.path) {
          case _loginPath:
            return _json(403, {
              'ok': false,
              'message': 'Verify your email first',
              'errors': [
                {'code': 'EMAIL_NOT_VERIFIED'},
              ],
            });
          case _sendVerificationPath:
            return _json(429, {
              'ok': false,
              'message': 'Too many codes requested. Try again later.',
            });
        }
        return null;
      });
      await _withServer(server, () async {
        final nav = await _pumpLogin(tester);

        await _signIn(tester, email: 'juan@uclm.edu.ph', password: 'Secret#123');
        await tester.pump(const Duration(milliseconds: 400));

        expect(find.text('Too many codes requested. Try again later.'),
            findsOneWidget);
        expect(nav.pushed, isEmpty);
        expect(find.byType(LoginScreen), findsOneWidget);
      });
    });

    testWidgets('403 ACCOUNT_PENDING_APPROVAL opens the under-review screen',
        (tester) async {
      final server = _MockServer(
        (r) => r.url.path == _loginPath
            ? _json(403, {
                'ok': false,
                'message': 'Awaiting director approval',
                'errors': [
                  {'code': 'ACCOUNT_PENDING_APPROVAL'},
                ],
              })
            : null,
      );
      await _withServer(server, () async {
        final nav = await _pumpLogin(tester);

        await _signIn(tester, email: 'ben@example.com', password: 'Secret#123');

        expect(nav.pushed, hasLength(1));
        final review = tester.widget<RegistrationUnderReviewScreen>(
          find.byType(RegistrationUnderReviewScreen),
        );
        expect(review.state, RegistrationReviewState.pending);
        expect(review.email, 'ben@example.com');
        expect(review.message, 'Awaiting director approval');
        expect(AuthSession.isSignedIn, isFalse);
      });
    });
  });
}
