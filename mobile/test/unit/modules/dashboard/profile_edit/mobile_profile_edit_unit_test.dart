// Unit tests for editing the mobile profile — the screen opened from the
// avatar on the Profile tab, for volunteers, donors and beneficiaries:
//
//   GET  /v1/profile/me/mobile                 ProfileService.fetchMyProfile / syncRoleAccount
//   PUT  /v1/profile/me/mobile                 ProfileService.updateMyProfile (multipart + avatar)
//   POST /v1/profile/me/mobile/school-record   ProfileService.applySchoolRecord
//   POST /v1/profile/me/mobile/residency       ProfileService.uploadResidencyDocument
//   MobileProfile / MobileProfileUpdate / ProfileAddress / ProfileCompletion /
//   ResidencyDocument, the Philippine phone helpers, and
//   MobileProfileEditScreen — loading, every field, validation, the dirty
//   check, save, the locked school record and residency address, household
//   size and the profile photo.
//
// The screen builds its own ProfileService, so the network is package:http's
// MockClient through `http.runWithClient`. The file and image pickers are
// fakes. Every profile here is a local fixture — nothing reaches a server.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/presentation/screens/mobile_profile_edit_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

const _origin = 'http://api.test';
const _profilePath = '/v1/profile/me/mobile';
const _residencyPath = '/v1/profile/me/mobile/residency';
const _schoolPath = '/v1/profile/me/mobile/school-record';

const _volunteer = RoleAccountStore.volunteer;
const _donor = RoleAccountStore.donor;
const _beneficiary = RoleAccountStore.beneficiary;

const _address = '123 Rizal St., Pajo, Lapu-Lapu City, Cebu';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

Map<String, dynamic> _structuredAddress({
  String street = '123 Rizal St.',
  String barangay = 'Pajo',
}) => {
  'street': street,
  'barangay': barangay,
  'city': 'Lapu-Lapu City',
  'province': 'Cebu',
  'full': '$street, $barangay, Lapu-Lapu City, Cebu',
};

Map<String, dynamic> _residencyDoc({
  String id = 'doc-1',
  String name = 'barangay_certificate.pdf',
  String mime = 'application/pdf',
  int size = 245760,
}) => {
  'residency_document_id': id,
  'file_name': name,
  'mime_type': mime,
  'size_bytes': size,
  'extracted_address': _address,
  'uploaded_at': '2031-03-12T04:00:00.000Z',
};

Map<String, dynamic> _profileJson({
  String role = _volunteer,
  String? profilingRole,
  String first = 'Juan',
  String? middle = 'Santos',
  String last = 'Dela Cruz',
  String phone = '09171234567',
  String gender = 'MALE',
  int age = 21,
  Map<String, dynamic>? address,
  int? household,
  bool hasImage = false,
  List<Map<String, dynamic>> residency = const [],
  bool withSchool = true,
}) => {
  'user_id': 'user-1',
  'role_type': role,
  'profiling_role': profilingRole ?? role,
  'firstname': first,
  'middle_name': middle,
  'lastname': last,
  'email': 'juan.delacruz@uclm.edu.ph',
  'phone_number': phone,
  'gender': gender,
  'age': age,
  'address': address ?? _structuredAddress(),
  'household_size': ?household,
  'residency_documents': residency,
  'has_profile_image': hasImage,
  'sign_in_providers': const <String>[],
  'has_password': true,
  'member_since': '2031-01-05T00:00:00.000Z',
  'profile_completion': {
    'percent': 80,
    'complete': false,
    'completed_steps': 4,
    'total_steps': 5,
    'missing': ['interests'],
  },
  if (role == _volunteer && withSchool)
    'volunteer': {
      'school': {
        'id_number': '12345678',
        'department': 'College of Computer Studies',
        'major': 'BS Information Technology',
        'year_level': '3rd Year',
        'graduation_year': 2032,
      },
      'interests': const <String>[],
    },
  if (role == _donor)
    'donor': {
      'sign_in_providers': ['GOOGLE'],
      'has_password': true,
    },
  if (role == _beneficiary) 'beneficiary': const <String, dynamic>{},
};

MobileProfile _profile([Map<String, dynamic>? json]) =>
    MobileProfile.fromJson(json ?? _profileJson());

/// Puts [json] in the role account store, as the Profile tab would have.
void _cache(Map<String, dynamic> json) {
  RoleAccountStore.instance.applyServerProfile(MobileProfile.fromJson(json));
}

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

typedef _Handler = Future<http.Response> Function(http.Request request);

class _Server {
  _Server({Map<String, dynamic>? profile})
    : profile = profile ?? _profileJson();

  /// What `GET /profile/me/mobile` answers.
  Map<String, dynamic> profile;

  final Map<String, _Handler> overrides = {};
  final List<http.Request> requests = [];

  List<http.Request> where(String method, String path) =>
      requests.where((r) => r.method == method && r.url.path == path).toList();

  http.Client client() => MockClient((request) async {
    requests.add(request);
    final custom = overrides['${request.method} ${request.url.path}'];
    if (custom != null) return custom(request);

    final path = request.url.path;
    if (request.method == 'GET' && path == _profilePath) return _ok(profile);
    if (request.method == 'PUT' && path == _profilePath) {
      // Echo the saved fields back as the re-read profile.
      final f = _fieldsOf(request);
      final address = f['current_address'];
      profile = {
        ...profile,
        'firstname': f['firstname'],
        'middle_name': f['middle_name'],
        'lastname': f['lastname'],
        'phone_number': f['phone_number'],
        'gender': f['gender'],
        'age': int.parse(f['age']!),
        'household_size': (f['household_size'] ?? '').isEmpty
            ? null
            : int.parse(f['household_size']!),
        if (address != null) 'address': {'full': address},
        if (_filesOf(request).isNotEmpty) 'has_profile_image': true,
      };
      return _ok(profile);
    }
    if (request.method == 'POST' && path == _residencyPath) {
      profile = {
        ...profile,
        'address': _structuredAddress(street: 'Purok 3', barangay: 'Mactan'),
        'residency_documents': [_residencyDoc(id: 'doc-2')],
      };
      return _ok(profile);
    }
    if (request.method == 'POST' && path == _schoolPath) return _ok(profile);
    return _fail(404, 'Not found');
  });

