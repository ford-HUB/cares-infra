// Unit tests for the beneficiary's "Request Assistance" form — filing a new
// request and editing one the relief desk has not picked up yet:
//
//   AssistanceRequestFormScreen        new + edit modes, required fields,
//                                      "Other" need, urgency, location
//                                      details, proof documents, submit
//   POST  /v1/assistance-requests/me       AssistanceRequestStore.submit
//   PATCH /v1/assistance-requests/me/:id   AssistanceRequestStore.update
//   showRequestSubmittedDialog          the confirmation with the reference
//
// The form talks to the app-wide AssistanceRequestStore, whose service is
// built the first time the store is touched — so the store is created once
// inside `http.runWithClient`, with a MockClient that forwards to the
// current test's fake server. The file picker is a fake, and the household
// size comes from a beneficiary profile seeded in RoleAccountStore. Every
// request and profile here is a local fixture — nothing reaches a server.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/screens/assistance_request_form_screen.dart';

const _origin = 'http://api.test';
const _minePath = '/v1/assistance-requests/me';
const _email = 'rosa.reyes@example.com';

const _descriptionHint =
    'Share details that help the relief desk understand your needs...';
const _detailsHint = 'Landmark or address details (optional)';
const _otherHint = 'Please specify what you need';
const _incompleteHint =
    'Choose what you need and describe your situation to continue.';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/// One request as `v1/assistance-requests/me` returns it.
Map<String, dynamic> _requestJson({
  String id = 'req-1',
  String reference = 'AR-2031-0001',
  String title = 'Food Pack',
  String category = 'FOOD',
  String description = 'Our house was flooded and we lost our rice supply.',
  String urgency = 'HIGH',
  String status = 'PENDING',
  double? latitude,
  double? longitude,
  String? locationDetails,
  List<Map<String, dynamic>> attachments = const [],
  bool canEdit = true,
  bool canCancel = true,
}) => {
  'assistance_request_id': id,
  'reference_label': reference,
  'title': title,
  'category': category,
  'description': description,
  'urgency': urgency,
  'status': status,
  'assessment_status': 'NOT_STARTED',
  'household_size': 4,
  'created_at': '2031-03-10T12:00:00.000Z',
  'updated_at': '2031-03-11T12:00:00.000Z',
  'items': const <String>[],
  'timeline': const <Map<String, dynamic>>[],
  'location_latitude': ?latitude,
  'location_longitude': ?longitude,
  'location_details': ?locationDetails,
  'attachments': attachments,
  'can_edit': canEdit,
  'can_cancel': canCancel,
};

/// The flood-relief request the edit tests open.
AssistanceRequest _filed({
  String title = 'Food Pack',
  String category = 'FOOD',
  String urgency = 'HIGH',
  bool pinned = true,
  List<Map<String, dynamic>> attachments = const [],
}) => assistanceRequestFromJson(
  _requestJson(
    title: title,
    category: category,
    urgency: urgency,
    latitude: pinned ? 10.3297 : null,
    longitude: pinned ? 123.9496 : null,
    locationDetails: pinned ? 'Beside the Pajo chapel' : null,
    attachments: attachments,
  ),
);

/// Signs the beneficiary in with a profile that has [householdSize] on file.
void _seedProfile({int? householdSize = 4}) {
  RoleAccountStore.instance.applyServerProfile(
    MobileProfile.fromJson({
      'user_id': 'user-77',
      'role_type': 'BENEFICIARY',
      'profiling_role': 'BENEFICIARY',
      'firstname': 'Rosa',
      'lastname': 'Reyes',
      'email': _email,
      'household_size': ?householdSize,
      'member_since': '2031-01-05T00:00:00.000Z',
    }),
  );
}

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

class _Server {
  /// Overrides the reply to a new request; null files it as AR-2031-0042.
  Future<http.Response> Function(http.Request request)? onCreate;

  /// Overrides the reply to an edit; null echoes the edit back.
  Future<http.Response> Function(http.Request request)? onUpdate;

  final List<http.Request> requests = [];

  List<http.Request> where(String method, String path) =>
      requests.where((r) => r.method == method && r.url.path == path).toList();

