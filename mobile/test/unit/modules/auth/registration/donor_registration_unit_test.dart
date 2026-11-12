// Unit tests for donor registration — both sign-up routes the donor screen
// (RegisterDonorScreen) offers, in the order it sends them:
//
//   Email + password (no provider vouches for the address, so it borrows OTP):
//     POST /v1/auth/send-verification    AuthRegistrationService.sendVerificationCode
//     POST /v1/auth/verify-otp           AuthRegistrationService.verifyOtp
//     POST /v1/auth/donor/register-email DonorAuthService.registerDonorWithEmail
//
//   Google / Facebook:
//     POST /v1/auth/donor/oauth          DonorAuthService.exchangeProviderToken
//     POST /v1/auth/donor/register       DonorAuthService.registerDonor (spends the ticket)
//
// Plus the models the screen builds the donor from: the OAuth result and
// profile, the login session it gets back, and the in-memory DonorSession.
//
// The network is replaced with package:http's MockClient, so nothing here
// reaches a real server or a real Google / Facebook account.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';
import 'package:mobile/features/auth/data/donor_auth_service.dart';
import 'package:mobile/features/auth/data/models/donor_auth_models.dart';
import 'package:mobile/features/auth/data/models/login_api_models.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/data/social_auth_client.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';

const _origin = 'http://api.test';
const _email = 'ana.reyes@example.com';
const _password = 'Donate#2026';
const _ticket = 'oauth_ticket_9b2e';

const _sendPath = '/v1/auth/send-verification';
const _verifyOtpPath = '/v1/auth/verify-otp';
const _oauthPath = '/v1/auth/donor/oauth';
const _registerPath = '/v1/auth/donor/register';
const _registerEmailPath = '/v1/auth/donor/register-email';

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

/// A MockClient that keeps every request so the test can inspect them. One
/// recorder backs both services, as one server backs both on the real screen.
class _Recorder {
  _Recorder([Future<http.Response> Function(http.Request request)? reply])
    : _reply = reply ?? _defaultReply;

  final Future<http.Response> Function(http.Request request) _reply;
  final List<http.Request> requests = [];

  http.Request get last => requests.last;

  ApiClient _client() => ApiClient(
    client: MockClient((request) async {
      requests.add(request);
      return _reply(request);
    }),
  );

  DonorAuthService donor() => DonorAuthService(apiClient: _client());

  AuthRegistrationService registration() =>
      AuthRegistrationService(apiClient: _client());

  List<String> get paths => requests.map((r) => r.url.path).toList();

  http.Request to(String path) =>
      requests.lastWhere((r) => r.url.path == path);

  Map<String, dynamic> jsonOf(http.Request request) =>
      jsonDecode(request.body) as Map<String, dynamic>;

  Map<String, dynamic> get body => jsonOf(last);
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok(Map<String, dynamic> data) =>
    _json(200, {'ok': true, 'message': 'OK', 'data': data});

http.Response _fail(int status, String message, [List<Object>? errors]) =>
    _json(status, {'ok': false, 'message': message, 'errors': ?errors});

http.Response _conflict(String path, String message) =>
    _fail(409, message, [
      {'path': path, 'message': message},
    ]);

/// The session `/donor/register*` and a known donor's `/donor/oauth` return.
Map<String, dynamic> _donorSession({String email = _email}) => {
  'user_id': 'usr_donor_1',
  'role_type': 'DONOR',
  'email': email,
  'firstname': 'Ana',
  'has_interests': false,
  'access_token': 'jwt.donor.token',
};

Map<String, dynamic> _oauthProfile({String provider = 'GOOGLE'}) => {
  'provider': provider,
  'email': 'ana.g@gmail.com',
  'firstname': 'Ana',
  'middle_name': 'M.',
  'lastname': 'Reyes',
  'avatar': 'https://lh3.googleusercontent.com/a/ana',
};

Map<String, dynamic> _registrationRequired() => {
  'status': 'registration_required',
  'profile': _oauthProfile(),
  'oauth_ticket': _ticket,
};

Future<http.Response> _defaultReply(http.Request request) async {
  switch (request.url.path) {
    case _sendPath:
      return _ok({
        'email': _email,
        'sent': true,
        'reused': false,
        'verified': false,
        'expiresInSeconds': 300,
      });
    case _verifyOtpPath:
      return _ok({'email': _email, 'verified': true});
    case _oauthPath:
      return _ok(_registrationRequired());
    case _registerPath:
      return _ok(_donorSession(email: 'ana.g@gmail.com'));
    case _registerEmailPath:
      return _ok(_donorSession());
  }
  return _fail(404, 'Not found');
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/// A complete address picked from the directory, as the donor form builds it.
PhAddress _address() {
  final city = PhAddressDirectory.localityNamed('Lapu-Lapu City')!;
  return PhAddress(
    street: '123 Rizal St.',
    barangay: PhAddressDirectory.barangayNamed('Pajo', city),
    locality: city,
  );
}

const _formattedAddress = '123 Rizal St., Pajo, Lapu-Lapu City, Cebu';

Future<LoginResponse> _registerWithEmail(
  DonorAuthService service, {
  String email = _email,
  String password = _password,
  String firstName = 'Ana',
  String middleName = 'M.',
  String lastName = 'Reyes',
  String phoneNumber = '09187654321',
  String? address,
}) => service.registerDonorWithEmail(
  email: email,
  password: password,
  firstName: firstName,
  middleName: middleName,
  lastName: lastName,
  phoneNumber: phoneNumber,
  address: address ?? _address().formatted,
);

Future<LoginResponse> _registerWithTicket(
  DonorAuthService service, {
  String ticket = _ticket,
  String firstName = 'Ana',
  String middleName = 'M.',
  String lastName = 'Reyes',
  String phoneNumber = '09187654321',
  String? address,
}) => service.registerDonor(
  oauthTicket: ticket,
  firstName: firstName,
  middleName: middleName,
  lastName: lastName,
  phoneNumber: phoneNumber,
  address: address ?? _address().formatted,
);

void main() {
  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    DonorSession.instance.signOut();
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    DonorSession.instance.signOut();
  });

