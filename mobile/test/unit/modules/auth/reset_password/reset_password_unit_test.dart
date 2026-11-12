// Unit tests for the last step of the forgot-password flow — the
// "Set a new password" screen (ResetPasswordScreen):
//
//   client-side checks   password policy + confirm-match, before any request
//   POST /v1/auth/reset-password   sent on "Update password"
//   outcome              pops `true` back to sign-in, or shows the server message
//
// The screen builds its own PasswordResetService, so the network is swapped
// for package:http's MockClient through `http.runWithClient` — nothing here
// reaches a real server. The password policy is pinned with a provider
// override so the rules never depend on `/security-policy/password-rules`.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/models/password_policy.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/auth/presentation/providers/password_policy_provider.dart';
import 'package:mobile/features/auth/presentation/screens/reset_password_screen.dart';

const _origin = 'http://api.test';
const _email = 'juan@uclm.edu.ph';
const _resetToken = '3f1c2b8e-7a4d-4e8b-9c61-2d5f0a9b7e11';
const _validPassword = 'NewSecret45';

const _rulesNotMet = 'Your password does not meet all the rules yet.';
const _mismatch = 'The two passwords do not match.';
const _updated = 'Password updated. Sign in with your new password.';

/// Records every request the screen sends and answers with [reply].
class _Recorder {
  _Recorder(this.reply);

  final Future<http.Response> Function(http.Request request) reply;
  final List<http.Request> requests = [];

  http.Client client() => MockClient((request) async {
    requests.add(request);
    return reply(request);
  });

  Map<String, dynamic> get body =>
      jsonDecode(requests.last.body) as Map<String, dynamic>;
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _updatedReply() => _json(200, {
  'ok': true,
  'message': 'Password updated',
  'data': {'email': _email},
});

/// What the reset screen popped with, once it has.
class _PopResult {
  bool popped = false;
  bool? value;
}

/// Pumps a launcher page and pushes the reset screen on top of it, the same way
/// the sign-in screen does, so the pop result and the snackbar shown afterwards
/// can both be observed.
Future<_PopResult> _openResetScreen(
  WidgetTester tester, {
  String email = _email,
  PasswordPolicy policy = PasswordPolicy.fallback,
}) async {
  final result = _PopResult();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [currentPasswordPolicyProvider.overrideWithValue(policy)],
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async {
                  final value = await Navigator.of(context).push<bool>(
                    MaterialPageRoute<bool>(
                      builder: (_) => ResetPasswordScreen(
                        email: email,
                        resetToken: _resetToken,
                      ),
                    ),
                  );
                  result
                    ..popped = true
                    ..value = value;
                },
                child: const Text('open reset'),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  await tester.tap(find.text('open reset'));
  await tester.pumpAndSettle();
  expect(find.byType(ResetPasswordScreen), findsOneWidget);
  return result;
}

Finder get _passwordField => find.byType(TextField).at(0);
Finder get _confirmField => find.byType(TextField).at(1);
Finder get _updateButton =>
    find.widgetWithText(ElevatedButton, 'Update password');

Future<void> _fill(
  WidgetTester tester, {
  required String password,
  required String confirm,
}) async {
  await tester.enterText(_passwordField, password);
  await tester.enterText(_confirmField, confirm);
  await tester.pump();
}

Future<void> _submit(WidgetTester tester) async {
  await tester.ensureVisible(_updateButton);
  await tester.tap(_updateButton);
  await tester.pump();
}

/// Runs [body] with every `http.Client()` the screen creates replaced by [rec].
Future<void> _withNetwork(_Recorder rec, Future<void> Function() body) =>
    http.runWithClient(body, rec.client);

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