  ProfileService service() =>
      ProfileService(apiClient: ApiClient(client: client()));
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok(Object data) =>
    _json(200, {'ok': true, 'message': 'OK', 'data': data});

http.Response _fail(int status, String message, {Object? errors}) =>
    _json(status, {'ok': false, 'message': message, 'errors': ?errors});

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

List<_Part> _filesOf(http.Request request) =>
    _partsOf(request).where((p) => p.filename != null).toList();

// ---------------------------------------------------------------------------
// Fake pickers
// ---------------------------------------------------------------------------

class _FakeFilePicker extends FilePicker {
  FilePickerResult? next;
  final List<List<String>?> extensions = [];

  @override
  Future<FilePickerResult?> pickFiles({
    String? dialogTitle,
    String? initialDirectory,
    FileType type = FileType.any,
    List<String>? allowedExtensions,
    Function(FilePickerStatus)? onFileLoading,
    bool allowCompression = false,
    int compressionQuality = 0,
    bool allowMultiple = false,
    bool withData = false,
    bool withReadStream = false,
    bool lockParentWindow = false,
    bool readSequential = false,
  }) async {
    extensions.add(allowedExtensions);
    return next;
  }
}

/// Answers image_picker's platform channel with a file path (or an error).
class _FakeImagePicker {
  static const channel = MethodChannel('plugins.flutter.io/image_picker');

  String? path;
  bool fails = false;
  final List<Map<Object?, Object?>> calls = [];

  Future<Object?> handle(MethodCall call) async {
    if (call.method != 'pickImage') return null;
    calls.add(call.arguments as Map<Object?, Object?>);
    if (fails) throw PlatformException(code: 'no_access');
    return path;
  }
}

// ---------------------------------------------------------------------------
// Screen harness
// ---------------------------------------------------------------------------

class _Outcome {
  bool closed = false;
  MobileProfile? saved;
}

/// Opens the edit screen for [role] from a launcher, as the Profile tab does.
Future<_Outcome> _openEdit(
  WidgetTester tester, {
  String role = _volunteer,
}) async {
  tester.view.physicalSize = const Size(900, 3200);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  final outcome = _Outcome();
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () async {
                outcome.saved = await MobileProfileEditScreen.open(
                  context,
                  role,
                );
                outcome.closed = true;
              },
              child: const Text('Edit profile'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Edit profile'));
  await tester.pumpAndSettle();
  expect(find.byType(MobileProfileEditScreen), findsOneWidget);
  return outcome;
}

/// The text field under a [RegisterFormField] with this label.
Finder _input(String label) => find.descendant(
  of: find.byWidgetPredicate((w) => w is RegisterFormField && w.label == label),
  matching: find.byType(TextField),
);

String _text(WidgetTester tester, String label) =>
    tester.widget<TextField>(_input(label)).controller!.text;

String? _error(WidgetTester tester, String label) =>
    tester.widget<TextField>(_input(label)).decoration?.errorText;

Future<void> _type(WidgetTester tester, String label, String text) async {
  await tester.enterText(_input(label), text);
  await tester.pump();
}

Finder get _saveButton => find.ancestor(
  of: find.text('Save changes'),
  matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
);

bool _canSave(WidgetTester tester) =>
    tester.widget<ButtonStyleButton>(_saveButton).onPressed != null;

Future<void> _save(WidgetTester tester) async {
  await tester.tap(_saveButton);
  await tester.pumpAndSettle();
}

/// Saves with real file reads (photo or document), which the fake clock
/// would stall.
Future<void> _saveWithFiles(WidgetTester tester) async {
  await tester.runAsync(() async {
    await tester.tap(_saveButton);
    await Future<void>.delayed(const Duration(milliseconds: 300));
  });
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder.first);
  await tester.tap(finder.first);
  await tester.pumpAndSettle();
}

/// Lets a chain of UI futures and real file reads finish: the sheet result
/// needs the fake clock, `MultipartFile.fromPath` needs the real one.
Future<void> _settleIo(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 40)),
    );
  }
  await tester.pump(const Duration(milliseconds: 400));
}