  test('the fixture address is complete and formats as the server stores it',
      () {
    expect(_address().isComplete, isTrue);
    expect(_address().formatted, _formattedAddress);
  });

  // -------------------------------------------------------------------------
  // Email + password route
  // -------------------------------------------------------------------------

  group('POST /auth/donor/register-email', () {
    test('sends an unauthenticated JSON POST to the versioned path', () async {
      AuthSession.setAccessToken('stale.token');
      final rec = _Recorder();

      await _registerWithEmail(rec.donor());

      expect(rec.requests, hasLength(1));
      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin$_registerEmailPath');
      expect(rec.last.headers['Content-Type'], startsWith('application/json'));
      expect(rec.last.headers.containsKey('Authorization'), isFalse);
    });

    test('trims the details, normalises the phone, keeps the password',
        () async {
      final rec = _Recorder();

      await _registerWithEmail(
        rec.donor(),
        email: '  $_email ',
        password: ' Donate#2026 ',
        firstName: ' Ana ',
        middleName: ' M. ',
        lastName: ' Reyes ',
        phoneNumber: '0918 765 4321',
        address: '  $_formattedAddress ',
      );

      expect(rec.body, {
        'email': _email,
        'password': ' Donate#2026 ',
        'firstname': 'Ana',
        'middle_name': 'M.',
        'lastname': 'Reyes',
        'phone_number': '+639187654321',
        'current_address': _formattedAddress,
      });
    });

    test('an empty middle name is sent as "" rather than left out', () async {
      final rec = _Recorder();

      await _registerWithEmail(rec.donor(), middleName: '   ');

      expect(rec.body['middle_name'], '');
    });

    test('parses the donor session it signs in with', () async {
      final rec = _Recorder();

      final session = await _registerWithEmail(rec.donor());

      expect(session.userId, 'usr_donor_1');
      expect(session.roleType, 'DONOR');
      expect(session.isVolunteer, isFalse);
      expect(session.email, _email);
      expect(session.firstName, 'Ana');
      expect(session.accessToken, 'jwt.donor.token');
    });

    test('is refused until the email passed the OTP check', () async {
      final rec = _Recorder(
        (_) async => _fail(403, 'Verify your email before creating an account'),
      );

      await expectLater(
        _registerWithEmail(rec.donor()),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 403)
              .having(
                (e) => e.message,
                'message',
                'Verify your email before creating an account',
              ),
        ),
      );
    });

    test('a taken phone number is a phone conflict the form can focus',
        () async {
      final rec = _Recorder(
        (_) async => _conflict(
          'phone_number',
          'This phone number is already registered',
        ),
      );

      try {
        await _registerWithEmail(rec.donor());
        fail('expected ApiException');
      } on ApiException catch (e) {
        final conflict = RegistrationConflict.fromException(e);
        expect(conflict?.field, RegistrationConflictField.phoneNumber);
        expect(conflict?.message, 'This phone number is already registered');
      }
    });