  group('screen content', () {
    testWidgets('names the verified email and starts with masked fields',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(tester);

        expect(find.text('Set a new password'), findsOneWidget);
        expect(find.textContaining('You verified $_email.'), findsOneWidget);
        // Each label is also the field's hint.
        expect(find.text('New password'), findsWidgets);
        expect(find.text('Confirm new password'), findsWidgets);

        final fields = tester.widgetList<TextField>(find.byType(TextField));
        expect(fields.every((field) => field.obscureText), isTrue);
        expect(rec.requests, isEmpty);
      });
    });

    testWidgets('the eye icon reveals and re-masks the new password',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(tester);

        await tester.tap(find.byIcon(Icons.visibility_outlined).first);
        await tester.pump();
        expect(tester.widget<TextField>(_passwordField).obscureText, isFalse);
        expect(tester.widget<TextField>(_confirmField).obscureText, isTrue);

        await tester.tap(find.byIcon(Icons.visibility_off_outlined));
        await tester.pump();
        expect(tester.widget<TextField>(_passwordField).obscureText, isTrue);
      });
    });
  });

  group('client-side checks (nothing is sent)', () {
    testWidgets('lists only the rules a weak password still misses',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(tester);

        await tester.enterText(_passwordField, 'short');
        await tester.pump();

        expect(find.text('8+ characters'), findsOneWidget);
        expect(find.text('Upper & lower case'), findsOneWidget);
        expect(find.text('A number'), findsOneWidget);

        await tester.enterText(_passwordField, _validPassword);
        await tester.pump();

        expect(find.text('8+ characters'), findsNothing);
        expect(find.text('Upper & lower case'), findsNothing);
        expect(find.text('A number'), findsNothing);
      });
    });

    testWidgets('a password that breaks the policy is refused locally',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: 'alllowercase', confirm: 'alllowercase');
        await _submit(tester);

        expect(find.text(_rulesNotMet), findsOneWidget);
        expect(rec.requests, isEmpty);
        expect(pop.popped, isFalse);
      });
    });

    testWidgets('the policy check runs before the match check',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(tester);

        await _fill(tester, password: 'weak', confirm: 'different');
        await _submit(tester);

        expect(find.text(_rulesNotMet), findsOneWidget);
        expect(find.text(_mismatch), findsNothing);
        expect(rec.requests, isEmpty);
      });
    });

    testWidgets('mismatched passwords show the note and are refused locally',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: 'NewSecret457');
        expect(find.text('Passwords do not match'), findsOneWidget);

        await _submit(tester);

        expect(find.text(_mismatch), findsOneWidget);
        expect(rec.requests, isEmpty);
        expect(pop.popped, isFalse);
      });
    });

    testWidgets('an empty confirm field is refused as a mismatch',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(tester);

        await tester.enterText(_passwordField, _validPassword);
        await tester.pump();
        expect(find.text('Passwords do not match'), findsNothing);

        await _submit(tester);

        expect(find.text(_mismatch), findsOneWidget);
        expect(rec.requests, isEmpty);
      });
    });

    testWidgets('matching passwords show the "Passwords match" note',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);

        expect(find.text('Passwords match'), findsOneWidget);
        expect(find.text('Passwords do not match'), findsNothing);
      });
    });

    testWidgets('follows the administrator policy, not a hardcoded one',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(
          tester,
          policy: const PasswordPolicy(
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumber: true,
            requireSymbol: true,
          ),
        );

        // Passes the fallback policy, but is too short and has no symbol here.
        await _fill(tester, password: _validPassword, confirm: _validPassword);
        expect(find.text('12+ characters'), findsOneWidget);
        expect(find.text('A symbol'), findsOneWidget);

        await _submit(tester);

        expect(find.text(_rulesNotMet), findsOneWidget);
        expect(rec.requests, isEmpty);
      });
    });
  });

  group('POST /auth/reset-password', () {
    testWidgets('sends the email, earned token and new password once',
        (tester) async {
      AuthSession.setAccessToken('old.token');
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        await _openResetScreen(tester, email: ' Juan@UCLM.edu.ph ');

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await _submit(tester);
        await tester.pumpAndSettle();

        expect(rec.requests, hasLength(1));
        final request = rec.requests.single;
        expect(request.method, 'POST');
        expect(request.url.toString(), '$_origin/v1/auth/reset-password');
        expect(request.headers.containsKey('Authorization'), isFalse);
        expect(rec.body, {
          'email': _email,
          'resetToken': _resetToken,
          'newPassword': _validPassword,
        });
      });
    });

    testWidgets('on success pops `true` to sign-in and confirms the update',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await _submit(tester);
        await tester.pumpAndSettle();

        expect(pop.popped, isTrue);
        expect(pop.value, isTrue);
        expect(find.byType(ResetPasswordScreen), findsNothing);
        expect(find.text(_updated), findsOneWidget);
      });
    });

    testWidgets('the keyboard "done" action on confirm also submits',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await tester.showKeyboard(_confirmField);
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pumpAndSettle();

        expect(rec.requests, hasLength(1));
        expect(pop.value, isTrue);
      });
    });

    testWidgets('while saving it shows a spinner and ignores a second tap',
        (tester) async {
      final pending = Completer<http.Response>();
      final rec = _Recorder((_) => pending.future);
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await _submit(tester);

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Update password'), findsNothing);
        final button = tester.widget<ElevatedButton>(
          find.byType(ElevatedButton),
        );
        expect(button.onPressed, isNull);

        await tester.tap(find.byType(ElevatedButton), warnIfMissed: false);
        await tester.pump();
        expect(rec.requests, hasLength(1));

        pending.complete(_updatedReply());
        await tester.pumpAndSettle();
        expect(pop.value, isTrue);
      });
    });

    testWidgets('an expired reset token shows the server message and stays',
        (tester) async {
      final rec = _Recorder(
        (_) async => _json(401, {
          'ok': false,
          'message': 'This reset link has expired. Start again.',
        }),
      );
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await _submit(tester);
        await tester.pumpAndSettle();

        expect(
          find.text('This reset link has expired. Start again.'),
          findsOneWidget,
        );
        expect(pop.popped, isFalse);
        expect(find.byType(ResetPasswordScreen), findsOneWidget);
        // A failed reset must not be mistaken for an ended session.
        expect(AuthSession.accessToken, isNull);
      });
    });

    testWidgets('a server refusal re-enables the button for another try',
        (tester) async {
      var attempt = 0;
      final rec = _Recorder((_) async {
        attempt++;
        if (attempt == 1) {
          return _json(400, {
            'ok': false,
            'message': 'Choose a password you have not used before',
          });
        }
        return _updatedReply();
      });
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await _submit(tester);
        await tester.pumpAndSettle();

        expect(
          find.text('Choose a password you have not used before'),
          findsOneWidget,
        );
        expect(
          tester.widget<ElevatedButton>(_updateButton).onPressed,
          isNotNull,
        );

        await _fill(tester, password: 'Fresh1Secret', confirm: 'Fresh1Secret');
        await _submit(tester);
        await tester.pumpAndSettle();

        expect(rec.requests, hasLength(2));
        expect(rec.body['newPassword'], 'Fresh1Secret');
        expect(pop.value, isTrue);
      });
    });

    testWidgets('a network failure is surfaced instead of swallowed',
        (tester) async {
      final rec = _Recorder(
        (_) async => throw const SocketException('Connection refused'),
      );
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await _submit(tester);
        await tester.pumpAndSettle();

        expect(
          find.textContaining(
            'Cannot reach API at $_origin/v1/auth/reset-password',
          ),
          findsOneWidget,
        );
        expect(pop.popped, isFalse);
      });
    });
  });

  group('leaving the screen', () {
    testWidgets('"Back" pops without a result and sends nothing',
        (tester) async {
      final rec = _Recorder((_) async => _updatedReply());
      await _withNetwork(rec, () async {
        final pop = await _openResetScreen(tester);

        await _fill(tester, password: _validPassword, confirm: _validPassword);
        await tester.tap(find.text('Back'));
        await tester.pumpAndSettle();

        expect(pop.popped, isTrue);
        expect(pop.value, isNull);
        expect(rec.requests, isEmpty);
      });
    });
  });
}
