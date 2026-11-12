// Unit tests for a beneficiary applying for an event — the "Apply as
// Beneficiary" button on the event details screen:
//
//   POST /v1/user-requests/me/event-join?role=BENEFICIARY
//                                    UserRequestService.applyForEvent
//   UserRequestResponse              the filed request the server answers with
//   showBeneficiaryEventApplicationDialog
//                                    pick a PDF proof of residency, check it,
//                                    submit, and resolve to true / false
//   CaresEvent application status    Pending → Accepted / Rejected → Apply again
//
// The network is replaced with package:http's MockClient (through
// `http.runWithClient`, since the dialog builds its own service) and the
// native file picker with a fake, so nothing here reaches a real server or
// opens a real file chooser. The proof PDFs are small throwaway files.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/dashboard/beneficiary/widgets/beneficiary_event_application_dialog.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/data/models/user_request_models.dart';
import 'package:mobile/features/dashboard/data/user_request_service.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

const _origin = 'http://api.test';
const _applyPath = '/v1/user-requests/me/event-join';
const _proofName = 'barangay-certificate.pdf';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

late Directory _tmp;
late String _proofPath;

String _file(String name, String content) {
  final file = File('${_tmp.path}${Platform.pathSeparator}$name')
    ..writeAsStringSync(content);
  return file.path;
}

CaresEvent _event({
  String id = 'event-42',
  String title = 'Community Feeding Program',
  String? applicationStatus,
  String? applicationRejectionReason,
}) => CaresEvent(
  id: id,
  title: title,
  organization: 'UCLM CARES Office',
  date: DateTime(2031, 3, 14),
  time: '8:00 AM',
  location: 'Pajo Barangay Hall, Lapu-Lapu City',
  description: 'Hot meals and grocery packs for registered families.',
  slotsLeft: 20,
  daysUntil: 5,
  capacityFilled: 0.6,
  category: 'Health',
  tags: const ['Food'],
  registeredCount: 30,
  totalCapacity: 50,
  requirements: const [],
  venueLatitude: 10.3103,
  venueLongitude: 123.9494,
  openToBeneficiaries: true,
  applicationStatus: applicationStatus,
  applicationRejectionReason: applicationRejectionReason,
);

/// The filed request `POST …/event-join` answers with.
Map<String, dynamic> _filedRequest({String status = 'PENDING'}) => {
  'user_request_id': 'ureq_7c1d',
  'reference_number': 1042,
  'kind': 'EVENT_JOIN',
  'status': status,
  'summary': 'Apply as beneficiary: Community Feeding Program',
  'event_id': 42,
  'created_at': '2031-03-01T02:30:00.000Z',
};

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

class _Recorder {
  _Recorder([Future<http.Response> Function(http.Request request)? reply])
    : reply = reply ?? ((_) async => _ok(_filedRequest()));

  Future<http.Response> Function(http.Request request) reply;
  final List<http.Request> requests = [];

  http.Request get last => requests.last;

  http.Client client() => MockClient((request) async {
    requests.add(request);
    return reply(request);
  });

  UserRequestService service() =>
      UserRequestService(apiClient: ApiClient(client: client()));
}

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
  String? get contentType => headers['content-type'];
}

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
// Fake file picker
// ---------------------------------------------------------------------------

/// Stands in for the native chooser. Extending [FilePicker] (rather than
/// implementing it) passes the platform-interface token check.
class _FakePicker extends FilePicker {
  FilePickerResult? next;
  Object? error;
  final List<Map<String, Object?>> calls = [];

  void willPick(String name, {String? path, int? size}) {
    next = FilePickerResult([
      PlatformFile(name: name, path: path ?? _proofPath, size: size ?? 48213),
    ]);
    error = null;
  }