/// A valid 1×1 PNG, so a picked photo can be read and decoded.
final _png = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  late Directory tmp;
  late String photoPath;
  late String certificatePath;
  late _Server server;
  late _FakeFilePicker filePicker;
  late _FakeImagePicker imagePicker;

  setUpAll(() {
    tmp = Directory.systemTemp.createTempSync('cares_profile_edit_');
    photoPath = (File(
      '${tmp.path}${Platform.pathSeparator}selfie.png',
    )..writeAsBytesSync(_png)).path;
    certificatePath = (File(
      '${tmp.path}${Platform.pathSeparator}barangay_certificate.pdf',
    )..writeAsStringSync('%PDF-1.4 barangay certificate')).path;
  });

  tearDownAll(() {
    // The photo preview (Image.file) can still hold selfie.png open on
    // Windows; a leftover temp folder is harmless, so don't fail on it.
    try {
      if (tmp.existsSync()) tmp.deleteSync(recursive: true);
    } on FileSystemException {
      // left for the OS to clean up
    }
  });

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    RoleAccountStore.instance.clear();
    server = _Server();
    filePicker = _FakeFilePicker();
    FilePicker.platform = filePicker;
    imagePicker = _FakeImagePicker()..path = photoPath;
    messenger.setMockMethodCallHandler(
      _FakeImagePicker.channel,
      imagePicker.handle,
    );
  });

  tearDown(() {
    messenger.setMockMethodCallHandler(_FakeImagePicker.channel, null);
    RoleAccountStore.instance.clear();
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  /// A widget test with the screen's network faked.
  void screenTest(
    String description,
    Future<void> Function(WidgetTester) body,
  ) {
    testWidgets(description, (tester) async {
      await http.runWithClient(() => body(tester), server.client);
    });
  }

  // =========================================================================
  // Phone helpers
  // =========================================================================

  group('Philippine phone numbers', () {
    test('normalize to +639XXXXXXXXX', () {
      expect(normalizePhilippinePhone('09171234567'), '+639171234567');
      expect(normalizePhilippinePhone('0917-123-4567'), '+639171234567');
      expect(normalizePhilippinePhone(' 0917 123 4567 '), '+639171234567');
      expect(normalizePhilippinePhone('639171234567'), '+639171234567');
      expect(normalizePhilippinePhone('+639171234567'), '+639171234567');
      expect(normalizePhilippinePhone(' 12345 '), '12345'); // left as typed
    });

    test('valid only when complete', () {
      expect(isValidPhilippinePhone('09171234567'), isTrue);
      expect(isValidPhilippinePhone('+639171234567'), isTrue);
      expect(isValidPhilippinePhone('0917123456'), isFalse);
      expect(isValidPhilippinePhone('08171234567'), isFalse);
      expect(isValidPhilippinePhone(''), isFalse);
    });

    test('error only for a non-empty, incomplete number', () {
      expect(philippinePhoneError(''), isNull);
      expect(philippinePhoneError('09171234567'), isNull);
      expect(
        philippinePhoneError('0917'),
        'Enter an 11-digit PH mobile number (09XXXXXXXXX)',
      );
    });

    test('the formatter keeps digits and rewrites a full local number', () {
      const f = PhilippinePhoneFormatter();
      TextEditingValue type(String old, String next) => f.formatEditUpdate(
        TextEditingValue(text: old),
        TextEditingValue(
          text: next,
          selection: TextSelection.collapsed(offset: next.length),
        ),
      );
      expect(type('', '0917-12').text, '091712');
      expect(type('', '09171234567').text, '+639171234567');
      expect(type('', '09171234567').selection.baseOffset, 13);
      expect(type('', '+63+917').text, '+63917');
      expect(type('+639171234567', '+6391712345678').text, '+639171234567');
    });
  });

  // =========================================================================
  // Models
  // =========================================================================

  group('MobileProfile', () {
    test('reads every field of a volunteer record', () {
      final p = _profile();
      expect(p.userId, 'user-1');
      expect(p.roleType, _volunteer);
      expect(p.profilingRole, _volunteer);
      expect(p.fullName, 'Juan Santos Dela Cruz');
      expect(p.phoneNumber, '09171234567');
      expect(p.gender, 'MALE');
      expect(p.age, 21);
      expect(p.address.display, _address);
      expect(p.memberSinceLabel, 'January 2031');
      expect(p.completion.percent, 80);
      expect(p.completion.missing, ['interests']);
      final school = p.volunteer!.school!;
      expect(school.department, 'College of Computer Studies');
      expect(school.idNumber, '12345678');
      expect(school.graduationYear, 2032);
      expect(p.donor, isNull);
      expect(p.beneficiary, isNull);
    });

    test('a sparse record gets safe defaults', () {
      final p = MobileProfile.fromJson(const {});
      expect(p.firstName, '');
      expect(p.gender, 'OTHER');
      expect(p.age, 0);
      expect(p.householdSize, isNull);
      expect(p.hasPassword, isTrue); // never locks email/password by mistake
      expect(p.residencyDocuments, isEmpty);
      expect(p.address.display, '');
      expect(p.completion.percent, 0);
    });

    test('full name skips a blank middle name', () {
      expect(_profile(_profileJson(middle: '  ')).fullName, 'Juan Dela Cruz');
      expect(_profile(_profileJson(middle: null)).fullName, 'Juan Dela Cruz');
    });

    test('social sign-in label', () {
      MobileProfile with_(List<String> providers, bool password) =>
          MobileProfile.fromJson({
            'sign_in_providers': providers,
            'has_password': password,
          });
      expect(with_(['GOOGLE'], false).usesSocialSignIn, isTrue);
      expect(with_(['GOOGLE'], true).usesSocialSignIn, isFalse);
      expect(with_(const [], false).usesSocialSignIn, isFalse);
      expect(with_(['GOOGLE'], false).signInProviderLabel, 'Google');
      expect(
        with_(['GOOGLE', 'FACEBOOK'], false).signInProviderLabel,
        'Google and Facebook',
      );
      expect(
        with_(['GOOGLE', 'FACEBOOK', 'APPLE'], false).signInProviderLabel,
        'Google, Facebook and Apple',
      );
      expect(
        with_(const [], false).signInProviderLabel,
        'your sign-in provider',
      );
    });

    test('address display: split fields, else the free text', () {
      expect(
        ProfileAddress.fromJson(const {
          'street': ' ',
          'city': 'Cebu City',
          'full': 'x',
        }).display,
        'Cebu City',
      );
      expect(
        ProfileAddress.fromJson(const {
          'full': '  Sitio Mangga, near the chapel ',
        }).display,
        'Sitio Mangga, near the chapel',
      );
    });

    test('completion labels for the "what\'s left" hint', () {
      expect(ProfileCompletion.labelFor('school_record'), 'School information');
      expect(ProfileCompletion.labelFor('household_size'), 'Household size');
      expect(ProfileCompletion.labelFor('something_new'), 'something_new');
    });

    test('residency documents: type, size and upload date', () {
      final pdf = ResidencyDocument.fromJson(_residencyDoc());
      expect(pdf.isPdf, isTrue);
      expect(pdf.isImage, isFalse);
      expect(pdf.sizeLabel, '240 KB');
      expect(pdf.uploadedLabel, '12 Mar 2031');
      final jpg = ResidencyDocument.fromJson(
        _residencyDoc(mime: 'image/jpeg', size: 1572864),
      );
      expect(jpg.isImage, isTrue);
      expect(jpg.sizeLabel, '1.5 MB');
      expect(
        ResidencyDocument.fromJson(_residencyDoc(size: 900)).sizeLabel,
        '900 B',
      );
      expect(ResidencyDocument.fromJson(const {}).fileName, 'document');
    });

    test('donor sign-in summary', () {
      expect(
        DonorServerProfile.fromJson(const {
          'sign_in_providers': ['GOOGLE'],
          'has_password': true,
        }).signInLabel,
        'Google · Email & password',
      );
      expect(DonorServerProfile.fromJson(const {}).signInLabel, 'Not set');
    });
  });

  group('MobileProfileUpdate', () {
    test('pre-fills from the record and sends every editable column', () {
      final update = MobileProfileUpdate.fromProfile(
        _profile(_profileJson(household: 4)),
      );
      expect(update.toFields(), {
        'firstname': 'Juan',
        'middle_name': 'Santos',
        'lastname': 'Dela Cruz',
        'phone_number': '09171234567',
        'gender': 'MALE',
        'age': '21',
        'current_address': _address,
        'household_size': '4',
      });
    });

    test('trims, leaves out a locked address, and clears household size', () {
      const update = MobileProfileUpdate(
        firstName: '  Ana ',
        middleName: ' ',
        lastName: ' Reyes ',
        phoneNumber: ' +639171234567 ',
        gender: 'FEMALE',
        age: 30,
        address: null,
      );
      expect(update.toFields(), {
        'firstname': 'Ana',
        'middle_name': '',
        'lastname': 'Reyes',
        'phone_number': '+639171234567',
        'gender': 'FEMALE',
        'age': '30',
        'household_size': '',
      });
    });
  });

  // =========================================================================
  // Service
  // =========================================================================

  group('ProfileService', () {
    setUp(() => AuthSession.setAccessToken('jwt.volunteer'));

    test('fetchMyProfile scopes completion to the role being shown', () async {
      final service = server.service();

      await service.fetchMyProfile(roleType: 'volunteer');
      await service.fetchMyProfile(roleType: 'DIRECTOR');
      await service.fetchMyProfile();

      final urls = server.requests.map((r) => r.url.toString()).toList();
      expect(urls, [
        '$_origin$_profilePath?role=VOLUNTEER',
        '$_origin$_profilePath?role=VOLUNTEER', // staff use the volunteer side
        '$_origin$_profilePath',
      ]);
      expect(
        server.requests.first.headers['authorization'],
        'Bearer jwt.volunteer',
      );
    });

    test('syncRoleAccount does nothing without a session', () async {
      AuthSession.clear();

      expect(
        await server.service().syncRoleAccount(roleType: _volunteer),
        isNull,
      );
      expect(server.requests, isEmpty);
    });

    test('syncRoleAccount writes the record and photo onto the role', () async {
      server.profile = _profileJson(hasImage: true);

      final profile = await server.service().syncRoleAccount(
        roleType: _volunteer,
      );

      final account = RoleAccountStore.instance.byType(_volunteer)!;
      expect(profile!.firstName, 'Juan');
      expect(account.serverProfile?.lastName, 'Dela Cruz');
      expect(account.displayName, 'Juan Santos Dela Cruz');
      final avatar = Uri.parse(account.avatarUrl!);
      expect(avatar.path, '/v1/profile/me/mobile/avatar');
      expect(avatar.queryParameters['role'], _volunteer);
      expect(avatar.queryParameters['v'], isNotEmpty);
    });

    test('no photo on file means no avatar URL', () {
      final service = server.service();
      expect(service.avatarUrlFor(_profile()), isNull);
      expect(service.avatarHeaders, {'Authorization': 'Bearer jwt.volunteer'});
      expect(
        service.residencyDocumentUrl('doc-1'),
        '$_origin/v1/profile/me/mobile/residency/doc-1',
      );
    });

    test('updateMyProfile puts the fields as multipart', () async {
      final saved = await server.service().updateMyProfile(
        const MobileProfileUpdate(
          firstName: 'Juana',
          middleName: '',
          lastName: 'Dela Cruz',
          phoneNumber: '+639171234567',
          gender: 'FEMALE',
          age: 22,
          address: _address,
        ),
        roleType: _donor,
      );

      final request = server.where('PUT', _profilePath).single;
      expect(request.url.query, 'role=DONOR');
      expect(_fieldsOf(request), {
        'firstname': 'Juana',
        'middle_name': '',
        'lastname': 'Dela Cruz',
        'phone_number': '+639171234567',
        'gender': 'FEMALE',
        'age': '22',
        'current_address': _address,
        'household_size': '',
      });
      expect(_filesOf(request), isEmpty);
      expect(saved.firstName, 'Juana');
    });

    test('updateMyProfile attaches the photo with its type', () async {
      await server.service().updateMyProfile(
        MobileProfileUpdate.fromProfile(_profile()),
        avatar: XFile(photoPath, name: 'selfie.png'),
      );

      final photo = _filesOf(server.where('PUT', _profilePath).single).single;
      expect(photo.name, 'avatar');
      expect(photo.filename, 'selfie.png');
      expect(photo.headers['content-type'], 'image/png');
    });

    test('applySchoolRecord posts the registration handle', () async {
      await server.service().applySchoolRecord(registrationId: 'reg-77');

      expect(jsonDecode(server.where('POST', _schoolPath).single.body), {
        'registrationId': 'reg-77',
      });
    });

    test(
      'uploadResidencyDocument sends the file and applies the new address',
      () async {
        final profile = await server.service().uploadResidencyDocument(
          path: certificatePath,
          fileName: 'barangay_certificate.pdf',
          roleType: _beneficiary,
        );

        final request = server.where('POST', _residencyPath).single;
        expect(request.url.query, 'role=BENEFICIARY');
        final doc = _filesOf(request).single;
        expect(doc.name, 'document');
        expect(doc.filename, 'barangay_certificate.pdf');
        expect(doc.headers['content-type'], 'application/pdf');
        expect(doc.content, '%PDF-1.4 barangay certificate');
        expect(
          profile.address.display,
          'Purok 3, Mactan, Lapu-Lapu City, Cebu',
        );
        expect(profile.residencyDocuments.single.id, 'doc-2');
      },
    );

    test('a refusal carries the server message', () async {
      server.overrides['GET $_profilePath'] = (_) async =>
          _fail(401, 'Session expired.');

      await expectLater(
        server.service().fetchMyProfile(),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)),
      );
    });
  });

  // =========================================================================
  // Screen — loading
  // =========================================================================

  group('MobileProfileEditScreen — loading', () {
    screenTest('uses the record the Profile tab already synced', (
      tester,
    ) async {
      _cache(_profileJson());

      await _openEdit(tester);

      expect(server.requests, isEmpty);
      expect(find.text('Edit profile'), findsWidgets);
      expect(_text(tester, 'First name'), 'Juan');
      expect(_text(tester, 'Middle name (optional)'), 'Santos');
      expect(_text(tester, 'Last name'), 'Dela Cruz');
      expect(_text(tester, 'Mobile number'), '+639171234567'); // canonical
      expect(_text(tester, 'Age'), '21');
      expect(find.text('Male'), findsOneWidget);
      expect(_canSave(tester), isFalse); // nothing changed yet
    });

    screenTest('fetches the record when nothing is cached', (tester) async {
      AuthSession.setAccessToken('jwt.volunteer');

      await _openEdit(tester);

      expect(
        server.where('GET', _profilePath).single.url.query,
        'role=VOLUNTEER',
      );
      expect(_text(tester, 'First name'), 'Juan');
      expect(
        RoleAccountStore.instance.byType(_volunteer)?.serverProfile,
        isNotNull,
      );
    });

    screenTest('signed out it asks to sign in', (tester) async {
      await _openEdit(tester);

      expect(find.text('Sign in to edit your profile.'), findsOneWidget);
      expect(find.text('Save changes'), findsNothing);
      expect(server.requests, isEmpty);
    });

    screenTest('a load failure shows the message and can retry', (
      tester,
    ) async {
      AuthSession.setAccessToken('jwt.volunteer');
      server.overrides['GET $_profilePath'] = (_) async =>
          _fail(503, 'Profile service is down.');

      await _openEdit(tester);

      expect(find.text('Profile service is down.'), findsOneWidget);

      server.overrides.clear();
      await _tap(tester, find.text('Try again'));

      expect(server.where('GET', _profilePath), hasLength(2));
      expect(_text(tester, 'First name'), 'Juan');
    });

    screenTest('an unreadable reply gets the generic message', (tester) async {
      AuthSession.setAccessToken('jwt.volunteer');
      server.overrides['GET $_profilePath'] = (_) async =>
          _ok(['not', 'a', 'map']);

      await _openEdit(tester);

      expect(find.text('Could not load your profile.'), findsOneWidget);
    });

    screenTest('an age of 0 on file opens empty without an error', (
      tester,
    ) async {
      _cache(_profileJson(age: 0));

      await _openEdit(tester);

      expect(_text(tester, 'Age'), isEmpty); // 0 means not on file
      expect(_error(tester, 'Age'), isNull); // no shouting before editing
      expect(_canSave(tester), isFalse);
    });

    screenTest('an unknown gender on file counts as a change on open', (
      tester,
    ) async {
      _cache(_profileJson(gender: 'NONBINARY'));

      await _openEdit(tester);

      // The dropdown falls back to "Prefer not to say" (OTHER), but the dirty
      // check compares that against the NONBINARY on file — so the form is
      // "changed" before the person touches anything, and Save is live.
      expect(find.text('Prefer not to say'), findsOneWidget);
      expect(_canSave(tester), isTrue);

      await _save(tester);

      // …and saving untouched quietly rewrites the gender on file to OTHER.
      expect(
        _fieldsOf(server.where('PUT', _profilePath).single)['gender'],
        'OTHER',
      );
    });

    screenTest(
      'so with an unknown gender and no age, "Required" shows at once',
      (tester) async {
        _cache(_profileJson(gender: 'NONBINARY', age: 0));

        await _openEdit(tester);

        expect(_error(tester, 'Age'), 'Required');
        expect(_canSave(tester), isFalse);
      },
    );

    screenTest('back without saving returns nothing', (tester) async {
      _cache(_profileJson());
      final outcome = await _openEdit(tester);

      await _tap(tester, find.byIcon(Icons.arrow_back_ios_new_rounded));

      expect(outcome.closed, isTrue);
      expect(outcome.saved, isNull);
      expect(server.requests, isEmpty);
    });
  });

  // =========================================================================
  // Screen — fields and validation
  // =========================================================================

  group('MobileProfileEditScreen — fields', () {
    setUp(() => _cache(_profileJson()));

    screenTest('a change enables Save, undoing it disables it again', (
      tester,
    ) async {
      await _openEdit(tester);

      await _type(tester, 'First name', 'Juana');
      expect(_canSave(tester), isTrue);

      await _type(tester, 'First name', 'Juan');
      expect(_canSave(tester), isFalse);
    });

    screenTest('surrounding spaces alone are not a change', (tester) async {
      await _openEdit(tester);

      await _type(tester, 'Last name', '  Dela Cruz  ');

      expect(_canSave(tester), isFalse);
    });

    screenTest('first and last name are required once editing', (tester) async {
      await _openEdit(tester);

      await _type(tester, 'First name', '   ');
      expect(_error(tester, 'First name'), 'Required');
      expect(_canSave(tester), isFalse);

      await _type(tester, 'First name', 'Juan');
      await _type(tester, 'Last name', '');
      expect(_error(tester, 'Last name'), 'Required');
      expect(_canSave(tester), isFalse);
    });

    screenTest('the middle name is optional', (tester) async {
      await _openEdit(tester);

      await _type(tester, 'Middle name (optional)', '');

      expect(_canSave(tester), isTrue);
    });

    screenTest('age must be 1 to 150', (tester) async {
      await _openEdit(tester);

      for (final bad in ['0', '151']) {
        await _type(tester, 'Age', bad);
        expect(
          _error(tester, 'Age'),
          'Enter an age between 1 and 150',
          reason: bad,
        );
        expect(_canSave(tester), isFalse, reason: bad);
      }
      await _type(tester, 'Age', '');
      expect(_error(tester, 'Age'), 'Required');

      await _type(tester, 'Age', '1a5');
      expect(_text(tester, 'Age'), '15'); // digits only
      expect(_error(tester, 'Age'), isNull);
      expect(_canSave(tester), isTrue);

      await _type(tester, 'Age', '1234');
      expect(_text(tester, 'Age').length, lessThanOrEqualTo(3));
    });

    screenTest('an incomplete phone number blocks saving', (tester) async {
      await _openEdit(tester);

      await _type(tester, 'Mobile number', '0918');

      expect(
        _error(tester, 'Mobile number'),
        'Enter an 11-digit PH mobile number (09XXXXXXXXX)',
      );
      expect(_canSave(tester), isFalse);

      await _type(tester, 'Mobile number', '09181112222');
      expect(_text(tester, 'Mobile number'), '+639181112222');
      expect(_error(tester, 'Mobile number'), isNull);
      expect(_canSave(tester), isTrue);
    });

    screenTest('changing the gender is a change', (tester) async {
      await _openEdit(tester);

      await _tap(tester, find.text('Male'));
      await _tap(tester, find.text('Female').last);

      expect(find.text('Female'), findsOneWidget);
      expect(_canSave(tester), isTrue);
    });
  });

  // =========================================================================
  // Screen — saving
  // =========================================================================

  group('MobileProfileEditScreen — save', () {
    setUp(() => _cache(_profileJson()));

    screenTest('sends the whole form and returns the saved profile', (
      tester,
    ) async {
      final outcome = await _openEdit(tester);

      await _type(tester, 'First name', '  Juana ');
      await _type(tester, 'Age', '22');
      await _tap(tester, find.text('Male'));
      await _tap(tester, find.text('Female').last);
      await _save(tester);

      final request = server.where('PUT', _profilePath).single;
      expect(request.url.query, 'role=VOLUNTEER');
      expect(_fieldsOf(request), {
        'firstname': 'Juana',
        'middle_name': 'Santos',
        'lastname': 'Dela Cruz',
        'phone_number': '+639171234567', // stored the canonical way
        'gender': 'FEMALE',
        'age': '22',
        'current_address': _address, // untouched, sent back as on file
        'household_size': '',
      });
      expect(_filesOf(request), isEmpty);
      expect(find.text('Profile updated.'), findsOneWidget);
      expect(outcome.closed, isTrue);
      expect(outcome.saved?.firstName, 'Juana');
      expect(
        RoleAccountStore.instance.byType(_volunteer)?.serverProfile?.firstName,
        'Juana',
      );
    });

    screenTest('shows a spinner and locks Back while saving', (tester) async {
      final reply = Completer<http.Response>();
      server.overrides['PUT $_profilePath'] = (_) => reply.future;
      final outcome = await _openEdit(tester);
      await _type(tester, 'First name', 'Juana');

      await tester.tap(_saveButton);
      await tester.pump();

      expect(find.text('Save changes'), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await tester.tap(
        find.byIcon(Icons.arrow_back_ios_new_rounded),
        warnIfMissed: false,
      );
      await tester.pump();
      expect(outcome.closed, isFalse);

      reply.complete(_ok(_profileJson(first: 'Juana')));
      await tester.pumpAndSettle();
      expect(outcome.saved?.firstName, 'Juana');
    });

    screenTest('a number already on another account is flagged on the field', (
      tester,
    ) async {
      server.overrides['PUT $_profilePath'] = (_) async =>
          _fail(409, 'This mobile number is already used by another account.');
      final outcome = await _openEdit(tester);

      await _type(tester, 'Mobile number', '09181112222');
      await _save(tester);

      expect(
        _error(tester, 'Mobile number'),
        'This mobile number is already used by another account.',
      );
      expect(
        find.text('This mobile number is already used by another account.'),
        findsWidgets,
      ); // field + snackbar
      expect(_canSave(tester), isFalse);
      expect(outcome.closed, isFalse);

      // Editing the number clears the conflict.
      await _type(tester, 'Mobile number', '09183334444');
      expect(_error(tester, 'Mobile number'), isNull);
      expect(_canSave(tester), isTrue);
    });

    screenTest('a validation reply shows its first field message', (
      tester,
    ) async {
      server.overrides['PUT $_profilePath'] = (_) async => _fail(
        400,
        'Validation failed',
        errors: [
          {
            'path': 'firstname',
            'message': 'First name has invalid characters.',
          },
          {'path': 'age', 'message': 'Age is out of range.'},
        ],
      );
      await _openEdit(tester);
      await _type(tester, 'First name', 'Juan<script>');

      await _save(tester);

      expect(find.text('First name has invalid characters.'), findsOneWidget);
      expect(find.text('Validation failed'), findsNothing);
      expect(_canSave(tester), isTrue); // can fix and try again
      expect(_error(tester, 'Mobile number'), isNull);
    });

    screenTest('a refusal without field errors shows the message', (
      tester,
    ) async {
      server.overrides['PUT $_profilePath'] = (_) async =>
          _fail(503, 'Try again in a minute.');
      await _openEdit(tester);
      await _type(tester, 'First name', 'Juana');

      await _save(tester);

      expect(find.text('Try again in a minute.'), findsOneWidget);
    });

    screenTest('an unreadable reply gets the generic message', (tester) async {
      server.overrides['PUT $_profilePath'] = (_) async => _ok(['broken']);
      await _openEdit(tester);
      await _type(tester, 'First name', 'Juana');

      await _save(tester);

      expect(
        find.text('Could not save your profile. Please try again.'),
        findsOneWidget,
      );
      expect(_canSave(tester), isTrue);
    });
  });

  // =========================================================================
  // Screen — address (volunteers and donors)
  // =========================================================================

  group('MobileProfileEditScreen — address', () {
    screenTest('opens with the structured address in the fields', (
      tester,
    ) async {
      _cache(_profileJson(role: _donor));
      await _openEdit(tester, role: _donor);

      expect(_text(tester, 'Barangay'), 'Pajo');
      expect(_text(tester, 'City/Municipality'), 'Lapu-Lapu City');
      expect(_text(tester, 'Street'), '123 Rizal St.');
      expect(find.byType(ProfileLegacyAddressNote), findsNothing);
    });

    screenTest('a new street is saved as the formatted address', (
      tester,
    ) async {
      _cache(_profileJson(role: _donor));
      await _openEdit(tester, role: _donor);

      await _type(tester, 'Street', '45 Mabini St.');
      await tester.tapAt(const Offset(5, 5)); // close any suggestions
      await tester.pumpAndSettle();
      expect(_canSave(tester), isTrue);
      await _save(tester);

      expect(
        _fieldsOf(server.where('PUT', _profilePath).single)['current_address'],
        '45 Mabini St., Pajo, Lapu-Lapu City, Cebu',
      );
    });

    screenTest('a street that is too short blocks saving', (tester) async {
      _cache(_profileJson(role: _donor));
      await _openEdit(tester, role: _donor);

      await _type(tester, 'Street', 'A');

      expect(_canSave(tester), isFalse);
      expect(_error(tester, 'Street'), isNull); // not until the field is left

      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      expect(_error(tester, 'Street'), 'Street is too short.');
    });

    screenTest('picking another barangay keeps the street', (tester) async {
      _cache(_profileJson(role: _donor));
      await _openEdit(tester, role: _donor);

      await _type(tester, 'Barangay', 'Mactan');
      final option = find.descendant(
        of: find.byType(ListTile),
        matching: find.text('Mactan'),
      );
      await _tap(tester, option);

      expect(_text(tester, 'City/Municipality'), 'Lapu-Lapu City');
      expect(_canSave(tester), isTrue);
      await _save(tester);

      expect(
        _fieldsOf(server.where('PUT', _profilePath).single)['current_address'],
        '123 Rizal St., Mactan, Lapu-Lapu City, Cebu',
      );
    });

    screenTest('an older free-text address stays on file until replaced', (
      tester,
    ) async {
      _cache(
        _profileJson(
          role: _donor,
          address: {'full': 'Sitio Mangga, near the chapel'},
        ),
      );
      await _openEdit(tester, role: _donor);

      expect(find.byType(ProfileLegacyAddressNote), findsOneWidget);
      expect(
        find.textContaining(
          'Sitio Mangga, near the chapel',
          findRichText: true,
        ),
        findsOneWidget,
      );

      // A name change still saves; the old address goes back untouched.
      await _type(tester, 'First name', 'Juana');
      await _save(tester);

      expect(
        _fieldsOf(server.where('PUT', _profilePath).single)['current_address'],
        'Sitio Mangga, near the chapel',
      );
    });
  });

  // =========================================================================
  // Screen — role-specific sections
  // =========================================================================

  group('MobileProfileEditScreen — volunteer school record', () {
    screenTest('shows the school record, locked', (tester) async {
      _cache(_profileJson());
      await _openEdit(tester);

      expect(find.text('School record'), findsOneWidget);
      expect(find.text('College of Computer Studies'), findsOneWidget);
      expect(find.text('BS Information Technology'), findsOneWidget);
      expect(find.text('3rd Year'), findsOneWidget);
      expect(find.text('12345678'), findsOneWidget);
      expect(_input('Department'), findsNothing); // not a text field
    });

    screenTest('tapping it explains how to change it; "Not now" stays', (
      tester,
    ) async {
      _cache(_profileJson());
      await _openEdit(tester);

      await _tap(tester, find.text('College of Computer Studies'));

      expect(find.text('Set from your ID'), findsOneWidget);
      expect(find.text('Re-verify ID'), findsOneWidget);
      await _tap(tester, find.text('Not now'));

      expect(find.text('Set from your ID'), findsNothing);
      expect(find.byType(MobileProfileEditScreen), findsOneWidget);
      expect(server.requests, isEmpty);
    });

    screenTest('donors have no school record', (tester) async {
      _cache(_profileJson(role: _donor));
      await _openEdit(tester, role: _donor);

      expect(find.text('School record'), findsNothing);
      expect(find.byType(ProfileHouseholdSizeCard), findsNothing);
    });

    screenTest('a volunteer side whose record is not a volunteer shows none', (
      tester,
    ) async {
      // A donor whose volunteer side a director approved: the server record
      // stays a donor's, so there is no school card to show.
      RoleAccountStore.instance.applyServerProfile(
        MobileProfile.fromJson(
          _profileJson(role: _donor, profilingRole: _volunteer),
        ),
      );
      await _openEdit(tester);

      expect(find.text('School record'), findsNothing);
    });
  });

  group('MobileProfileEditScreen — beneficiary', () {
    Map<String, dynamic> beneficiary({
      int? household = 4,
      List<Map<String, dynamic>>? docs,
    }) => _profileJson(
      role: _beneficiary,
      household: household,
      residency: docs ?? [_residencyDoc()],
    );

    screenTest('the address is locked to the proof of residency', (
      tester,
    ) async {
      _cache(beneficiary());
      server.profile = beneficiary();
      await _openEdit(tester, role: _beneficiary);

      expect(find.byType(ProfileResidencyAddressCard), findsOneWidget);
      expect(
        find.text('Read from your proof of residency — tap to update it.'),
        findsOneWidget,
      );
      expect(_input('Street'), findsNothing); // no typed address
      expect(find.text('Pajo'), findsOneWidget);
      expect(find.text('Lapu-Lapu City, Cebu'), findsOneWidget);
      expect(find.text('barangay_certificate.pdf'), findsOneWidget);
    });

    screenTest('no documents yet says how to add one', (tester) async {
      _cache(beneficiary(docs: const []));
      server.profile = beneficiary(docs: const []);
      await _openEdit(tester, role: _beneficiary);

      expect(find.textContaining('No documents yet.'), findsOneWidget);
    });

    screenTest('household size is picked from chips', (tester) async {
      _cache(beneficiary());
      server.profile = beneficiary();
      await _openEdit(tester, role: _beneficiary);

      for (final label in [
        '1 member',
        '2 members',
        '5 members',
        '6+ members',
      ]) {
        expect(find.text(label), findsOneWidget, reason: label);
      }
      bool selected(String label) => tester
          .widget<FilterChip>(find.widgetWithText(FilterChip, label))
          .selected;
      expect(selected('4 members'), isTrue);
      expect(_canSave(tester), isFalse);

      await _tap(tester, find.text('6+ members'));
      expect(selected('6+ members'), isTrue);
      expect(selected('4 members'), isFalse);
      expect(_canSave(tester), isTrue);

      await _save(tester);

      final fields = _fieldsOf(server.where('PUT', _profilePath).single);
      expect(fields['household_size'], '6');
      expect(fields.containsKey('current_address'), isFalse); // locked
      expect(
        server.where('PUT', _profilePath).single.url.query,
        'role=BENEFICIARY',
      );
    });

    screenTest('tapping the selected size clears it', (tester) async {
      _cache(beneficiary());
      server.profile = beneficiary();
      await _openEdit(tester, role: _beneficiary);

      await _tap(tester, find.text('4 members'));
      await _save(tester);

      expect(
        _fieldsOf(server.where('PUT', _profilePath).single)['household_size'],
        '',
      );
    });

    screenTest('tapping the address explains, "Not now" uploads nothing', (
      tester,
    ) async {
      _cache(beneficiary());
      server.profile = beneficiary();
      await _openEdit(tester, role: _beneficiary);

      await _tap(tester, find.text('Pajo'));

      expect(find.text('Proof of residency needed'), findsOneWidget);
      await _tap(tester, find.text('Not now'));
      expect(server.requests, isEmpty);
    });

    screenTest('a barangay certificate updates the address', (tester) async {
      _cache(beneficiary());
      server.profile = beneficiary();
      filePicker.next = FilePickerResult([
        PlatformFile(
          name: 'barangay_certificate.pdf',
          path: certificatePath,
          size: 29,
        ),
      ]);
      await _openEdit(tester, role: _beneficiary);

      await _tap(tester, find.text('Upload'));
      await _tap(tester, find.text('Upload document'));
      expect(find.text('Choose a file'), findsOneWidget);
      await tester.tap(find.text('Choose a file'));
      await _settleIo(tester);

      expect(filePicker.extensions.single, [
        'pdf',
        'jpg',
        'jpeg',
        'png',
        'webp',
      ]);
      final request = server.where('POST', _residencyPath).single;
      expect(request.url.query, 'role=BENEFICIARY');
      expect(_filesOf(request).single.filename, 'barangay_certificate.pdf');
      expect(
        find.text(
          'Address updated to "Purok 3, Mactan, Lapu-Lapu City, Cebu".',
        ),
        findsOneWidget,
      );
      expect(find.text('Mactan'), findsOneWidget);
      // The address moved server-side; nothing typed is waiting to save.
      expect(_canSave(tester), isFalse);
    });

    screenTest('an unreadable certificate says why', (tester) async {
      _cache(beneficiary());
      server.profile = beneficiary();
      server.overrides['POST $_residencyPath'] = (_) async => _fail(
        400,
        'Validation failed',
        errors: [
          {'message': 'We could not read an address on this document.'},
        ],
      );
      filePicker.next = FilePickerResult([
        PlatformFile(
          name: 'barangay_certificate.pdf',
          path: certificatePath,
          size: 29,
        ),
      ]);
      await _openEdit(tester, role: _beneficiary);

      await _tap(tester, find.text('Upload'));
      await _tap(tester, find.text('Upload document'));
      await tester.tap(find.text('Choose a file'));
      await _settleIo(tester);

      expect(
        find.text('We could not read an address on this document.'),
        findsOneWidget,
      );
      expect(find.text('Pajo'), findsOneWidget); // unchanged
    });

    screenTest('a cancelled file pick uploads nothing', (tester) async {
      _cache(beneficiary());
      server.profile = beneficiary();
      await _openEdit(tester, role: _beneficiary);

      await _tap(tester, find.text('Upload'));
      await _tap(tester, find.text('Upload document'));
      await _tap(tester, find.text('Choose a file'));

      expect(server.requests, isEmpty);
    });
  });

  // =========================================================================
  // Screen — profile photo
  // =========================================================================

  group('MobileProfileEditScreen — photo', () {
    setUp(() => _cache(_profileJson()));

    screenTest('a picked photo alone is enough to save, and is uploaded', (
      tester,
    ) async {
      final outcome = await _openEdit(tester);
      expect(find.text('Change photo'), findsOneWidget);

      await _tap(tester, find.text('Change photo'));
      expect(find.text('Take a photo'), findsOneWidget);
      await _tap(tester, find.text('Choose from gallery'));

      expect(imagePicker.calls.single['source'], 1); // gallery
      expect(imagePicker.calls.single['imageQuality'], 85);
      expect(imagePicker.calls.single['maxWidth'], 1200.0);
      expect(find.text('Photo selected'), findsOneWidget);
      expect(_canSave(tester), isTrue);

      await _saveWithFiles(tester);

      final photo = _filesOf(server.where('PUT', _profilePath).single).single;
      expect(photo.name, 'avatar');
      expect(photo.filename, 'selfie.png');
      await tester.pumpAndSettle();
      expect(outcome.saved?.hasProfileImage, isTrue);
    });

    screenTest('the camera uses the front lens', (tester) async {
      await _openEdit(tester);

      await _tap(tester, find.text('Change photo'));
      await _tap(tester, find.text('Take a photo'));

      expect(imagePicker.calls.single['source'], 0); // camera
      expect(imagePicker.calls.single['cameraDevice'], 1); // front
    });

    screenTest('a cancelled pick changes nothing', (tester) async {
      imagePicker.path = null;
      await _openEdit(tester);

      await _tap(tester, find.text('Change photo'));
      await _tap(tester, find.text('Choose from gallery'));

      expect(find.text('Change photo'), findsOneWidget);
      expect(_canSave(tester), isFalse);
    });

    screenTest('a picker failure is explained', (tester) async {
      imagePicker.fails = true;
      await _openEdit(tester);

      await _tap(tester, find.text('Change photo'));
      await _tap(tester, find.text('Choose from gallery'));

      expect(
        find.text(
          'Could not open gallery. Try again or enable permissions in Settings.',
        ),
        findsOneWidget,
      );
      expect(_canSave(tester), isFalse);
    });
  });
}
