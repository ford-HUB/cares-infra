// Shared fixtures for the self-registration unit tests:
//   volunteer_registration_unit_test.dart
//   beneficiary_registration_unit_test.dart
//
// Not a test file itself (no `_test.dart` suffix), so `flutter test` only
// runs it through the files that import it.
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

const testOrigin = 'http://api.test';
const testRegistrationId = 'reg_7f3a91c2';
const testEmail = 'maria.santos@student.uclm.edu.ph';
const testPassword = 'Secret#123';

const startSessionPath = '/v1/auth/start-session';
const uploadIdPath = '/v1/auth/upload-id';
const uploadManualIdPath = '/v1/auth/upload-manual-id';
const registrationDocumentPath = '/v1/auth/registration-document';
const verifyFacePath = '/v1/auth/verify-face';
const extractIdPath = '/v1/auth/extract-id';
const sendVerificationPath = '/v1/auth/send-verification';
const verifyOtpPath = '/v1/auth/verify-otp';
const registerFromSessionPath = '/v1/auth/register-from-session';

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

typedef MockReply = Future<http.Response> Function(http.Request request);

/// A MockClient that keeps every request so the test can inspect them.
class RequestRecorder {
  RequestRecorder([MockReply? reply]) : _reply = reply ?? defaultReply;

  final MockReply _reply;
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

  http.Request to(String path) => requests.lastWhere((r) => r.url.path == path);

  Map<String, dynamic> jsonOf(http.Request request) =>
      jsonDecode(request.body) as Map<String, dynamic>;

  Map<String, dynamic> get body => jsonOf(last);
}

http.Response jsonResponse(int status, Map<String, dynamic> body) =>
    http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

http.Response okResponse(Map<String, dynamic> data) =>
    jsonResponse(200, {'ok': true, 'message': 'OK', 'data': data});

http.Response failResponse(
  int status,
  String message, [
  List<Object>? errors,
]) =>
    jsonResponse(status, {'ok': false, 'message': message, 'errors': ?errors});

/// What the server's OCR service hands back for a UCLM student ID.
Map<String, dynamic> ocrData() => {
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

/// The happy-path reply for every registration endpoint.
Future<http.Response> defaultReply(http.Request request) async {
  switch (request.url.path) {
    case startSessionPath:
      return okResponse({
        'registrationId': testRegistrationId,
        'step': 'session_started',
      });
    case uploadIdPath:
    case uploadManualIdPath:
      return okResponse({
        'registrationId': testRegistrationId,
        'step': 'id_uploaded',
      });
    case registrationDocumentPath:
      return okResponse({
        'registrationId': testRegistrationId,
        'document': {'name': 'barangay-certificate.pdf', 'size_bytes': 48213},
      });
    case verifyFacePath:
      return okResponse({
        'registrationId': testRegistrationId,
        'match': true,
        'similarity': 0.71,
        'threshold': 0.45,
        'step': 'face_verified',
        'message': 'Face matches the ID photo',
      });
    case extractIdPath:
      return okResponse({
        'registrationId': testRegistrationId,
        'step': 'ocr_completed',
        'ocrData': ocrData(),
      });
    case sendVerificationPath:
      return okResponse({
        'email': testEmail,
        'sent': true,
        'reused': false,
        'verified': false,
        'expiresInSeconds': 300,
      });
    case verifyOtpPath:
      return okResponse({'email': testEmail, 'verified': true});
    case registerFromSessionPath:
      return okResponse({
        'user_id': 'usr_123',
        'account_id': 'acc_456',
        'user_biometric_id': 'bio_789',
      });
  }
  return failResponse(404, 'Not found');
}

// ---------------------------------------------------------------------------
// Multipart helpers
// ---------------------------------------------------------------------------

/// One part of a captured multipart/form-data body.
class FormPart {
  FormPart(this.headers, this.content);

  final Map<String, String> headers;
  final String content;

  String get disposition => headers['content-disposition'] ?? '';
  String? get name => RegExp(r'name="([^"]*)"').firstMatch(disposition)?[1];
  String? get filename =>
      RegExp(r'filename="([^"]*)"').firstMatch(disposition)?[1];
  String? get contentType => headers['content-type'];
}

/// Splits a captured multipart request into its parts, keyed by field name.
Map<String, FormPart> partsOf(http.Request request) {
  final contentType = request.headers['content-type'] ?? '';
  expect(contentType, startsWith('multipart/form-data'));
  final boundary = RegExp(r'boundary=(.+)$').firstMatch(contentType)![1]!;

  final raw = utf8.decode(request.bodyBytes, allowMalformed: true);
  final parts = <String, FormPart>{};
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

    final part = FormPart(headers, content);
    if (part.name != null) parts[part.name!] = part;
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

late Directory _tmp;

/// Registers the setUp/tearDown every registration test file needs: a temp
/// folder for uploads, a dotenv pointing at [testOrigin], and a clean
/// [AuthSession]. Call it first thing in `main()`.
void setUpRegistrationTests() {
  setUpAll(() {
    _tmp = Directory.systemTemp.createTempSync('cares_registration_test_');
  });

  tearDownAll(() {
    if (_tmp.existsSync()) _tmp.deleteSync(recursive: true);
  });

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$testOrigin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });
}

/// A small file on disk standing in for a camera capture or picked document.
String tempFile(String name, [String content = 'image-bytes']) {
  final file = File('${_tmp.path}${Platform.pathSeparator}$name')
    ..writeAsStringSync(content);
  return file.path;
}

XFile tempImage(
  String name, {
  String? mimeType,
  String content = 'image-bytes',
}) => XFile(tempFile(name, content), mimeType: mimeType);

/// The register-from-session body the flow builds from [sample].
Map<String, dynamic> registerPayload(
  RegisterOcrSample sample, {
  String roleType = 'VOLUNTEER',
  bool studentBeneficiary = false,
  String password = testPassword,
}) => sample.toRegisterPayload(
  registrationId: testRegistrationId,
  roleType: roleType,
  email: testEmail,
  password: password,
  studentBeneficiary: studentBeneficiary,
);

/// Matches an [ApiException] with the given server message (and status).
Matcher throwsApiException(String message, {int? status}) {
  var matcher = isA<ApiException>().having(
    (e) => e.message,
    'message',
    message,
  );
  if (status != null) {
    matcher = matcher.having((e) => e.statusCode, 'statusCode', status);
  }
  return throwsA(matcher);
}