  void willCancel() {
    next = null;
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
// Dialog harness
// ---------------------------------------------------------------------------

class _DialogOutcome {
  bool closed = false;
  bool? applied;
}

/// Pumps a page with an "Apply" button that opens the dialog the way the
/// event details screen does, and records what the dialog resolved to.
Future<_DialogOutcome> _openDialog(
  WidgetTester tester, {
  CaresEvent? event,
}) async {
  final outcome = _DialogOutcome();
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () async {
                outcome.applied = await showBeneficiaryEventApplicationDialog(
                  context,
                  event ?? _event(),
                );
                outcome.closed = true;
              },
              child: const Text('Apply as Beneficiary'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Apply as Beneficiary'));
  await tester.pumpAndSettle();
  expect(find.byType(AlertDialog), findsOneWidget);
  return outcome;
}

Finder get _submitButton => find.ancestor(
  of: find.text('Submit'),
  matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
);

bool _enabled(WidgetTester tester, Finder button) =>
    tester.widget<ButtonStyleButton>(button).onPressed != null;

Future<void> _choosePdf(WidgetTester tester) async {
  await tester.tap(find.text('Choose PDF file'));
  await tester.pumpAndSettle();
}

/// Taps Submit and lets the real file read and the mock upload finish.
/// Reading the proof is real disk I/O, which only completes on the real
/// clock, so the tap and the wait both run inside `runAsync`.
Future<void> _submit(WidgetTester tester) async {
  await tester.runAsync(() async {
    await tester.tap(_submitButton);
    await Future<void>.delayed(const Duration(milliseconds: 300));
  });
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

/// Completes a held reply on the real clock and lets the dialog react.
Future<void> _release(
  WidgetTester tester,
  Completer<http.Response> pending,
  http.Response response,
) async {
  await tester.runAsync(() async {
    pending.complete(response);
    await Future<void>.delayed(const Duration(milliseconds: 100));
  });
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

Future<void> _withNetwork(_Recorder rec, Future<void> Function() body) =>
    http.runWithClient(body, rec.client);

void main() {
  setUpAll(() {
    _tmp = Directory.systemTemp.createTempSync('cares_beneficiary_apply_');
    _proofPath = _file(_proofName, '%PDF-1.7 proof of residency');
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
    _picker = _FakePicker();
    FilePicker.platform = _picker;
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  // -------------------------------------------------------------------------
  // Service
  // -------------------------------------------------------------------------

  group('POST /user-requests/me/event-join', () {
    test('uploads the event id and the PDF, always as the beneficiary side',
        () async {
      AuthSession.setAccessToken('jwt.beneficiary');
      final rec = _Recorder();

      await rec.service().applyForEvent(
        eventId: 42,
        proofPath: _proofPath,
        proofName: _proofName,
        proofMimeType: 'application/pdf',
      );

      expect(rec.requests, hasLength(1));
      expect(rec.last.method, 'POST');
      expect(rec.last.url.path, _applyPath);
      expect(rec.last.url.queryParameters, {'role': 'BENEFICIARY'});
      expect(rec.last.headers['Authorization'], 'Bearer jwt.beneficiary');

      final parts = _partsOf(rec.last);
      expect(parts['eventId']!.content, '42');
      expect(parts['proof']!.filename, _proofName);
      expect(parts['proof']!.contentType, 'application/pdf');
      expect(parts['proof']!.content, '%PDF-1.7 proof of residency');
    });

    test('works out the file type from the name when none is given',
        () async {
      final cases = {
        'proof.PDF': 'application/pdf',
        'proof.png': 'image/png',
        'proof.jpeg': 'image/jpeg',
        'proof.webp': 'image/webp',
        // Unknown types fall through to the http package default.
        'proof.docx': 'application/octet-stream',
      };

      for (final entry in cases.entries) {
        final rec = _Recorder();
        await rec.service().applyForEvent(
          eventId: 42,
          proofPath: _file(entry.key, 'x'),
          proofName: entry.key,
        );
        expect(
          _partsOf(rec.last)['proof']!.contentType,
          entry.value,
          reason: entry.key,
        );
      }
    });

    test('an explicit mime type wins over the file name', () async {
      final rec = _Recorder();

      await rec.service().applyForEvent(
        eventId: 42,
        proofPath: _file('scan.png', 'x'),
        proofName: 'scan.png',
        proofMimeType: 'application/pdf',
      );

      expect(_partsOf(rec.last)['proof']!.contentType, 'application/pdf');
    });

    test('returns the filed request, pending a director', () async {
      final rec = _Recorder();

      final request = await rec.service().applyForEvent(
        eventId: 42,
        proofPath: _proofPath,
        proofName: _proofName,
      );

      expect(request.id, 'ureq_7c1d');
      expect(request.referenceNumber, 1042);
      expect(request.kind, UserRequestKind.eventJoin);
      expect(request.status, UserRequestStatus.pending);
      expect(request.eventId, 42);
      expect(request.summary, 'Apply as beneficiary: Community Feeding Program');
      expect(request.createdAt, DateTime.utc(2031, 3, 1, 2, 30));
      expect(request.decidedAt, isNull);
    });

    test('a second application for the same event is refused', () async {
      final rec = _Recorder(
        (_) async => _fail(409, 'You already have a pending application'),
      );

      await expectLater(
        rec.service().applyForEvent(
          eventId: 42,
          proofPath: _proofPath,
          proofName: _proofName,
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 409)
              .having(
                (e) => e.message,
                'message',
                'You already have a pending application',
              ),
        ),
      );
    });

    test('an event not open to beneficiaries is refused', () async {
      final rec = _Recorder(
        (_) async => _fail(422, 'This event is not open to beneficiaries'),
      );

      await expectLater(
        rec.service().applyForEvent(
          eventId: 7,
          proofPath: _proofPath,
          proofName: _proofName,
        ),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'This event is not open to beneficiaries',
          ),
        ),
      );
    });

    test('a proof that is no longer on disk fails before any upload',
        () async {
      final rec = _Recorder();

      await expectLater(
        rec.service().applyForEvent(
          eventId: 42,
          proofPath: '${_tmp.path}${Platform.pathSeparator}gone.pdf',
          proofName: 'gone.pdf',
        ),
        throwsA(isA<FileSystemException>()),
      );
      expect(rec.requests, isEmpty);
    });
  });

  group('UserRequestResponse', () {
    test('maps every kind and status, unknowns included', () {
      UserRequestResponse parse(String? kind, String? status) =>
          UserRequestResponse.fromJson({
            ..._filedRequest(),
            'kind': kind,
            'status': status,
          });

      expect(parse('ROLE_ACCESS', 'PENDING').kind, UserRequestKind.roleAccess);
      expect(parse('EVENT_JOIN', 'PENDING').kind, UserRequestKind.eventJoin);
      expect(parse('EVENT_ROLE', 'PENDING').kind, UserRequestKind.eventRole);
      expect(parse('SOMETHING', 'PENDING').kind, UserRequestKind.unknown);
      expect(parse(null, 'PENDING').kind, UserRequestKind.unknown);

      expect(parse('EVENT_JOIN', 'ACCEPTED').status,
          UserRequestStatus.accepted);
      expect(parse('EVENT_JOIN', 'REJECTED').status,
          UserRequestStatus.rejected);
      expect(parse('EVENT_JOIN', 'DELETED').status, UserRequestStatus.deleted);
      expect(parse('EVENT_JOIN', 'WHATEVER').status,
          UserRequestStatus.unknown);
    });

    test('a ruled-on request carries the decision time and reason', () {
      final request = UserRequestResponse.fromJson({
        ..._filedRequest(status: 'REJECTED'),
        'decided_at': '2031-03-03T08:00:00.000Z',
        'rejection_reason': 'Address on the certificate is outside Cebu.',
      });

      expect(request.status, UserRequestStatus.rejected);
      expect(request.decidedAt, DateTime.utc(2031, 3, 3, 8));
      expect(
        request.rejectionReason,
        'Address on the certificate is outside Cebu.',
      );
    });

    test('a missing summary is empty and a bad date falls back to now', () {
      final before = DateTime.now();
      final request = UserRequestResponse.fromJson({
        'user_request_id': 'ureq_1',
        'reference_number': 1,
        'created_at': 'not-a-date',
      });

      expect(request.summary, '');
      expect(request.eventId, isNull);
      expect(request.createdAt.isBefore(before), isFalse);
    });
  });

  // -------------------------------------------------------------------------
  // Dialog
  // -------------------------------------------------------------------------

  group('application dialog — before a PDF is chosen', () {
    testWidgets('explains what to attach and that a director will review it',
        (tester) async {
      await _openDialog(tester);

      expect(find.text('Community Feeding Program'), findsOneWidget);
      expect(find.textContaining('PDF proof of residency'), findsOneWidget);
      expect(find.text('Choose PDF file'), findsOneWidget);
      expect(find.text('PDF only, up to 10 MB'), findsOneWidget);
      expect(find.textContaining('"Pending approval"'), findsOneWidget);
    });

    testWidgets('Submit stays disabled until a PDF is attached',
        (tester) async {
      await _openDialog(tester);

      expect(_enabled(tester, _submitButton), isFalse);
    });

    testWidgets('Cancel closes the dialog as "not applied"', (tester) async {
      final outcome = await _openDialog(tester);

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(outcome.closed, isTrue);
      expect(outcome.applied, isFalse);
      expect(find.byType(AlertDialog), findsNothing);
    });
  });

  group('application dialog — choosing the proof', () {
    testWidgets('asks the picker for a single PDF, path only', (tester) async {
      _picker.willPick(_proofName);
      await _openDialog(tester);

      await _choosePdf(tester);

      expect(_picker.calls, hasLength(1));
      expect(_picker.calls.single, {
        'type': FileType.custom,
        'allowedExtensions': ['pdf'],
        'allowMultiple': false,
        'withData': false,
      });
    });

    testWidgets('a picked PDF shows its name and size and enables Submit',
        (tester) async {
      _picker.willPick(_proofName, size: 48213);
      await _openDialog(tester);

      await _choosePdf(tester);

      expect(find.text(_proofName), findsOneWidget);
      expect(find.text('47 KB · Ready to submit'), findsOneWidget);
      expect(find.text('Choose PDF file'), findsNothing);
      expect(_enabled(tester, _submitButton), isTrue);
    });

    testWidgets('files of a megabyte or more show the size in MB',
        (tester) async {
      _picker.willPick('scan.pdf', size: (2.5 * 1024 * 1024).round());
      await _openDialog(tester);

      await _choosePdf(tester);

      expect(find.text('2.5 MB · Ready to submit'), findsOneWidget);
    });

    testWidgets('closing the picker without a choice changes nothing',
        (tester) async {
      _picker.willCancel();
      await _openDialog(tester);

      await _choosePdf(tester);

      expect(find.text('Choose PDF file'), findsOneWidget);
      expect(_enabled(tester, _submitButton), isFalse);
    });

    testWidgets('a file that is not a PDF is refused', (tester) async {
      _picker.willPick('proof.jpg');
      await _openDialog(tester);

      await _choosePdf(tester);

      expect(find.text('Only PDF files are accepted.'), findsOneWidget);
      expect(find.text('Choose PDF file'), findsOneWidget);
      expect(_enabled(tester, _submitButton), isFalse);
    });

    testWidgets('a PDF over 10 MB is refused; exactly 10 MB is accepted',
        (tester) async {
      _picker.willPick('huge.pdf', size: 10 * 1024 * 1024 + 1);
      await _openDialog(tester);

      await _choosePdf(tester);
      expect(find.text('The PDF must be 10 MB or smaller.'), findsOneWidget);
      expect(_enabled(tester, _submitButton), isFalse);

      _picker.willPick('limit.pdf', size: 10 * 1024 * 1024);
      await _choosePdf(tester);
      expect(find.text('limit.pdf'), findsOneWidget);
      expect(find.text('The PDF must be 10 MB or smaller.'), findsNothing);
    });

    testWidgets('an uppercase .PDF extension is accepted', (tester) async {
      _picker.willPick('PROOF.PDF');
      await _openDialog(tester);

      await _choosePdf(tester);

      expect(find.text('PROOF.PDF'), findsOneWidget);
      expect(find.text('Only PDF files are accepted.'), findsNothing);
    });

    testWidgets('a picker failure is reported, not thrown', (tester) async {
      _picker.error = Exception('no activity');
      await _openDialog(tester);

      await _choosePdf(tester);

      expect(find.text('Could not open the file picker.'), findsOneWidget);
    });

    testWidgets('Change swaps the file and Remove drops it', (tester) async {
      _picker.willPick(_proofName);
      await _openDialog(tester);
      await _choosePdf(tester);

      _picker.willPick('updated-certificate.pdf', size: 2048);
      await tester.tap(find.text('Change'));
      await tester.pumpAndSettle();
      expect(find.text('updated-certificate.pdf'), findsOneWidget);
      expect(find.text('2 KB · Ready to submit'), findsOneWidget);

      await tester.tap(find.byTooltip('Remove'));
      await tester.pumpAndSettle();
      expect(find.text('Choose PDF file'), findsOneWidget);
      expect(_enabled(tester, _submitButton), isFalse);
    });

    testWidgets('a good pick clears an earlier error', (tester) async {
      _picker.willPick('proof.jpg');
      await _openDialog(tester);
      await _choosePdf(tester);
      expect(find.text('Only PDF files are accepted.'), findsOneWidget);

      _picker.willPick(_proofName);
      await _choosePdf(tester);

      expect(find.text('Only PDF files are accepted.'), findsNothing);
      expect(find.text(_proofName), findsOneWidget);
    });
  });

  group('application dialog — submitting', () {
    testWidgets('files the application and closes as "applied"',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        _picker.willPick(_proofName);
        final outcome = await _openDialog(tester);
        await _choosePdf(tester);

        await _submit(tester);

        expect(rec.requests, hasLength(1));
        expect(rec.last.url.path, _applyPath);
        expect(rec.last.url.queryParameters['role'], 'BENEFICIARY');
        final parts = _partsOf(rec.last);
        expect(parts['eventId']!.content, '42');
        expect(parts['proof']!.filename, _proofName);
        expect(parts['proof']!.contentType, 'application/pdf');

        expect(outcome.closed, isTrue);
        expect(outcome.applied, isTrue);
        expect(find.byType(AlertDialog), findsNothing);
      });
    });

    testWidgets('locks the dialog while the upload is in flight',
        (tester) async {
      final pending = Completer<http.Response>();
      final rec = _Recorder((_) => pending.future);
      await _withNetwork(rec, () async {
        _picker.willPick(_proofName);
        final outcome = await _openDialog(tester);
        await _choosePdf(tester);

        await _submit(tester);

        expect(find.text('Submitting…'), findsOneWidget);
        expect(
          tester.widget<TextButton>(find.widgetWithText(TextButton, 'Cancel'))
              .onPressed,
          isNull,
        );
        expect(
          tester.widget<TextButton>(find.widgetWithText(TextButton, 'Change'))
              .onPressed,
          isNull,
        );
        expect(
          tester.widget<IconButton>(find.byType(IconButton)).onPressed,
          isNull,
        );

        await _release(tester, pending, _ok(_filedRequest()));
        expect(outcome.applied, isTrue);
      });
    });

    testWidgets('a server refusal shows its message and allows a retry',
        (tester) async {
      final rec = _Recorder(
        (_) async => _fail(409, 'You already have a pending application'),
      );
      await _withNetwork(rec, () async {
        _picker.willPick(_proofName);
        final outcome = await _openDialog(tester);
        await _choosePdf(tester);

        await _submit(tester);

        expect(
          find.text('You already have a pending application'),
          findsOneWidget,
        );
        expect(outcome.closed, isFalse);
        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.text('Submit'), findsOneWidget);
        expect(_enabled(tester, _submitButton), isTrue);
        // The chosen proof is kept for the retry.
        expect(find.text(_proofName), findsOneWidget);

        rec.reply = (_) async => _ok(_filedRequest());
        await _submit(tester);

        expect(rec.requests, hasLength(2));
        expect(outcome.applied, isTrue);
      });
    });

    testWidgets('a proof deleted after picking shows the generic message',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        _picker.willPick(
          'moved.pdf',
          path: '${_tmp.path}${Platform.pathSeparator}moved.pdf',
        );
        final outcome = await _openDialog(tester);
        await _choosePdf(tester);

        await _submit(tester);

        expect(
          find.text('Could not submit your application. Please try again.'),
          findsOneWidget,
        );
        expect(rec.requests, isEmpty);
        expect(outcome.closed, isFalse);
      });
    });

    testWidgets('a prototype event with no server id never submits',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        _picker.willPick(_proofName);
        final outcome = await _openDialog(
          tester,
          event: _event(id: 'mock-feeding-1'),
        );
        await _choosePdf(tester);

        await _submit(tester);

        expect(rec.requests, isEmpty);
        expect(outcome.closed, isFalse);
        expect(find.text('Submit'), findsOneWidget);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Where the application stands on the event
  // -------------------------------------------------------------------------

  group('application status on the event', () {
    test('a fresh application reads as pending approval', () {
      final applied = _event().withApplicationStatus('PENDING');

      expect(applied.isApplicationPending, isTrue);
      expect(applied.isApplicationAccepted, isFalse);
      expect(applied.isApplicationRejected, isFalse);
    });

    test('applying again after a rejection drops the old reason', () {
      final rejected = _event(
        applicationStatus: 'REJECTED',
        applicationRejectionReason: 'Certificate is older than 6 months.',
      );
      expect(rejected.isApplicationRejected, isTrue);

      final reapplied = rejected.withApplicationStatus('PENDING');

      expect(reapplied.isApplicationPending, isTrue);
      expect(reapplied.applicationRejectionReason, isNull);
    });

    test('the beneficiary feed carries the status and reason through', () {
      final row = RecommendedEvent.fromJson({
        'event_id': 42,
        'title': 'Community Feeding Program',
        'event_started': '2031-03-14T00:00:00.000Z',
        'event_ended': '2031-03-14T04:00:00.000Z',
        'beneficiary_applicable': true,
        'application_status': 'REJECTED',
        'application_rejection_reason': 'Certificate is older than 6 months.',
      });

      final event = row.toCaresEvent();

      expect(event.openToBeneficiaries, isTrue);
      expect(event.isApplicationRejected, isTrue);
      expect(
        event.applicationRejectionReason,
        'Certificate is older than 6 months.',
      );
    });

    test('a row with no application reads as not applied', () {
      final event = RecommendedEvent.fromJson({
        'event_id': 42,
        'title': 'Community Feeding Program',
        'event_started': '2031-03-14T00:00:00.000Z',
        'event_ended': '2031-03-14T04:00:00.000Z',
        'beneficiary_applicable': true,
      }).toCaresEvent();

      expect(event.applicationStatus, isNull);
      expect(event.isApplicationPending, isFalse);
      expect(event.isApplicationAccepted, isFalse);
      expect(event.isApplicationRejected, isFalse);
    });
  });
}