    test('a weak password surfaces the Zod message and errors', () async {
      final rec = _Recorder(
        (_) async => _fail(400, 'Password must be at least 8 characters', [
          {
            'path': 'password',
            'message': 'Password must be at least 8 characters',
          },
        ]),
      );

      await expectLater(
        _registerWithEmail(rec.donor(), password: 'short'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 400)
              .having(
                (e) => e.message,
                'message',
                'Password must be at least 8 characters',
              )
              .having((e) => e.errors, 'errors', isNotEmpty),
        ),
      );
    });

    test('a network failure is wrapped in a "Cannot reach API" ApiException',
        () async {
      final service = DonorAuthService(
        apiClient: ApiClient(
          client: MockClient(
            (_) async => throw const SocketException('Connection refused'),
          ),
        ),
      );

      await expectLater(
        _registerWithEmail(service),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('Cannot reach API at $_origin$_registerEmailPath'),
          ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Google / Facebook route
  // -------------------------------------------------------------------------

  group('POST /auth/donor/oauth (new donor)', () {
    test('a new provider account comes back with a profile and a ticket',
        () async {
      final rec = _Recorder();

      final result = await rec.donor().exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );

      expect(rec.body, {'provider': 'GOOGLE', 'token': 'google.id.token'});
      expect(rec.last.headers.containsKey('Authorization'), isFalse);

      expect(result.needsRegistration, isTrue);
      expect(result.isSignedIn, isFalse);
      expect(result.session, isNull);
      expect(result.oauthTicket, _ticket);
      expect(result.profile!.provider, SocialAuthProvider.google);
      expect(result.profile!.email, 'ana.g@gmail.com');
      expect(result.profile!.firstName, 'Ana');
      expect(result.profile!.middleName, 'M.');
      expect(result.profile!.lastName, 'Reyes');
      expect(
        result.profile!.avatarUrl,
        'https://lh3.googleusercontent.com/a/ana',
      );
    });

    test('a known donor is signed in instead of registered', () async {
      final rec = _Recorder(
        (_) async => _ok({'status': 'signed_in', 'session': _donorSession()}),
      );

      final result = await rec.donor().exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.facebook,
          token: 'fb.access.token',
        ),
      );

      expect(rec.body['provider'], 'FACEBOOK');
      expect(result.isSignedIn, isTrue);
      expect(result.needsRegistration, isFalse);
      expect(result.session!.roleType, 'DONOR');
    });

    test('registration_required without a ticket cannot be finished',
        () async {
      final rec = _Recorder(
        (_) async => _ok({
          'status': 'registration_required',
          'profile': _oauthProfile(),
        }),
      );

      final result = await rec.donor().exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );

      // The screen reports "sign-in did not complete" for this case.
      expect(result.needsRegistration, isFalse);
      expect(result.isSignedIn, isFalse);
    });

    test('signed_in without a session is not treated as signed in', () async {
      final rec = _Recorder((_) async => _ok({'status': 'signed_in'}));

      final result = await rec.donor().exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );

      expect(result.isSignedIn, isFalse);
      expect(result.needsRegistration, isFalse);
    });
  });

  group('POST /auth/donor/register (spend the ticket)', () {
    test('sends the ticket and contact details, unauthenticated', () async {
      AuthSession.setAccessToken('stale.token');
      final rec = _Recorder();

      await _registerWithTicket(
        rec.donor(),
        firstName: ' Ana ',
        lastName: ' Reyes ',
        phoneNumber: '+63 918 765 4321',
      );

      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin$_registerPath');
      expect(rec.last.headers.containsKey('Authorization'), isFalse);
      expect(rec.body, {
        'oauth_ticket': _ticket,
        'firstname': 'Ana',
        'middle_name': 'M.',
        'lastname': 'Reyes',
        'phone_number': '+639187654321',
        'current_address': _formattedAddress,
      });
    });

    test('never sends an email or password — the ticket carries the identity',
        () async {
      final rec = _Recorder();

      await _registerWithTicket(rec.donor());

      expect(rec.body.containsKey('email'), isFalse);
      expect(rec.body.containsKey('password'), isFalse);
    });

    test('returns the session for the provider-verified email', () async {
      final rec = _Recorder();

      final session = await _registerWithTicket(rec.donor());

      expect(session.email, 'ana.g@gmail.com');
      expect(session.roleType, 'DONOR');
      expect(session.accessToken, 'jwt.donor.token');
    });

    test('a spent or expired ticket is a 401 the screen resets on', () async {
      final rec = _Recorder(
        (_) async => _fail(
          401,
          'That sign-in expired. Tap the provider button again.',
        ),
      );

      await expectLater(
        _registerWithTicket(rec.donor()),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 401)
              .having(
                (e) => e.message,
                'message',
                'That sign-in expired. Tap the provider button again.',
              ),
        ),
      );
    });

    test('a failed ticket spend does not end an existing session', () async {
      AuthSession.setAccessToken('still.valid');
      var ended = false;
      AuthSession.onSessionEnded = (_) => ended = true;
      final rec = _Recorder((_) async => _fail(401, 'Ticket expired'));

      await expectLater(
        _registerWithTicket(rec.donor()),
        throwsA(isA<ApiException>()),
      );

      expect(ended, isFalse);
      expect(AuthSession.accessToken, 'still.valid');
    });

    test('a taken phone number is a phone conflict', () async {
      final rec = _Recorder(
        (_) async => _conflict(
          'phone_number',
          'This phone number is already registered',
        ),
      );

      try {
        await _registerWithTicket(rec.donor());
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(
          RegistrationConflict.fromException(e)?.field,
          RegistrationConflictField.phoneNumber,
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // Whole process, end to end against the mock server
  // -------------------------------------------------------------------------

  group('full donor registration process', () {
    test('email route: send code → verify → create, no ID number', () async {
      final rec = _Recorder();
      final registration = rec.registration();
      final donor = rec.donor();

      final sent = await registration.sendVerificationCode(
        email: _email,
        phoneNumber: '09187654321',
      );
      expect(sent.sent, isTrue);

      await registration.verifyOtp(email: _email, otp: '123456');
      final session = await _registerWithEmail(donor);

      expect(rec.paths, [_sendPath, _verifyOtpPath, _registerEmailPath]);

      // The phone is checked for clashes before a code is mailed; a donor has
      // no school ID, so none is sent.
      expect(rec.jsonOf(rec.to(_sendPath)), {
        'email': _email,
        'phone_number': '+639187654321',
        'purpose': 'registration',
      });
      expect(rec.jsonOf(rec.to(_verifyOtpPath)), {
        'email': _email,
        'otp': '123456',
      });

      final created = rec.jsonOf(rec.to(_registerEmailPath));
      expect(created['email'], _email);
      expect(created['current_address'], _formattedAddress);
      expect(session.roleType, 'DONOR');
    });

    test('email route: a wrong code stops before the account is created',
        () async {
      final rec = _Recorder((request) async {
        if (request.url.path == _verifyOtpPath) {
          return _fail(400, 'Invalid or expired verification code');
        }
        return _defaultReply(request);
      });
      final registration = rec.registration();

      await registration.sendVerificationCode(
        email: _email,
        phoneNumber: '09187654321',
      );
      await expectLater(
        registration.verifyOtp(email: _email, otp: '000000'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'Invalid or expired verification code',
          ),
        ),
      );

      expect(rec.paths, [_sendPath, _verifyOtpPath]);
      expect(rec.paths, isNot(contains(_registerEmailPath)));
    });

    test('email route: a taken email is caught before any code is mailed',
        () async {
      final rec = _Recorder(
        (_) async => _conflict('email', 'This email is already registered'),
      );

      try {
        await rec.registration().sendVerificationCode(
          email: _email,
          phoneNumber: '09187654321',
        );
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(
          RegistrationConflict.fromException(e)?.field,
          RegistrationConflictField.email,
        );
      }
      expect(rec.paths, [_sendPath]);
    });

    test('social route: provider → ticket → create with the edited form',
        () async {
      final rec = _Recorder();
      final donor = rec.donor();

      final linked = await donor.exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );
      expect(linked.needsRegistration, isTrue);

      // The profile seeds the form; the donor fixes their middle name and adds
      // the contact details the provider does not know.
      final profile = linked.profile!;
      final session = await _registerWithTicket(
        donor,
        ticket: linked.oauthTicket!,
        firstName: profile.firstName,
        middleName: 'Magdalena',
        lastName: profile.lastName,
        phoneNumber: '09187654321',
      );

      expect(rec.paths, [_oauthPath, _registerPath]);
      // No OTP on this route — the provider already vouched for the email.
      expect(rec.paths, isNot(contains(_sendPath)));
      expect(rec.paths, isNot(contains(_verifyOtpPath)));

      final created = rec.jsonOf(rec.to(_registerPath));
      expect(created['oauth_ticket'], _ticket);
      expect(created['firstname'], 'Ana');
      expect(created['middle_name'], 'Magdalena');
      expect(created['lastname'], 'Reyes');
      expect(session.email, 'ana.g@gmail.com');
    });

    test('social route: a known donor never reaches the register call',
        () async {
      final rec = _Recorder(
        (_) async => _ok({'status': 'signed_in', 'session': _donorSession()}),
      );

      final result = await rec.donor().exchangeProviderToken(
        const SocialAuthToken(
          provider: SocialAuthProvider.google,
          token: 'google.id.token',
        ),
      );

      expect(result.isSignedIn, isTrue);
      expect(rec.paths, [_oauthPath]);
    });
  });

  // -------------------------------------------------------------------------
  // Models
  // -------------------------------------------------------------------------

  group('donor models', () {
    test('DonorOAuthProfile maps FACEBOOK and treats anything else as Google',
        () {
      expect(
        DonorOAuthProfile.fromJson({'provider': 'facebook'}).provider,
        SocialAuthProvider.facebook,
      );
      expect(
        DonorOAuthProfile.fromJson({'provider': 'GOOGLE'}).provider,
        SocialAuthProvider.google,
      );
      expect(
        DonorOAuthProfile.fromJson({}).provider,
        SocialAuthProvider.google,
      );
    });

    test('DonorOAuthProfile builds the full name and initials', () {
      final profile = DonorOAuthProfile.fromJson(_oauthProfile());
      expect(profile.fullName, 'Ana M. Reyes');
      expect(profile.initials, 'AR');

      final noMiddle = DonorOAuthProfile.fromJson({
        'firstname': 'ana',
        'lastname': 'reyes',
      });
      expect(noMiddle.fullName, 'ana reyes');
      expect(noMiddle.initials, 'AR');
      expect(noMiddle.avatarUrl, isNull);

      expect(DonorOAuthProfile.fromJson({}).initials, '?');
      expect(DonorOAuthProfile.fromJson({}).fullName, '');
    });

    test('DonorOAuthResult with an empty payload needs nothing', () {
      final result = DonorOAuthResult.fromJson({});

      expect(result.status, '');
      expect(result.session, isNull);
      expect(result.profile, isNull);
      expect(result.oauthTicket, isNull);
      expect(result.isSignedIn, isFalse);
      expect(result.needsRegistration, isFalse);
    });

    test('LoginResponse falls back to empty values', () {
      final session = LoginResponse.fromJson({});

      expect(session.userId, '');
      expect(session.roleType, '');
      expect(session.accessToken, '');
      expect(session.hasInterests, isFalse);
    });

    test('SocialAuthToken names the provider the way the API expects', () {
      expect(
        const SocialAuthToken(provider: SocialAuthProvider.google, token: 't')
            .apiProvider,
        'GOOGLE',
      );
      expect(
        const SocialAuthToken(provider: SocialAuthProvider.facebook, token: 't')
            .apiProvider,
        'FACEBOOK',
      );
    });
  });

  group('donor session', () {
    test('a registered donor becomes the current donor until sign-out', () {
      final donor = DonorSessionUser(
        userId: 'usr_donor_1',
        firstName: 'Ana',
        middleName: 'M.',
        lastName: 'Reyes',
        email: _email,
        phoneNumber: '09187654321',
        address: _formattedAddress,
      );

      DonorSession.instance.register(donor);
      expect(DonorSession.instance.currentDonor, same(donor));
      expect(donor.isServerBacked, isTrue);
      expect(donor.fullName, 'Ana M. Reyes');

      DonorSession.instance.signOut();
      expect(DonorSession.instance.currentDonor, isNull);
    });

    test('a donor without a user id is not server backed', () {
      final local = DonorSessionUser(
        firstName: ' Ana ',
        middleName: '  ',
        lastName: 'Reyes',
        email: _email,
      );

      expect(local.isServerBacked, isFalse);
      expect(
        DonorSessionUser(
          userId: '',
          firstName: 'Ana',
          middleName: '',
          lastName: 'Reyes',
          email: _email,
        ).isServerBacked,
        isFalse,
      );
      expect(local.fullName, 'Ana Reyes');
    });
  });
}