  Future<http.Response> handle(http.Request request) async {
    requests.add(request);
    final path = request.url.path;
    if (request.method == 'POST' && path == _minePath) {
      final custom = onCreate;
      if (custom != null) return custom(request);
      final fields = _fieldsOf(request);
      return _ok(
        _requestJson(
          id: 'req-new',
          reference: 'AR-2031-0042',
          title: fields['title']!,
          category: fields['category']!,
          description: fields['description']!,
          urgency: fields['urgency']!,
          canEdit: true,
        ),
      );
    }
    if (request.method == 'PATCH' && path.startsWith('$_minePath/')) {
      final custom = onUpdate;
      if (custom != null) return custom(request);
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      return _ok(
        _requestJson(
          id: path.split('/').last,
          title: body['title'] as String,
          category: body['category'] as String,
          description: body['description'] as String,
          urgency: body['urgency'] as String,
          latitude: (body['location_latitude'] as num?)?.toDouble(),
          longitude: (body['location_longitude'] as num?)?.toDouble(),
          locationDetails: body['location_details'] as String?,
        ),
      );
    }
    return _fail(404, 'Not found');
  }
}

/// The server the store's MockClient forwards to; replaced in every setUp.
var _server = _Server();

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok(Map<String, dynamic> data) =>
    _json(200, {'ok': true, 'message': 'OK', 'data': data});

http.Response _fail(int status, String message) =>
    _json(status, {'ok': false, 'message': message});

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
// Fake file picker
// ---------------------------------------------------------------------------

class _FakePicker extends FilePicker {
  FilePickerResult? next;
  Object? error;
  final List<Map<String, Object?>> calls = [];

  void willPick(String name, {required String path, int size = 48213}) {
    next = FilePickerResult([PlatformFile(name: name, path: path, size: size)]);
    error = null;
  }

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
    calls.add({
      'type': type,
      'allowedExtensions': allowedExtensions,
      'allowMultiple': allowMultiple,
      'withData': withData,
    });
    final failure = error;
    if (failure != null) throw failure;
    return next;
  }
}

late _FakePicker _picker;

// ---------------------------------------------------------------------------
// Form harness
// ---------------------------------------------------------------------------

class _Outcome {
  bool closed = false;
  AssistanceRequest? result;
}

/// Opens the form from a launcher page — a new request, or an edit of
/// [editing] — on a tall surface so every field is built without scrolling.
Future<_Outcome> _openForm(
  WidgetTester tester, {
  AssistanceRequest? editing,
}) async {
  tester.view.physicalSize = const Size(900, 2800);
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
                outcome.result = editing == null
                    ? await Navigator.of(context).push<AssistanceRequest>(
                        MaterialPageRoute(
                          builder: (_) => const AssistanceRequestFormScreen(),
                        ),
                      )
                    : await AssistanceRequestFormScreen.openEdit(
                        context,
                        editing,
                      );
                outcome.closed = true;
              },
              child: const Text('Open form'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open form'));
  await tester.pumpAndSettle();
  expect(find.byType(AssistanceRequestFormScreen), findsOneWidget);
  return outcome;
}

Finder _field(String hint) => find.byWidgetPredicate(
  (w) => w is TextField && w.decoration?.hintText == hint,
);

Finder _button(String label) => find.ancestor(
  of: find.text(label),
  matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
);

bool _enabled(WidgetTester tester, String label) =>
    tester.widget<ButtonStyleButton>(_button(label)).onPressed != null;

bool _chipSelected(WidgetTester tester, String label) =>
    tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, label)).selected;

String _text(WidgetTester tester, String hint) =>
    tester.widget<TextField>(_field(hint)).controller!.text;

Future<void> _pickNeed(WidgetTester tester, String need) async {
  await tester.tap(find.text('Select what you need'));
  await tester.pumpAndSettle();
  await tester.tap(find.text(need).last);
  await tester.pumpAndSettle();
}

Future<void> _pickCategory(WidgetTester tester, String from, String to) async {
  await tester.tap(find.text(from));
  await tester.pumpAndSettle();
  await tester.tap(find.text(to).last);
  await tester.pumpAndSettle();
}

Future<void> _describe(WidgetTester tester, String text) async {
  await tester.enterText(_field(_descriptionHint), text);
  await tester.pump();
}

/// The quickest complete form: "Food Pack" and a description.
Future<void> _fillMinimum(WidgetTester tester) async {
  await _pickNeed(tester, 'Food Pack');
  await _describe(tester, 'Our house was flooded and we lost our rice.');
}

Future<void> _tapSubmit(WidgetTester tester, String label) async {
  await tester.tap(_button(label));
  await tester.pumpAndSettle();
}

