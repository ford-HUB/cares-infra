// Unit tests for the self-registration process — every POST the register
// flow sends, in the order the flow sends them:
//
//   Volunteer (ID card + face):
//     POST /v1/auth/upload-id              AuthRegistrationService.uploadId
//     POST /v1/auth/verify-face            AuthRegistrationService.verifyFace
//     POST /v1/auth/extract-id             AuthRegistrationService.extractId
//     POST /v1/auth/send-verification      (covered in email_verification/)
//     POST /v1/auth/verify-otp             (covered in email_verification/)
//     POST /v1/auth/register-from-session  AuthRegistrationService.registerFromSession
//
//   Beneficiary (no ID card):
//     POST /v1/auth/start-session          AuthRegistrationService.startSession
//     POST /v1/auth/registration-document  AuthRegistrationService.uploadRegistrationDocument
//     ... then the same send-verification → verify-otp → register-from-session
//
// Plus the pieces the flow builds those requests from: the OCR → register
// payload mapping, role API values, and the volunteer field rules.
//
// The network is replaced with package:http's MockClient, so nothing here
// reaches a real server. Uploads use small throwaway files in a temp folder.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_field_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';

const _origin = 'http://api.test';
const _registrationId = 'reg_7f3a91c2';
const _email = 'maria.santos@student.uclm.edu.ph';
const _password = 'Secret#123';

const _startPath = '/v1/auth/start-session';
const _uploadIdPath = '/v1/auth/upload-id';
const _documentPath = '/v1/auth/registration-document';
const _verifyFacePath = '/v1/auth/verify-face';
const _extractPath = '/v1/auth/extract-id';
const _sendPath = '/v1/auth/send-verification';
const _verifyOtpPath = '/v1/auth/verify-otp';
const _registerPath = '/v1/auth/register-from-session';

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

/// A MockClient that keeps every request so the test can inspect them.
class _Recorder {
  _Recorder([Future<http.Response> Function(http.Request request)? reply])
    : _reply = reply ?? _defaultReply;

  final Future<http.Response> Function(http.Request request) _reply;
  final List<http.Request> requests = [];

  http.Request get last => requests.last;

  AuthRegistrationService service() => AuthRegistrationService(
    apiClient: ApiClient(
      client: MockClient((request) async {
        requests.add(request);
        return _reply(request);
      }),
    ),
  );

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
    _json(status, {
      'ok': false,
      'message': message,
      'errors': ?errors,
    });

/// What the server's OCR service hands back for a UCLM student ID.
Map<String, dynamic> _ocrData() => {
  'firstname': 'Maria',
  'lastname': 'Santos',
  'middleName': 'L.',
  'gender': 'F',
  'age': 20,
  'currentAddress': 'Looc, Mandaue City, Cebu',
  'phoneNumber': '09171234567',
  'idNumber': '2421-7447',
  'departmentName': 'College of Teacher Education',
  'majorName': '',
  'yearLevelName': '3rd Year',
  'graduationYear': 2027,
  'graduationMonth': 0,
  'graduationDay': 0,
  'volunteerType': 'STUDENT',
};

Future<http.Response> _defaultReply(http.Request request) async {
  switch (request.url.path) {
    case _startPath:
      return _ok({'registrationId': _registrationId, 'step': 'session_started'});
    case _uploadIdPath:
      return _ok({'registrationId': _registrationId, 'step': 'id_uploaded'});
    case _documentPath:
      return _ok({
        'registrationId': _registrationId,
        'document': {'name': 'barangay-certificate.pdf', 'size_bytes': 48213},
      });
    case _verifyFacePath:
      return _ok({
        'registrationId': _registrationId,
        'match': true,
        'similarity': 0.71,
        'threshold': 0.45,
        'step': 'face_verified',
        'message': 'Face matches the ID photo',
      });
    case _extractPath:
      return _ok({
        'registrationId': _registrationId,
        'step': 'ocr_completed',
        'ocrData': _ocrData(),
      });
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
    case _registerPath:
      return _ok({
        'user_id': 'usr_123',
        'account_id': 'acc_456',
        'user_biometric_id': 'bio_789',
      });
  }
  return _fail(404, 'Not found');
}

// ---------------------------------------------------------------------------
// Multipart helpers
// ---------------------------------------------------------------------------

/// One part of a captured multipart/form-data body.
class _Part {
  _Part(this.headers, this.content);