/// Submits with real file reads (attachments go through
/// `MultipartFile.fromPath`), which the fake clock would stall.
Future<void> _submitWithFiles(WidgetTester tester) async {
  await tester.runAsync(() async {
    await tester.tap(_button('Submit Request'));
    await Future<void>.delayed(const Duration(milliseconds: 300));
  });
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

void main() {
  late Directory tmp;
  late String proofPdf;
  late String billPdf;
  late String certPdf;
  var account = 0;

  setUpAll(() {
    tmp = Directory.systemTemp.createTempSync('cares_assistance_form_');
    String write(String name, String body) {
      final file = File('${tmp.path}${Platform.pathSeparator}$name')
        ..writeAsStringSync(body);
      return file.path;
    }

    proofPdf = write('barangay_certificate.pdf', '%PDF-1.4 barangay cert');
    billPdf = write('electric_bill.pdf', '%PDF-1.4 electric bill');
    certPdf = write('medical_cert.pdf', '%PDF-1.4 medical cert');

    // The store builds its service (and http client) on first touch.
    http.runWithClient(
      () => AssistanceRequestStore.instance,
      () => MockClient((request) => _server.handle(request)),
    );
  });

  tearDownAll(() {
    if (tmp.existsSync()) tmp.deleteSync(recursive: true);
  });

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    _server = _Server();
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    // A fresh token per test, so the account-scoped store starts empty.
    AuthSession.setAccessToken('jwt.beneficiary.${account++}');
    RoleAccountStore.instance.clear();
    _seedProfile();
    _picker = _FakePicker();
    FilePicker.platform = _picker;
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    RoleAccountStore.instance.clear();
  });

  // -------------------------------------------------------------------------
  // New request — the empty form
  // -------------------------------------------------------------------------

  group('new request — fields', () {
    testWidgets('starts empty with sensible defaults', (tester) async {
      await _openForm(tester);

      expect(find.text('Request Assistance'), findsOneWidget);
      expect(
        find.textContaining('A field officer reviews every request'),
        findsOneWidget,
      );
      expect(find.text('What do you need?'), findsOneWidget);
      expect(find.text('Select what you need'), findsOneWidget);
      expect(find.text('Food'), findsOneWidget); // first category
      expect(_chipSelected(tester, 'Normal'), isTrue);
      for (final level in ['Low', 'High', 'Urgent']) {
        expect(_chipSelected(tester, level), isFalse);
      }
      expect(_text(tester, _descriptionHint), isEmpty);
      expect(find.text('No location pinned yet'), findsOneWidget);
      expect(find.text('Remove pin'), findsNothing);
      expect(find.textContaining('up to 3 files'), findsOneWidget);
      expect(find.text('Take photo'), findsOneWidget);
      expect(find.text('Choose file'), findsOneWidget);
      expect(find.text(_incompleteHint), findsOneWidget);
      expect(_enabled(tester, 'Submit Request'), isFalse);
    });

    testWidgets('lists every need, ending with Other', (tester) async {
      await _openForm(tester);

      await tester.tap(find.text('Select what you need'));
      await tester.pumpAndSettle();

      for (final need in kAssistanceNeedOptions) {
        expect(find.text(need), findsWidgets, reason: need);
      }
      expect(kAssistanceNeedOptions.last, kOtherOption);
    });

    testWidgets('lists every assistance category', (tester) async {
      await _openForm(tester);

      await tester.tap(find.text('Food'));
      await tester.pumpAndSettle();

      for (final category in kAssistanceCategories) {
        expect(find.text(category), findsWidgets, reason: category);
      }
    });

    testWidgets('needs both a need and a description to submit', (
      tester,
    ) async {
      await _openForm(tester);

      await _pickNeed(tester, 'Food Pack');
      expect(_enabled(tester, 'Submit Request'), isFalse);
      expect(find.text(_incompleteHint), findsOneWidget);

      await _describe(tester, 'We lost our rice supply in the flood.');
      expect(_enabled(tester, 'Submit Request'), isTrue);
      expect(find.text(_incompleteHint), findsNothing);

      await _describe(tester, '');
      expect(_enabled(tester, 'Submit Request'), isFalse);
    });

    testWidgets('a description of only spaces does not count', (tester) async {
      await _openForm(tester);

      await _pickNeed(tester, 'Food Pack');
      await _describe(tester, '    \n  ');

      expect(_enabled(tester, 'Submit Request'), isFalse);
      expect(find.text(_incompleteHint), findsOneWidget);
    });

    testWidgets('a description alone is not enough', (tester) async {
      await _openForm(tester);

      await _describe(tester, 'We lost our rice supply in the flood.');

      expect(_enabled(tester, 'Submit Request'), isFalse);
    });

    testWidgets('"Other" asks what is needed and requires it', (tester) async {
      await _openForm(tester);
      expect(_field(_otherHint), findsNothing);

      await _pickNeed(tester, kOtherOption);
      await _describe(tester, 'Our roof was torn off by the typhoon.');

      expect(_field(_otherHint), findsOneWidget);
      expect(_enabled(tester, 'Submit Request'), isFalse);

      await tester.enterText(_field(_otherHint), '   ');
      await tester.pump();
      expect(_enabled(tester, 'Submit Request'), isFalse);

      await tester.enterText(_field(_otherHint), 'Roofing materials');
      await tester.pump();
      expect(_enabled(tester, 'Submit Request'), isTrue);
    });

    testWidgets('switching away from "Other" hides its field', (tester) async {
      await _openForm(tester);

      await _pickNeed(tester, kOtherOption);
      expect(_field(_otherHint), findsOneWidget);

      await tester.tap(find.text(kOtherOption).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('School supplies').last);
      await tester.pumpAndSettle();

      expect(_field(_otherHint), findsNothing);
    });

    testWidgets('only one urgency is selected at a time', (tester) async {
      await _openForm(tester);

      await tester.tap(find.text('Urgent'));
      await tester.pump();

      expect(_chipSelected(tester, 'Urgent'), isTrue);
      expect(_chipSelected(tester, 'Normal'), isFalse);

      await tester.tap(find.text('Low'));
      await tester.pump();

      expect(_chipSelected(tester, 'Low'), isTrue);
      expect(_chipSelected(tester, 'Urgent'), isFalse);
    });
  });

  // -------------------------------------------------------------------------
  // New request — submitting
  // -------------------------------------------------------------------------

  group('new request — submit', () {
    testWidgets('files the request with the server codes', (tester) async {
      await _openForm(tester);

      await _pickNeed(tester, 'Medicine / medical check-up');
      await _pickCategory(tester, 'Food', 'Medical Assistance');
      await tester.tap(find.text('Urgent'));
      await tester.pump();
      await _describe(tester, '  My father needs his maintenance meds.  ');
      await _tapSubmit(tester, 'Submit Request');

      final request = _server.where('POST', _minePath).single;
      expect(request.url.toString(), '$_origin$_minePath');
      expect(request.headers['authorization'], startsWith('Bearer jwt.'));
      expect(_fieldsOf(request), {
        'title': 'Medicine / medical check-up',
        'category': 'MEDICAL',
        'description': 'My father needs his maintenance meds.',
        'urgency': 'URGENT',
      });
      expect(_filesOf(request), isEmpty);
    });

    testWidgets('maps every category and urgency label to its code', (
      tester,
    ) async {
      expect(kAssistanceCategoryCodes, {
        'Food': 'FOOD',
        'Medical Assistance': 'MEDICAL',
        'Educational Support': 'EDUCATION',
        'Financial Assistance': 'FINANCIAL',
        'Livelihood': 'LIVELIHOOD',
        'Disaster Relief': 'DISASTER_RELIEF',
      });
      expect(kAssistanceUrgencyCodes, {
        'Low': 'LOW',
        'Normal': 'NORMAL',
        'High': 'HIGH',
        'Urgent': 'URGENT',
      });

      await _openForm(tester);
      await _fillMinimum(tester);
      await _pickCategory(tester, 'Food', 'Disaster Relief');
      await _tapSubmit(tester, 'Submit Request');

      final fields = _fieldsOf(_server.where('POST', _minePath).single);
      expect(fields['category'], 'DISASTER_RELIEF');
      expect(fields['urgency'], 'NORMAL'); // the default
    });

    testWidgets('"Other" sends what was typed as the title', (tester) async {
      await _openForm(tester);

      await _pickNeed(tester, kOtherOption);
      await tester.enterText(_field(_otherHint), '  Roofing materials ');
      await tester.pump();
      await _describe(tester, 'Our roof was torn off by the typhoon.');
      await _tapSubmit(tester, 'Submit Request');

      expect(
        _fieldsOf(_server.where('POST', _minePath).single)['title'],
        'Roofing materials',
      );
    });

    testWidgets('sends location details only when typed, and never a '
        'household size', (tester) async {
      await _openForm(tester);
      await _fillMinimum(tester);
      await tester.enterText(_field(_detailsHint), '  Beside the chapel ');
      await tester.pump();
      await _tapSubmit(tester, 'Submit Request');

      final fields = _fieldsOf(_server.where('POST', _minePath).single);
      expect(fields['location_details'], 'Beside the chapel');
      expect(fields.containsKey('location_latitude'), isFalse);
      expect(fields.containsKey('location_longitude'), isFalse);
      expect(fields.keys.any((k) => k.contains('household')), isFalse);
    });

    testWidgets('blank location details are left out', (tester) async {
      await _openForm(tester);
      await _fillMinimum(tester);
      await tester.enterText(_field(_detailsHint), '   ');
      await tester.pump();
      await _tapSubmit(tester, 'Submit Request');

      final fields = _fieldsOf(_server.where('POST', _minePath).single);
      expect(fields.containsKey('location_details'), isFalse);
    });

    testWidgets('shows "Submitting..." and locks the button in flight', (
      tester,
    ) async {
      final reply = Completer<http.Response>();
      _server.onCreate = (_) => reply.future;
      await _openForm(tester);
      await _fillMinimum(tester);

      await tester.tap(_button('Submit Request'));
      await tester.pump();

      expect(find.text('Submitting...'), findsOneWidget);
      expect(_enabled(tester, 'Submitting...'), isFalse);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // A second tap while in flight files nothing more.
      await tester.tap(_button('Submitting...'), warnIfMissed: false);
      await tester.pump();
      expect(_server.where('POST', _minePath), hasLength(1));

      reply.complete(
        _ok(_requestJson(id: 'req-new', reference: 'AR-2031-0042')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Request submitted'), findsOneWidget);
    });

    testWidgets('confirms with the reference number, then returns the '
        'request', (tester) async {
      final outcome = await _openForm(tester);
      await _fillMinimum(tester);
      await _tapSubmit(tester, 'Submit Request');

      expect(find.text('Request submitted'), findsOneWidget);
      expect(
        find.text(
          'Your request is now pending review. Reference number '
          'AR-2031-0042.',
        ),
        findsOneWidget,
      );
      expect(outcome.closed, isFalse);

      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();

      expect(find.byType(AssistanceRequestFormScreen), findsNothing);
      expect(outcome.closed, isTrue);
      expect(outcome.result?.id, 'req-new');
      expect(outcome.result?.referenceNumber, 'AR-2031-0042');
      expect(outcome.result?.title, 'Food Pack');
      expect(outcome.result?.category, 'Food');
      expect(outcome.result?.status, AssistanceRequestStatus.pending);
    });

    testWidgets('the new request goes to the top of the store', (tester) async {
      await _openForm(tester);
      await _fillMinimum(tester);
      await _tapSubmit(tester, 'Submit Request');

      final requests = AssistanceRequestStore.instance.requests;
      expect(requests, hasLength(1));
      expect(requests.single.referenceNumber, 'AR-2031-0042');
      expect(AssistanceRequestStore.instance.currentRequests, hasLength(1));
    });

    testWidgets('without a household size on the profile nothing is filed', (
      tester,
    ) async {
      RoleAccountStore.instance.clear();
      _seedProfile(householdSize: null);
      await _openForm(tester);
      await _fillMinimum(tester);

      await _tapSubmit(tester, 'Submit Request');

      expect(
        find.text('Add your household size to your profile first.'),
        findsOneWidget,
      );
      expect(_server.requests, isEmpty);
      expect(find.byType(AssistanceRequestFormScreen), findsOneWidget);
      expect(_enabled(tester, 'Submit Request'), isTrue);
    });

    testWidgets('a household size of 0 is treated as missing', (tester) async {
      RoleAccountStore.instance.clear();
      _seedProfile(householdSize: 0);
      await _openForm(tester);
      await _fillMinimum(tester);

      await _tapSubmit(tester, 'Submit Request');

      expect(
        find.text('Add your household size to your profile first.'),
        findsOneWidget,
      );
      expect(_server.requests, isEmpty);
    });

    testWidgets('no beneficiary profile at all is treated as missing', (
      tester,
    ) async {
      RoleAccountStore.instance.clear();
      await _openForm(tester);
      await _fillMinimum(tester);

      await _tapSubmit(tester, 'Submit Request');

      expect(
        find.text('Add your household size to your profile first.'),
        findsOneWidget,
      );
      expect(_server.requests, isEmpty);
    });

    testWidgets('a server refusal shows its message and keeps the form', (
      tester,
    ) async {
      _server.onCreate = (_) async =>
          _fail(422, 'You already have a pending food request.');
      final outcome = await _openForm(tester);
      await _fillMinimum(tester);

      await _tapSubmit(tester, 'Submit Request');

      expect(
        find.text('You already have a pending food request.'),
        findsOneWidget,
      );
      expect(find.text('Request submitted'), findsNothing);
      expect(find.byType(AssistanceRequestFormScreen), findsOneWidget);
      expect(_enabled(tester, 'Submit Request'), isTrue);
      expect(_text(tester, _descriptionHint), isNotEmpty);
      expect(outcome.closed, isFalse);
      expect(AssistanceRequestStore.instance.requests, isEmpty);
    });

    testWidgets('can submit again after a refusal', (tester) async {
      _server.onCreate = (_) async => _fail(503, 'Try again later.');
      await _openForm(tester);
      await _fillMinimum(tester);
      await _tapSubmit(tester, 'Submit Request');
      expect(find.text('Try again later.'), findsOneWidget);

      // Let the snackbar expire — it sits over the Submit button.
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();

      _server.onCreate = null;
      await _tapSubmit(tester, 'Submit Request');

      expect(_server.where('POST', _minePath), hasLength(2));
      expect(find.text('Request submitted'), findsOneWidget);
    });
  });

  // -------------------------------------------------------------------------
  // Proof documents
  // -------------------------------------------------------------------------

  group('new request — proof documents', () {
    testWidgets('Choose file opens the picker for PDFs and images', (
      tester,
    ) async {
      _picker.willPick('barangay_certificate.pdf', path: proofPdf);
      await _openForm(tester);

      await tester.tap(find.text('Choose file'));
      await tester.pumpAndSettle();

      expect(_picker.calls.single, {
        'type': FileType.custom,
        'allowedExtensions': ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
        'allowMultiple': false,
        'withData': false,
      });
      expect(find.text('barangay_certificate.pdf'), findsOneWidget);
      expect(find.text('PDF · 47 KB'), findsOneWidget);
      expect(find.byTooltip('Remove'), findsOneWidget);
    });

    testWidgets('a cancelled pick adds nothing', (tester) async {
      await _openForm(tester);

      await tester.tap(find.text('Choose file'));
      await tester.pumpAndSettle();

      expect(find.byTooltip('Remove'), findsNothing);
    });

    testWidgets('a picker failure is explained', (tester) async {
      _picker.error = Exception('picker crashed');
      await _openForm(tester);

      await tester.tap(find.text('Choose file'));
      await tester.pumpAndSettle();

      expect(find.text('Could not open the file picker.'), findsOneWidget);
      expect(find.byTooltip('Remove'), findsNothing);
    });

    testWidgets('a picked file can be removed again', (tester) async {
      _picker.willPick('barangay_certificate.pdf', path: proofPdf);
      await _openForm(tester);
      await tester.tap(find.text('Choose file'));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Remove'));
      await tester.pump();

      expect(find.text('barangay_certificate.pdf'), findsNothing);
    });

    testWidgets('stops offering more after three files', (tester) async {
      await _openForm(tester);

      for (final (name, path) in [
        ('barangay_certificate.pdf', proofPdf),
        ('electric_bill.pdf', billPdf),
        ('medical_cert.pdf', certPdf),
      ]) {
        _picker.willPick(name, path: path);
        await tester.tap(find.text('Choose file'));
        await tester.pumpAndSettle();
      }

      expect(find.byTooltip('Remove'), findsNWidgets(3));
      expect(find.text('Choose file'), findsNothing);
      expect(find.text('Take photo'), findsNothing);

      // Removing one brings the buttons back.
      await tester.tap(find.byTooltip('Remove').first);
      await tester.pump();
      expect(find.text('Choose file'), findsOneWidget);
    });

    testWidgets('size labels read as B, KB or MB', (tester) async {
      expect(
        const RequestAttachment(
          name: 'a.pdf',
          path: 'a',
          sizeBytes: 900,
        ).sizeLabel,
        '900 B',
      );
      expect(
        const RequestAttachment(
          name: 'a.pdf',
          path: 'a',
          sizeBytes: 48213,
        ).sizeLabel,
        '47 KB',
      );
      expect(
        const RequestAttachment(
          name: 'a.PDF',
          path: 'a',
          sizeBytes: 2621440,
        ).sizeLabel,
        '2.5 MB',
      );
      expect(
        const RequestAttachment(name: 'scan.JPG', path: 'a').extension,
        'jpg',
      );
      expect(
        const RequestAttachment(name: 'scan.JPG', path: 'a').isImage,
        isTrue,
      );
      expect(const RequestAttachment(name: 'noext', path: 'a').extension, '');
      expect(const RequestAttachment(name: 'a.pdf', path: 'a').sizeLabel, '');
    });

    testWidgets('attached files go up as "attachments" parts', (tester) async {
      await _openForm(tester);
      await _fillMinimum(tester);
      for (final (name, path) in [
        ('barangay_certificate.pdf', proofPdf),
        ('electric_bill.pdf', billPdf),
      ]) {
        _picker.willPick(name, path: path);
        await tester.tap(find.text('Choose file'));
        await tester.pumpAndSettle();
      }

      await _submitWithFiles(tester);

      final request = _server.where('POST', _minePath).single;
      final files = _filesOf(request);
      expect(files.map((f) => f.name), ['attachments', 'attachments']);
      expect(files.map((f) => f.filename), [
        'barangay_certificate.pdf',
        'electric_bill.pdf',
      ]);
      expect(files.map((f) => f.headers['content-type']), [
        'application/pdf',
        'application/pdf',
      ]);
      expect(files.first.content, '%PDF-1.4 barangay cert');
      expect(_fieldsOf(request)['title'], 'Food Pack');
      expect(find.text('Request submitted'), findsOneWidget);
    });

    testWidgets('a file that vanished before submit gives a retry message', (
      tester,
    ) async {
      final gone = '${tmp.path}${Platform.pathSeparator}deleted.pdf';
      _picker.willPick('deleted.pdf', path: gone);
      await _openForm(tester);
      await _fillMinimum(tester);
      await tester.tap(find.text('Choose file'));
      await tester.pumpAndSettle();

      await _submitWithFiles(tester);

      expect(
        find.text('Could not submit your request. Please try again.'),
        findsOneWidget,
      );
      expect(_server.requests, isEmpty);
      expect(_enabled(tester, 'Submit Request'), isTrue);
    });
  });

  // -------------------------------------------------------------------------
  // Editing a filed request
  // -------------------------------------------------------------------------

  group('edit request', () {
    testWidgets('opens filled in with the filed answers', (tester) async {
      await _openForm(
        tester,
        editing: _filed(
          attachments: [
            {
              'name': 'barangay_certificate.pdf',
              'url': 'https://files.test/req-1/cert.pdf',
              'size_bytes': 48213,
            },
          ],
        ),
      );

      expect(find.text('Edit Request'), findsOneWidget);
      expect(find.text('Food Pack'), findsOneWidget);
      expect(find.text('Food'), findsOneWidget);
      expect(_chipSelected(tester, 'High'), isTrue);
      expect(_chipSelected(tester, 'Normal'), isFalse);
      expect(
        _text(tester, _descriptionHint),
        'Our house was flooded and we lost our rice supply.',
      );
      expect(find.text('Pinned at 10.32970, 123.94960'), findsOneWidget);
      expect(find.text('Remove pin'), findsOneWidget);
      expect(_text(tester, _detailsHint), 'Beside the Pajo chapel');
      expect(
        find.text('Documents stay as filed and cannot be changed in an edit.'),
        findsOneWidget,
      );
      expect(find.text('barangay_certificate.pdf'), findsOneWidget);
      expect(find.byTooltip('Remove'), findsNothing);
      expect(find.text('Choose file'), findsNothing);
      expect(find.text('Take photo'), findsNothing);
      expect(_enabled(tester, 'Save Changes'), isTrue);
    });

    testWidgets('a title outside the list opens as "Other"', (tester) async {
      await _openForm(tester, editing: _filed(title: 'Roofing materials'));

      expect(find.text(kOtherOption), findsOneWidget);
      expect(_text(tester, _otherHint), 'Roofing materials');
    });

    testWidgets('unknown category or urgency codes fall back to defaults', (
      tester,
    ) async {
      final filed = _filed(category: 'HOUSING', urgency: 'CRITICAL');
      expect(filed.category, 'HOUSING');
      expect(filed.urgency, 'CRITICAL');

      await _openForm(tester, editing: filed);

      expect(find.text('Food'), findsOneWidget);
      expect(_chipSelected(tester, 'Normal'), isTrue);
    });

    testWidgets('saves every field with PATCH and returns the update', (
      tester,
    ) async {
      final outcome = await _openForm(tester, editing: _filed());

      await _pickCategory(tester, 'Food', 'Disaster Relief');
      await tester.tap(find.text('Urgent'));
      await tester.pump();
      await _describe(tester, ' The water has not gone down yet. ');
      await tester.enterText(_field(_detailsHint), 'Blue gate, Purok 3');
      await tester.pump();
      await _tapSubmit(tester, 'Save Changes');

      final request = _server.where('PATCH', '$_minePath/req-1').single;
      expect(request.headers['content-type'], startsWith('application/json'));
      expect(jsonDecode(request.body), {
        'title': 'Food Pack',
        'category': 'DISASTER_RELIEF',
        'description': 'The water has not gone down yet.',
        'urgency': 'URGENT',
        'location_latitude': 10.3297,
        'location_longitude': 123.9496,
        'location_details': 'Blue gate, Purok 3',
      });
      expect(_server.where('POST', _minePath), isEmpty);

      expect(find.text('Your request was updated.'), findsOneWidget);
      expect(find.byType(AssistanceRequestFormScreen), findsNothing);
      expect(outcome.closed, isTrue);
      expect(outcome.result?.category, 'Disaster Relief');
      expect(outcome.result?.urgency, 'Urgent');
      expect(outcome.result?.locationDetails, 'Blue gate, Purok 3');
    });

    testWidgets('Remove pin and cleared details send nulls', (tester) async {
      await _openForm(tester, editing: _filed());

      await tester.tap(find.text('Remove pin'));
      await tester.pump();
      expect(find.text('No location pinned yet'), findsOneWidget);
      await tester.enterText(_field(_detailsHint), '');
      await tester.pump();
      await _tapSubmit(tester, 'Save Changes');

      final body =
          jsonDecode(_server.where('PATCH', '$_minePath/req-1').single.body)
              as Map<String, dynamic>;
      expect(body['location_latitude'], isNull);
      expect(body['location_longitude'], isNull);
      expect(body['location_details'], isNull);
      expect(body.containsKey('location_latitude'), isTrue);
    });

    testWidgets('editing does not need a household size', (tester) async {
      RoleAccountStore.instance.clear();
      await _openForm(tester, editing: _filed());

      await _tapSubmit(tester, 'Save Changes');

      expect(_server.where('PATCH', '$_minePath/req-1'), hasLength(1));
      expect(find.text('Your request was updated.'), findsOneWidget);
    });

    testWidgets('editing still requires a need and a description', (
      tester,
    ) async {
      await _openForm(tester, editing: _filed());

      await _describe(tester, '');

      expect(_enabled(tester, 'Save Changes'), isFalse);
      expect(find.text(_incompleteHint), findsOneWidget);
    });

    testWidgets('shows "Saving..." while the edit is in flight', (
      tester,
    ) async {
      final reply = Completer<http.Response>();
      _server.onUpdate = (_) => reply.future;
      await _openForm(tester, editing: _filed());

      await tester.tap(_button('Save Changes'));
      await tester.pump();

      expect(find.text('Saving...'), findsOneWidget);
      expect(_enabled(tester, 'Saving...'), isFalse);

      reply.complete(_ok(_requestJson()));
      await tester.pumpAndSettle();
      expect(find.text('Your request was updated.'), findsOneWidget);
    });

    testWidgets('a refusal (already screened) keeps the form open', (
      tester,
    ) async {
      _server.onUpdate = (_) async => _fail(
        409,
        'This request is already under review and can no longer be edited.',
      );
      final outcome = await _openForm(tester, editing: _filed());

      await _tapSubmit(tester, 'Save Changes');

      expect(
        find.text(
          'This request is already under review and can no longer be edited.',
        ),
        findsOneWidget,
      );
      expect(find.text('Your request was updated.'), findsNothing);
      expect(find.byType(AssistanceRequestFormScreen), findsOneWidget);
      expect(_enabled(tester, 'Save Changes'), isTrue);
      expect(outcome.closed, isFalse);
    });

    testWidgets('a filed request with no pin opens unpinned', (tester) async {
      await _openForm(tester, editing: _filed(pinned: false));

      expect(find.text('No location pinned yet'), findsOneWidget);
      expect(_text(tester, _detailsHint), isEmpty);

      await _tapSubmit(tester, 'Save Changes');

      final body =
          jsonDecode(_server.where('PATCH', '$_minePath/req-1').single.body)
              as Map<String, dynamic>;
      expect(body['location_latitude'], isNull);
      expect(body['location_details'], isNull);
    });
  });

  // -------------------------------------------------------------------------
  // Confirmation dialog on its own
  // -------------------------------------------------------------------------

  testWidgets('showRequestSubmittedDialog stays until Done', (tester) async {
    final request = assistanceRequestFromJson(
      _requestJson(reference: 'AR-2031-0099'),
    );
    var closed = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: ElevatedButton(
              onPressed: () async {
                await showRequestSubmittedDialog(context, request);
                closed = true;
              },
              child: const Text('Show'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Show'));
    await tester.pumpAndSettle();

    expect(find.textContaining('AR-2031-0099.'), findsOneWidget);

    // Not dismissible by tapping outside.
    await tester.tapAt(const Offset(5, 5));
    await tester.pumpAndSettle();
    expect(find.text('Request submitted'), findsOneWidget);
    expect(closed, isFalse);

    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(find.text('Request submitted'), findsNothing);
    expect(closed, isTrue);
  });

  test('LatLng from a filed request survives the round trip', () {
    final filed = _filed();
    expect(filed.location, const LatLng(10.3297, 123.9496));
    expect(_filed(pinned: false).location, isNull);
  });
}