  final Map<String, String> headers;
  final String content;

  String get disposition => headers['content-disposition'] ?? '';
  String? get name => RegExp(r'name="([^"]*)"').firstMatch(disposition)?[1];
  String? get filename =>
      RegExp(r'filename="([^"]*)"').firstMatch(disposition)?[1];
  String? get contentType => headers['content-type'];
}

/// Splits a captured multipart request into its parts, keyed by field name.
Map<String, _Part> _partsOf(http.Request request) {
  final contentType = request.headers['content-type'] ?? '';
  expect(contentType, startsWith('multipart/form-data'));
  final boundary = RegExp(r'boundary=(.+)$').firstMatch(contentType)![1]!;

  final raw = utf8.decode(request.bodyBytes, allowMalformed: true);
  final parts = <String, _Part>{};
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

    final part = _Part(headers, content);
    if (part.name != null) parts[part.name!] = part;
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

late Directory _tmp;

/// A small file on disk standing in for a camera capture or picked document.
String _file(String name, [String content = 'image-bytes']) {
  final file = File('${_tmp.path}${Platform.pathSeparator}$name')
    ..writeAsStringSync(content);
  return file.path;
}

XFile _image(String name, {String? mimeType, String content = 'image-bytes'}) =>
    XFile(_file(name, content), mimeType: mimeType);

/// The OCR result after the user has reviewed it on the details step.
RegisterOcrSample _reviewedVolunteer() => RegisterOcrSampleApi.fromApiJson(
  _ocrData(),
);

void main() {
  setUpAll(() {
    _tmp = Directory.systemTemp.createTempSync('cares_registration_test_');
  });

  tearDownAll(() {
    if (_tmp.existsSync()) _tmp.deleteSync(recursive: true);
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

  // -------------------------------------------------------------------------
  // Step 1 (beneficiary) — start an ID-less session
  // -------------------------------------------------------------------------

  group('POST /auth/start-session (beneficiary)', () {
    test('sends the role and returns the session handle', () async {
      final rec = _Recorder();

      final result = await rec.service().startSession(
        roleType: RegistrationRoleType.beneficiary.apiValue,
      );

      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin$_startPath');
      expect(rec.last.headers['Content-Type'], startsWith('application/json'));
      expect(rec.body, {'roleType': 'BENEFICIARY'});
      expect(result.registrationId, _registrationId);
      expect(result.step, 'session_started');
    });

    test('defaults the step when the server leaves it out', () async {
      final rec = _Recorder(
        (_) async => _ok({'registrationId': _registrationId}),
      );

      final result = await rec.service().startSession(roleType: 'BENEFICIARY');

      expect(result.step, 'session_started');
    });

    test('a refused session throws the server message', () async {
      final rec = _Recorder(
        (_) async => _fail(503, 'Registration is temporarily unavailable'),
      );

      await expectLater(
        rec.service().startSession(roleType: 'BENEFICIARY'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 503)
              .having(
                (e) => e.message,
                'message',
                'Registration is temporarily unavailable',
              ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Step 1 (volunteer) — upload both sides of the ID
  // -------------------------------------------------------------------------

  group('POST /auth/upload-id (volunteer)', () {
    test('sends both ID sides and the role as multipart form data', () async {
      final rec = _Recorder();

      final result = await rec.service().uploadId(
        front: _image('front.jpg', mimeType: 'image/jpeg', content: 'FRONT'),
        back: _image('back.jpg', mimeType: 'image/jpeg', content: 'BACK'),
        roleType: 'VOLUNTEER',
      );

      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin$_uploadIdPath');

      final parts = _partsOf(rec.last);
      expect(parts.keys, containsAll(['roleType', 'front', 'back']));
      expect(parts['roleType']!.content, 'VOLUNTEER');
      expect(parts['front']!.filename, 'front.jpg');
      expect(parts['front']!.contentType, 'image/jpeg');
      expect(parts['front']!.content, 'FRONT');
      expect(parts['back']!.filename, 'back.jpg');
      expect(parts['back']!.content, 'BACK');

      expect(result.registrationId, _registrationId);
    });

    test('leaves the role field out when none is given', () async {
      final rec = _Recorder();

      await rec.service().uploadId(
        front: _image('f.jpg'),
        back: _image('b.jpg'),
        roleType: '',
      );

      expect(_partsOf(rec.last).containsKey('roleType'), isFalse);
    });

    test('uses the picker mime type when it is an image type', () async {
      final rec = _Recorder();

      await rec.service().uploadId(
        front: _image('capture.bin', mimeType: 'image/webp'),
        back: _image('capture2.bin', mimeType: 'image/png'),
      );

      final parts = _partsOf(rec.last);
      expect(parts['front']!.contentType, 'image/webp');
      expect(parts['back']!.contentType, 'image/png');
    });

    test('falls back to the file extension, then to JPEG', () async {
      final rec = _Recorder();

      await rec.service().uploadId(
        // A non-image mime type is ignored in favour of the extension.
        front: _image('front.PNG', mimeType: 'application/octet-stream'),
        back: _image('back.heic'),
      );

      final parts = _partsOf(rec.last);
      expect(parts['front']!.contentType, 'image/png');
      expect(parts['back']!.contentType, 'image/jpeg');
    });

    test('an unreadable ID is refused with the server message', () async {
      final rec = _Recorder(
        (_) async => _fail(422, 'We could not read your ID. Retake the photo.'),
      );

      await expectLater(
        rec.service().uploadId(
          front: _image('front.jpg'),
          back: _image('back.jpg'),
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 422)
              .having(
                (e) => e.message,
                'message',
                'We could not read your ID. Retake the photo.',
              ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Step 2 (beneficiary) — attach the supporting document
  // -------------------------------------------------------------------------

  group('POST /auth/registration-document (beneficiary)', () {
    test('sends the session id and the document as multipart', () async {
      final rec = _Recorder();

      final result = await rec.service().uploadRegistrationDocument(
        registrationId: _registrationId,
        path: _file('barangay-certificate.pdf', '%PDF-1.7'),
        name: 'barangay-certificate.pdf',
      );

      expect(rec.last.url.path, _documentPath);
      final parts = _partsOf(rec.last);
      expect(parts['registrationId']!.content, _registrationId);
      expect(parts['document']!.filename, 'barangay-certificate.pdf');
      expect(parts['document']!.contentType, 'application/pdf');
      expect(parts['document']!.content, '%PDF-1.7');

      expect(result.registrationId, _registrationId);
      expect(result.name, 'barangay-certificate.pdf');
      expect(result.sizeBytes, 48213);
    });

    test('labels known document types so the portal can preview them',
        () async {
      final cases = {
        'proof.JPEG': 'image/jpeg',
        'proof.png': 'image/png',
        'letter.docx':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'income.xlsx':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'notes.txt': 'text/plain',
        'archive.zip': 'application/octet-stream',
        'no-extension': 'application/octet-stream',
      };

      for (final entry in cases.entries) {
        final rec = _Recorder();
        await rec.service().uploadRegistrationDocument(
          registrationId: _registrationId,
          path: _file(entry.key),
          name: entry.key,
        );
        expect(
          _partsOf(rec.last)['document']!.contentType,
          entry.value,
          reason: entry.key,
        );
      }
    });

    test('an expired session is refused with the server message', () async {
      final rec = _Recorder(
        (_) async => _fail(
          404,
          'Registration session expired. Please restart registration.',
        ),
      );

      await expectLater(
        rec.service().uploadRegistrationDocument(
          registrationId: 'reg_gone',
          path: _file('proof.pdf'),
          name: 'proof.pdf',
        ),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'Registration session expired. Please restart registration.',
          ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Step 2 (volunteer) — face scan against the ID photo
  // -------------------------------------------------------------------------

  group('POST /auth/verify-face (volunteer)', () {
    test('sends the session id and the selfie as multipart', () async {
      final rec = _Recorder();

      await rec.service().verifyFace(
        registrationId: _registrationId,
        selfie: _image('selfie.jpg', mimeType: 'image/jpeg', content: 'FACE'),
      );

      expect(rec.last.url.path, _verifyFacePath);
      final parts = _partsOf(rec.last);
      expect(parts['registrationId']!.content, _registrationId);
      expect(parts['selfie']!.filename, 'selfie.jpg');
      expect(parts['selfie']!.contentType, 'image/jpeg');
      expect(parts['selfie']!.content, 'FACE');
    });

    test('parses a match with its similarity score', () async {
      final rec = _Recorder();

      final result = await rec.service().verifyFace(
        registrationId: _registrationId,
        selfie: _image('selfie.jpg'),
      );

      expect(result.registrationId, _registrationId);
      expect(result.match, isTrue);
      expect(result.similarity, closeTo(0.71, 1e-9));
      expect(result.threshold, closeTo(0.45, 1e-9));
      expect(result.step, 'face_verified');
      expect(result.message, 'Face matches the ID photo');
    });

    test('a non-match is returned (not thrown) so the step can retry',
        () async {
      final rec = _Recorder(
        (_) async => _ok({
          'registrationId': _registrationId,
          'match': false,
          'similarity': 0.21,
          'step': 'id_uploaded',
        }),
      );

      final result = await rec.service().verifyFace(
        registrationId: _registrationId,
        selfie: _image('selfie.jpg'),
      );

      expect(result.match, isFalse);
      expect(result.step, 'id_uploaded');
      // Defaults when the server leaves them out.
      expect(result.threshold, closeTo(0.4, 1e-9));
      expect(result.message, '');
    });
  });

  // -------------------------------------------------------------------------
  // Step 3 (volunteer) — OCR extraction
  // -------------------------------------------------------------------------

  group('POST /auth/extract-id (volunteer)', () {
    test('sends the session id and maps the OCR fields', () async {
      final rec = _Recorder();

      final result = await rec.service().extractId(
        registrationId: _registrationId,
      );

      expect(rec.last.method, 'POST');
      expect(rec.last.url.path, _extractPath);
      expect(rec.body, {'registrationId': _registrationId});

      expect(result.registrationId, _registrationId);
      expect(result.step, 'ocr_completed');
      final ocr = result.ocrData;
      expect(ocr.firstname, 'Maria');
      expect(ocr.lastname, 'Santos');
      expect(ocr.middleName, 'L.');
      expect(ocr.fullName, 'Maria L. Santos');
      expect(ocr.age, 20);
      expect(ocr.departmentName, 'College of Teacher Education');
      expect(ocr.yearLevelName, '3rd Year');
      expect(ocr.graduationYear, 2027);
      expect(ocr.volunteerType, 'STUDENT');
    });

    test('keeps only the digits of the ID number', () async {
      final rec = _Recorder();

      final result = await rec.service().extractId(
        registrationId: _registrationId,
      );

      expect(result.ocrData.idNumber, '24217447');
    });

    test('missing OCR fields come back empty, not null', () async {
      final rec = _Recorder(
        (_) async => _ok({
          'registrationId': _registrationId,
          'step': 'ocr_completed',
          'ocrData': <String, dynamic>{},
        }),
      );

      final ocr = (await rec.service().extractId(
        registrationId: _registrationId,
      )).ocrData;

      expect(ocr.firstname, '');
      expect(ocr.idNumber, '');
      expect(ocr.age, 0);
      expect(ocr.graduationYear, 0);
      expect(ocr.volunteerType, 'STUDENT');
    });

    test('an OCR service failure surfaces the server message', () async {
      final rec = _Recorder(
        (_) async => _fail(502, 'ID text extraction is unavailable right now'),
      );

      await expectLater(
        rec.service().extractId(registrationId: _registrationId),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 502)
              .having(
                (e) => e.message,
                'message',
                'ID text extraction is unavailable right now',
              ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Last step — create the account from the session
  // -------------------------------------------------------------------------

  group('POST /auth/register-from-session', () {
    test('sends the volunteer payload the server CreateUserSchema expects',
        () async {
      final rec = _Recorder();

      await rec.service().registerFromSession(
        registrationId: _registrationId,
        ocrData: _reviewedVolunteer(),
        roleType: 'VOLUNTEER',
        email: _email,
        password: _password,
      );

      expect(rec.last.method, 'POST');
      expect(rec.last.url.path, _registerPath);
      expect(rec.body, {
        'registrationId': _registrationId,
        'firstname': 'Maria',
        'lastname': 'Santos',
        'middle_name': 'L.',
        'role_type': 'VOLUNTEER',
        'gender': 'FEMALE',
        'age': 20,
        'current_address': 'Looc, Mandaue City, Cebu',
        'phone_number': '+639171234567',
        'account': {'email': _email, 'password': _password},
        'school_info': {
          'id_number': '24217447',
          'graduation_year': 2027,
          // Only the year is collected, so month/day fall back to 1.
          'graduation_month': 1,
          'graduation_day': 1,
          'department': {'name': 'College of Teacher Education'},
          // No major read off the card — the department stands in for it.
          'major': {'name': 'College of Teacher Education'},
          'year_level': {'name': '3rd Year'},
        },
      });
    });

    test('returns the created account ids', () async {
      final rec = _Recorder();

      final result = await rec.service().registerFromSession(
        registrationId: _registrationId,
        ocrData: _reviewedVolunteer(),
        roleType: 'VOLUNTEER',
        email: _email,
        password: _password,
      );

      expect(result['user_id'], 'usr_123');
      expect(result['account_id'], 'acc_456');
    });

    test('returns an empty map when the server sends no data', () async {
      final rec = _Recorder(
        (_) async => _json(200, {'ok': true, 'message': 'Registered'}),
      );

      final result = await rec.service().registerFromSession(
        registrationId: _registrationId,
        ocrData: _reviewedVolunteer(),
        roleType: 'VOLUNTEER',
        email: _email,
        password: _password,
      );

      expect(result, isEmpty);
    });

    test('a duplicate ID number is a conflict the flow can route back to',
        () async {
      final rec = _Recorder(
        (_) async => _fail(409, 'This ID number is already registered', [
          {'path': 'id_number', 'message': 'This ID number is already registered'},
        ]),
      );

      try {
        await rec.service().registerFromSession(
          registrationId: _registrationId,
          ocrData: _reviewedVolunteer(),
          roleType: 'VOLUNTEER',
          email: _email,
          password: _password,
        );
        fail('expected ApiException');
      } on ApiException catch (e) {
        final conflict = RegistrationConflict.fromException(e);
        expect(conflict?.field, RegistrationConflictField.idNumber);
        expect(conflict?.message, 'This ID number is already registered');
      }
    });

    test('an expired session is refused with the server message', () async {
      final rec = _Recorder(
        (_) async => _fail(
          410,
          'Registration session expired. Please restart registration.',
        ),
      );

      await expectLater(
        rec.service().registerFromSession(
          registrationId: 'reg_gone',
          ocrData: _reviewedVolunteer(),
          roleType: 'VOLUNTEER',
          email: _email,
          password: _password,
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 410)
              .having(
                (e) => e.message,
                'message',
                'Registration session expired. Please restart registration.',
              ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Payload mapping
  // -------------------------------------------------------------------------

  group('register payload mapping', () {
    Map<String, dynamic> payload(
      RegisterOcrSample sample, {
      String roleType = 'VOLUNTEER',
    }) => sample.toRegisterPayload(
      registrationId: _registrationId,
      roleType: roleType,
      email: _email,
      password: _password,
    );

    test('maps every gender spelling to the server enum', () {
      final cases = {
        'male': 'MALE',
        ' M ': 'MALE',
        'Female': 'FEMALE',
        'f': 'FEMALE',
        'Non-binary': 'OTHER',
        '': 'OTHER',
      };
      for (final entry in cases.entries) {
        expect(
          payload(RegisterOcrSample.sample.copyWith(gender: entry.key))['gender'],
          entry.value,
          reason: '"${entry.key}"',
        );
      }
    });

    test('keeps a real graduation month/day and a given major', () {
      final school =
          payload(RegisterOcrSample.sample)['school_info']
              as Map<String, dynamic>;

      expect(school['graduation_year'], 2026);
      expect(school['graduation_month'], 3);
      expect(school['graduation_day'], 15);
      expect(school['major'], {
        'name': 'BEED - Bachelor of Elementary Education',
      });
    });

    test('staff with no graduation year or year level still send valid values',
        () {
      final staff = RegisterOcrSample.sample.copyWith(
        graduationYear: 0,
        graduationMonth: 13,
        graduationDay: 40,
        yearLevelName: '',
        volunteerType: 'STAFF',
      );

      final school = payload(staff)['school_info'] as Map<String, dynamic>;

      expect(school['graduation_year'], 2000);
      expect(school['graduation_month'], 1);
      expect(school['graduation_day'], 1);
      expect(school['year_level'], {'name': 'N/A'});
    });

    test('a beneficiary sends placeholder school info keyed to the session',
        () {
      final beneficiary = RegisterOcrSample.empty(volunteerType: 'STUDENT')
          .copyWith(
            firstname: 'Ana',
            lastname: 'Reyes',
            gender: 'female',
            age: 54,
            currentAddress: 'Pajo, Lapu-Lapu City, Cebu',
            phoneNumber: '0918 765 4321',
          );

      final body = payload(beneficiary, roleType: 'BENEFICIARY');

      expect(body['role_type'], 'BENEFICIARY');
      expect(body['phone_number'], '+639187654321');
      expect(body['school_info'], {
        'id_number': 'BEN-$_registrationId',
        'graduation_year': 2000,
        'graduation_month': 1,
        'graduation_day': 1,
        'department': {'name': 'N/A'},
        'major': {'name': 'N/A'},
        'year_level': {'name': 'N/A'},
      });
    });

    test('the password is sent exactly as typed', () {
      final body = RegisterOcrSample.sample.toRegisterPayload(
        registrationId: _registrationId,
        roleType: 'VOLUNTEER',
        email: _email,
        password: ' spaced #Pass1 ',
      );

      expect(body['account'], {'email': _email, 'password': ' spaced #Pass1 '});
    });
  });

  // -------------------------------------------------------------------------
  // Whole process, end to end against the mock server
  // -------------------------------------------------------------------------

  group('full registration process', () {
    test('volunteer: ID → face → OCR → OTP → account, on one session',
        () async {
      final rec = _Recorder();
      final service = rec.service();

      final upload = await service.uploadId(
        front: _image('front.jpg', mimeType: 'image/jpeg'),
        back: _image('back.jpg', mimeType: 'image/jpeg'),
        roleType: RegistrationRoleType.volunteer.apiValue,
      );
      final face = await service.verifyFace(
        registrationId: upload.registrationId,
        selfie: _image('selfie.jpg', mimeType: 'image/jpeg'),
      );
      expect(face.match, isTrue);

      final extracted = await service.extractId(
        registrationId: upload.registrationId,
      );
      // The user fixes a misread field on the review step.
      final reviewed = extracted.ocrData.copyWith(
        currentAddress: 'Basak, Mandaue City, Cebu',
      );

      final sent = await service.sendVerificationCode(
        email: _email,
        phoneNumber: reviewed.phoneNumber,
        idNumber: reviewed.idNumber,
      );
      expect(sent.sent, isTrue);

      await service.verifyOtp(email: _email, otp: '123456');
      final account = await service.registerFromSession(
        registrationId: upload.registrationId,
        ocrData: reviewed,
        roleType: RegistrationRoleType.volunteer.apiValue,
        email: _email,
        password: _password,
      );

      expect(rec.paths, [
        _uploadIdPath,
        _verifyFacePath,
        _extractPath,
        _sendPath,
        _verifyOtpPath,
        _registerPath,
      ]);

      // Every step after the upload rides on the same session handle.
      expect(_partsOf(rec.to(_verifyFacePath))['registrationId']!.content,
          _registrationId);
      expect(rec.jsonOf(rec.to(_extractPath))['registrationId'],
          _registrationId);

      // Clashes are checked before any code is mailed.
      expect(rec.jsonOf(rec.to(_sendPath)), {
        'email': _email,
        'phone_number': '+639171234567',
        'id_number': '24217447',
        'purpose': 'registration',
      });

      final register = rec.jsonOf(rec.to(_registerPath));
      expect(register['registrationId'], _registrationId);
      expect(register['role_type'], 'VOLUNTEER');
      // The reviewed value is what gets saved, not the raw OCR read.
      expect(register['current_address'], 'Basak, Mandaue City, Cebu');
      expect(account['user_id'], 'usr_123');
    });

    test('beneficiary: session → document → OTP → account, no ID number',
        () async {
      final rec = _Recorder();
      final service = rec.service();

      final session = await service.startSession(
        roleType: RegistrationRoleType.beneficiary.apiValue,
      );
      await service.uploadRegistrationDocument(
        registrationId: session.registrationId,
        path: _file('barangay-certificate.pdf', '%PDF-1.7'),
        name: 'barangay-certificate.pdf',
      );

      final details = RegisterOcrSample.empty(volunteerType: 'STUDENT')
          .copyWith(
            firstname: 'Ana',
            lastname: 'Reyes',
            gender: 'FEMALE',
            age: 54,
            currentAddress: 'Pajo, Lapu-Lapu City, Cebu',
            phoneNumber: '09187654321',
          );

      // The flow never sends an ID number for a beneficiary.
      await service.sendVerificationCode(
        email: 'ana.reyes@example.com',
        phoneNumber: details.phoneNumber,
      );
      await service.verifyOtp(email: 'ana.reyes@example.com', otp: '654321');
      await service.registerFromSession(
        registrationId: session.registrationId,
        ocrData: details,
        roleType: RegistrationRoleType.beneficiary.apiValue,
        email: 'ana.reyes@example.com',
        password: _password,
      );

      expect(rec.paths, [
        _startPath,
        _documentPath,
        _sendPath,
        _verifyOtpPath,
        _registerPath,
      ]);
      expect(rec.paths, isNot(contains(_uploadIdPath)));
      expect(rec.paths, isNot(contains(_verifyFacePath)));

      expect(
        _partsOf(rec.to(_documentPath))['registrationId']!.content,
        _registrationId,
      );
      expect(rec.jsonOf(rec.to(_sendPath)).containsKey('id_number'), isFalse);

      final register = rec.jsonOf(rec.to(_registerPath));
      expect(register['role_type'], 'BENEFICIARY');
      expect(
        (register['school_info'] as Map)['id_number'],
        'BEN-$_registrationId',
      );
    });

    test('a failed step stops the process before the account is created',
        () async {
      final rec = _Recorder((request) async {
        if (request.url.path == _verifyFacePath) {
          return _fail(422, 'No face detected. Try again in better light.');
        }
        return _defaultReply(request);
      });
      final service = rec.service();

      final upload = await service.uploadId(
        front: _image('front.jpg'),
        back: _image('back.jpg'),
        roleType: 'VOLUNTEER',
      );

      await expectLater(
        service.verifyFace(
          registrationId: upload.registrationId,
          selfie: _image('selfie.jpg'),
        ),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'No face detected. Try again in better light.',
          ),
        ),
      );
      expect(rec.paths, [_uploadIdPath, _verifyFacePath]);
    });
  });

  // -------------------------------------------------------------------------
  // Role values and field rules the flow relies on
  // -------------------------------------------------------------------------

  group('roles and field rules', () {
    test('each registration role maps to the server RoleType value', () {
      expect(RegistrationRoleType.volunteer.apiValue, 'VOLUNTEER');
      expect(RegistrationRoleType.donor.apiValue, 'DONOR');
      expect(RegistrationRoleType.beneficiary.apiValue, 'BENEFICIARY');
    });

    test('volunteer types round-trip through their API values', () {
      for (final type in VolunteerType.values) {
        expect(VolunteerTypeX.fromApiValue(type.apiValue), type);
      }
      expect(VolunteerTypeX.fromApiValue(' alumni '), VolunteerType.alumni);
      expect(VolunteerTypeX.fromApiValue('TEACHER'), isNull);
      expect(VolunteerTypeX.fromApiValue(null), isNull);
    });

    test('age must be a whole number from 15 to 80', () {
      expect(VolunteerFieldRules.ageError(''), 'Age is required');
      expect(
        VolunteerFieldRules.ageError('14'),
        'Enter an age between 15 and 80',
      );
      expect(
        VolunteerFieldRules.ageError('81'),
        'Enter an age between 15 and 80',
      );
      expect(
        VolunteerFieldRules.ageError('twenty'),
        'Enter an age between 15 and 80',
      );
      expect(VolunteerFieldRules.ageError(' 15 '), isNull);
      expect(VolunteerFieldRules.ageError('80'), isNull);
    });

    test('students graduate this year up to six years out', () {
      final year = DateTime.now().year;
      final range = 'Enter a year from $year to ${year + 6}';

      expect(
        VolunteerFieldRules.graduationYearError('', VolunteerType.student),
        'Graduation year is required',
      );
      expect(
        VolunteerFieldRules.graduationYearError('27', VolunteerType.student),
        'Enter a 4-digit year',
      );
      expect(
        VolunteerFieldRules.graduationYearError(
          '${year - 1}',
          VolunteerType.student,
        ),
        range,
      );
      expect(
        VolunteerFieldRules.graduationYearError(
          '${year + 7}',
          VolunteerType.student,
        ),
        range,
      );
      expect(
        VolunteerFieldRules.graduationYearError('$year', VolunteerType.student),
        isNull,
      );
      expect(
        VolunteerFieldRules.graduationYearError(
          '${year + 6}',
          VolunteerType.student,
        ),
        isNull,
      );
    });

    test('alumni graduated from 1950 up to this year; staff are not checked',
        () {
      final year = DateTime.now().year;

      expect(
        VolunteerFieldRules.graduationYearError('1949', VolunteerType.alumni),
        'Enter a year from 1950 to $year',
      );
      expect(
        VolunteerFieldRules.graduationYearError(
          '${year + 1}',
          VolunteerType.alumni,
        ),
        'Enter a year from 1950 to $year',
      );
      expect(
        VolunteerFieldRules.graduationYearError('1950', VolunteerType.alumni),
        isNull,
      );
      expect(
        VolunteerFieldRules.graduationYearError('1800', VolunteerType.staff),
        isNull,
      );
      expect(
        VolunteerFieldRules.isValidGraduationYear(0, VolunteerType.student),
        isFalse,
      );
    });
  });
}
