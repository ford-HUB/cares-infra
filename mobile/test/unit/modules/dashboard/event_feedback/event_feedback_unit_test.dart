// Unit tests for post-event feedback — the questionnaire a volunteer answers
// after a completed event, which unlocks that event's certificate:
//
//   GET  /v1/evaluation/events/:id            EventEvaluationService.fetchForEvent
//   POST /v1/evaluation/events/:id/responses  EventEvaluationService.submit
//   GET  /v1/evaluation/submissions           EventEvaluationService.fetchSubmissions
//   EventEvaluation / EvaluationForm / EvaluationQuestion   parsing
//   EventFeedbackStore                        submitted-or-not, certificate gate
//   EventFeedbackScreen                       load states, every answer type,
//                                             required checks, submit, 409
//
// The screen builds its own service, so the network is swapped for
// package:http's MockClient through `http.runWithClient`. Every questionnaire
// and event here is a local fixture — nothing reaches a real server.

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/dashboard/data/event_evaluation_service.dart';
import 'package:mobile/features/dashboard/data/event_feedback_store.dart';
import 'package:mobile/features/dashboard/data/models/event_evaluation_models.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/screens/event_feedback_screen.dart';

const _origin = 'http://api.test';
const _formPath = '/v1/evaluation/events/42';
const _submitPath = '/v1/evaluation/events/42/responses';
const _submissionsPath = '/v1/evaluation/submissions';

/// Who the screen records feedback for when no prototype user is signed in.
const _guest = 'guest@cares.local';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

CaresEvent _event({String id = 'event-42'}) => CaresEvent(
  id: id,
  title: 'Coastal Clean-up Drive',
  organization: 'UCLM CARES Office',
  date: DateTime(2031, 3, 14),
  time: '8:00 AM',
  location: 'Looc Seawall, Mandaue City',
  description: 'Help clear the shoreline of plastic waste.',
  slotsLeft: 0,
  daysUntil: 0,
  capacityFilled: 1,
  category: 'Environment',
  tags: const [],
  registeredCount: 50,
  totalCapacity: 50,
  requirements: const [],
  venueLatitude: 10.3297,
  venueLongitude: 123.9496,
  isCompleted: true,
);

Map<String, dynamic> _q(
  String id,
  String type,
  String title, {
  bool required = false,
  List<String>? options,
  int? scaleMax,
  String? minLabel,
  String? maxLabel,
  String description = '',
}) => {
  'id': id,
  'type': type,
  'title': title,
  'description': description,
  'required': required,
  'options': ?options,
  'scale_max': ?scaleMax,
  'scale_min_label': ?minLabel,
  'scale_max_label': ?maxLabel,
};

/// The questionnaire the director assigned to the clean-up drive.
List<Map<String, dynamic>> _questions() => [
  _q(
    'q_overall',
    'star_rating',
    'Overall, how would you rate the event?',
    required: true,
    scaleMax: 5,
    minLabel: 'Poor',
    maxLabel: 'Excellent',
  ),
  _q(
    'q_again',
    'linear_scale',
    'How likely are you to volunteer again?',
    required: true,
    scaleMax: 5,
    minLabel: 'Unlikely',
    maxLabel: 'Very likely',
  ),
  _q(
    'q_role',
    'multiple_choice',
    'What did you help with?',
    required: true,
    options: ['Setup', 'Registration desk', 'Clean-up'],
  ),
  _q(
    'q_well',
    'checkboxes',
    'What went well?',
    options: ['Organization', 'Communication', 'Safety'],
  ),
  _q('q_word', 'short_answer', 'One word to describe the event'),
  _q(
    'q_suggest',
    'paragraph',
    'Any suggestions?',
    description: 'Tell us what we can do better next time.',
  ),
];

Map<String, dynamic> _evaluation({
  bool canSubmit = true,
  String status = 'Completed',
  bool withForm = true,
  bool isDefault = false,
  List<Map<String, dynamic>>? questions,
  Map<String, dynamic>? submission,
}) => {
  'event_id': 42,
  'event_title': 'Coastal Clean-up Drive',
  'event_status': status,
  'form': withForm
      ? {
          'evaluation_form_id': 'form_cleanup',
          'title': 'Clean-up Drive Feedback',
          'description': 'Five minutes to help us plan the next drive.',
          'is_default': isDefault,
          'questions': questions ?? _questions(),
        }
      : null,
  'can_submit': canSubmit,
  'submission': submission,
};

Map<String, dynamic> _submission({Map<String, dynamic>? answers}) => {
  'evaluation_response_id': 'resp_9f2',
  'submitted_at': '2031-03-15T01:00:00.000Z',
  'answers': answers ?? {'q_overall': 5},
};

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

class _Recorder {
  _Recorder({Map<String, dynamic>? evaluation, this.onSubmit})
    : evaluation = evaluation ?? _evaluation();

  Map<String, dynamic>? evaluation;

  /// Overrides the reply to a submit; null answers with a stored submission.
  Future<http.Response> Function(http.Request request)? onSubmit;

  /// Overrides the reply to the questionnaire fetch.
  Future<http.Response> Function(http.Request request)? onFetch;

  final List<http.Request> requests = [];

  int callsTo(String path) =>
      requests.where((r) => r.url.path == path).length;

  http.Request lastTo(String path) =>
      requests.lastWhere((r) => r.url.path == path);

  Future<http.Response> _reply(http.Request request) async {
    if (request.url.path == _submitPath) {
      final custom = onSubmit;
      if (custom != null) return custom(request);
      final sent = request.headers['content-type']!.startsWith('application/json')
          ? (jsonDecode(request.body) as Map)['answers'] as Map<String, dynamic>
          : <String, dynamic>{};
      return _ok({'submission': _submission(answers: sent)});
    }
    if (request.url.path == _formPath) {
      final custom = onFetch;
      if (custom != null) return custom(request);
      return _ok(evaluation!);
    }
    return _fail(404, 'Not found');
  }

  http.Client client() => MockClient((request) async {
    requests.add(request);
    return _reply(request);
  });

  EventEvaluationService service() =>
      EventEvaluationService(apiClient: ApiClient(client: client()));
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

Map<String, dynamic> _sentAnswers(http.Request request) =>
    (jsonDecode(request.body) as Map<String, dynamic>)['answers']
        as Map<String, dynamic>;

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

// ---------------------------------------------------------------------------
// Screen harness
// ---------------------------------------------------------------------------

class _Outcome {
  bool closed = false;
  bool? submitted;
}

/// Opens the feedback screen from a launcher, as the details screen does, on
/// a tall surface so every question card is built without scrolling.
Future<_Outcome> _openScreen(WidgetTester tester, {CaresEvent? event}) async {
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
                outcome.submitted = await EventFeedbackScreen.open(
                  context,
                  event ?? _event(),
                );
                outcome.closed = true;
              },
              child: const Text('Give feedback'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Give feedback'));
  await tester.pumpAndSettle();
  expect(find.byType(EventFeedbackScreen), findsOneWidget);
  return outcome;
}

Finder get _submitButton => find.ancestor(
  of: find.text('Submit Feedback'),
  matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
);

Future<void> _tapSubmit(WidgetTester tester) async {
  await tester.tap(_submitButton);
  await tester.pumpAndSettle();
}

/// Answers the three required questions: 4 stars, 5 on the scale, "Clean-up".
Future<void> _answerRequired(WidgetTester tester) async {
  await tester.tap(find.byTooltip('4 stars'));
  await tester.pump();
  await tester.tap(find.text('5'));
  await tester.pump();
  await tester.tap(find.text('Clean-up'));
  await tester.pump();
}

Future<void> _withNetwork(_Recorder rec, Future<void> Function() body) =>
    http.runWithClient(body, rec.client);

void main() {
  late Directory tmp;

  setUpAll(() {
    tmp = Directory.systemTemp.createTempSync('cares_event_feedback_');
  });

  tearDownAll(() {
    if (tmp.existsSync()) tmp.deleteSync(recursive: true);
  });

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    EventFeedbackStore.instance.hydrate(_guest, const {});
  });

  tearDown(() {
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    EventFeedbackStore.instance.hydrate(_guest, const {});
  });

  // -------------------------------------------------------------------------
  // Service
  // -------------------------------------------------------------------------

  group('GET /evaluation/events/:id', () {
    test('fetches the event’s questionnaire with the volunteer’s token',
        () async {
      AuthSession.setAccessToken('jwt.volunteer');
      final rec = _Recorder();

      final evaluation = await rec.service().fetchForEvent(42);

      final request = rec.lastTo(_formPath);
      expect(request.method, 'GET');
      expect(request.url.toString(), '$_origin$_formPath');
      expect(request.headers['Authorization'], 'Bearer jwt.volunteer');

      expect(evaluation.eventId, 42);
      expect(evaluation.eventTitle, 'Coastal Clean-up Drive');
      expect(evaluation.eventStatus, 'Completed');
      expect(evaluation.canSubmit, isTrue);
      expect(evaluation.submission, isNull);
      expect(evaluation.form!.id, 'form_cleanup');
      expect(evaluation.form!.isDefault, isFalse);
      expect(evaluation.form!.questions, hasLength(6));
    });

    test('maps each question as the director configured it', () async {
      final rec = _Recorder();

      final questions = (await rec.service().fetchForEvent(42)).form!.questions;

      final overall = questions[0];
      expect(overall.id, 'q_overall');
      expect(overall.type, EvaluationQuestionType.starRating);
      expect(overall.required, isTrue);
      expect(overall.scaleMax, 5);
      expect(overall.scaleMinLabel, 'Poor');
      expect(overall.scaleMaxLabel, 'Excellent');

      final role = questions[2];
      expect(role.type, EvaluationQuestionType.multipleChoice);
      expect(role.options, ['Setup', 'Registration desk', 'Clean-up']);

      final suggest = questions[5];
      expect(suggest.type, EvaluationQuestionType.paragraph);
      expect(suggest.required, isFalse);
      expect(suggest.description, 'Tell us what we can do better next time.');
    });

    test('an event that is not finished yet is refused', () async {
      final rec = _Recorder()
        ..onFetch = (_) async => _fail(404, 'Event not found');

      await expectLater(
        rec.service().fetchForEvent(42),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 404)
              .having((e) => e.message, 'message', 'Event not found'),
        ),
      );
    });
  });

  group('POST /evaluation/events/:id/responses', () {
    test('sends the answers as JSON when there are no photos', () async {
      final rec = _Recorder();
      final answers = {
        'q_overall': 4,
        'q_role': 'Clean-up',
        'q_well': ['Organization', 'Safety'],
        'q_word': 'Fulfilling',
      };

      final submission = await rec.service().submit(42, answers);

      final request = rec.lastTo(_submitPath);
      expect(request.method, 'POST');
      expect(request.headers['Content-Type'], startsWith('application/json'));
      expect(jsonDecode(request.body), {'answers': answers});

      expect(submission.id, 'resp_9f2');
      expect(submission.submittedAt, DateTime.utc(2031, 3, 15, 1).toLocal());
      expect(submission.answers, answers);
    });

    test('an image question with no photos still goes as JSON', () async {
      final rec = _Recorder();

      await rec.service().submit(
        42,
        {'q_overall': 5},
        images: {'q_photos': const []},
      );

      expect(
        rec.lastTo(_submitPath).headers['Content-Type'],
        startsWith('application/json'),
      );
    });

    test('photos switch it to multipart: answers as JSON, one part per photo',
        () async {
      final rec = _Recorder();
      String photo(String name) {
        final file = File('${tmp.path}${Platform.pathSeparator}$name')
          ..writeAsStringSync('jpeg:$name');
        return file.path;
      }

      await rec.service().submit(
        42,
        {'q_overall': 5, 'q_role': 'Setup'},
        images: {
          'q_photos': [photo('before.jpg'), photo('after.jpg')],
          'q_receipt': [photo('receipt.jpg')],
        },
      );

      final parts = _partsOf(rec.lastTo(_submitPath));
      final answers = parts.singleWhere((p) => p.name == 'answers');
      expect(jsonDecode(answers.content), {'q_overall': 5, 'q_role': 'Setup'});

      final photos = parts.where((p) => p.name?.startsWith('image_') ?? false);
      expect(photos.map((p) => '${p.name}:${p.filename}'), [
        'image_q_photos:before.jpg',
        'image_q_photos:after.jpg',
        'image_q_receipt:receipt.jpg',
      ]);
      expect(photos.first.content, 'jpeg:before.jpg');
    });

    test('a second submission for the same event is a 409', () async {
      final rec = _Recorder(
        onSubmit: (_) async =>
            _fail(409, 'You already submitted feedback for this event'),
      );

      await expectLater(
        rec.service().submit(42, {'q_overall': 5}),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 409)
              .having(
                (e) => e.message,
                'message',
                'You already submitted feedback for this event',
              ),
        ),
      );
    });
  });

  group('GET /evaluation/submissions', () {
    test('lists every event the volunteer has answered for', () async {
      final service = EventEvaluationService(
        apiClient: ApiClient(
          client: MockClient(
            (request) async => _ok({
              'submissions': [
                {'event_id': 42, 'submitted_at': '2031-03-15T01:00:00.000Z'},
                {'event_id': 7, 'submitted_at': '2031-02-01T09:30:00.000Z'},
              ],
            }),
          ),
        ),
      );

      final submissions = await service.fetchSubmissions();

      expect(submissions.map((s) => s.eventId), [42, 7]);
      expect(
        submissions.first.submittedAt,
        DateTime.utc(2031, 3, 15, 1).toLocal(),
      );
    });

    test('no submissions list reads as none', () async {
      final requests = <http.Request>[];
      final service = EventEvaluationService(
        apiClient: ApiClient(
          client: MockClient((request) async {
            requests.add(request);
            return _ok({});
          }),
        ),
      );

      expect(await service.fetchSubmissions(), isEmpty);
      expect(requests.single.url.path, _submissionsPath);
    });
  });

  // -------------------------------------------------------------------------
  // Models
  // -------------------------------------------------------------------------

  group('evaluation models', () {
    test('every question type maps from the wire; unknowns become text', () {
      for (final type in EvaluationQuestionType.values) {
        expect(EvaluationQuestionType.fromWire(type.wire), type);
      }
      expect(
        EvaluationQuestionType.fromWire('signature'),
        EvaluationQuestionType.shortAnswer,
      );
      expect(
        EvaluationQuestionType.fromWire(null),
        EvaluationQuestionType.shortAnswer,
      );
    });

    test('a bare question gets safe defaults', () {
      final q = EvaluationQuestion.fromJson({'id': 'q1'});

      expect(q.type, EvaluationQuestionType.shortAnswer);
      expect(q.title, '');
      expect(q.required, isFalse);
      expect(q.options, isEmpty);
      expect(q.scaleMax, 5);
      expect(q.maxFiles, 1);
    });

    test('non-string options are shown as text', () {
      final q = EvaluationQuestion.fromJson({
        'id': 'q1',
        'type': 'dropdown',
        'options': [1, 2, 'Other'],
      });

      expect(q.options, ['1', '2', 'Other']);
    });

    test('an evaluation with no form or submission yet', () {
      final evaluation = EventEvaluation.fromJson({'event_id': 42});

      expect(evaluation.eventStatus, 'Upcoming');
      expect(evaluation.form, isNull);
      expect(evaluation.submission, isNull);
      expect(evaluation.canSubmit, isFalse);
    });

    test('an earlier submission is read back with its answers', () {
      final evaluation = EventEvaluation.fromJson(
        _evaluation(canSubmit: false, submission: _submission()),
      );

      expect(evaluation.submission!.id, 'resp_9f2');
      expect(evaluation.submission!.answers, {'q_overall': 5});
    });
  });

  // -------------------------------------------------------------------------
  // Feedback store (the certificate gate)
  // -------------------------------------------------------------------------

  group('EventFeedbackStore', () {
    const email = 'juan@uclm.edu.ph';
    final store = EventFeedbackStore.instance;

    setUp(() => store.hydrate(email, const {}));
    tearDown(() => store.hydrate(email, const {}));

    test('a submission unlocks that event’s certificate only', () {
      expect(store.isCertificateUnlocked('event-42', email), isFalse);

      store.markSubmitted(
        eventId: 'event-42',
        participantEmail: email,
        submittedAt: DateTime(2031, 3, 15),
        answers: {'q_overall': 5},
      );

      expect(store.hasSubmitted('event-42', email), isTrue);
      expect(store.isCertificateUnlocked('event-42', email), isTrue);
      expect(store.isCertificateUnlocked('event-7', email), isFalse);
      expect(store.feedbackFor('event-42', email)!.answers, {'q_overall': 5});
    });

    test('the email is matched without case or spaces', () {
      store.markSubmitted(
        eventId: 'event-42',
        participantEmail: email,
        submittedAt: DateTime(2031, 3, 15),
      );

      expect(store.hasSubmitted('event-42', '  JUAN@uclm.edu.PH '), isTrue);
      expect(store.hasSubmitted('event-42', 'maria@uclm.edu.ph'), isFalse);
    });

    test('hydrating replaces the list with the server’s', () {
      store.markSubmitted(
        eventId: 'event-1',
        participantEmail: email,
        submittedAt: DateTime(2031, 1, 1),
        answers: {'kept': true},
      );
      store.markSubmitted(
        eventId: 'event-2',
        participantEmail: email,
        submittedAt: DateTime(2031, 1, 2),
      );

      store.hydrate(email, {
        'event-1': DateTime(2031, 1, 1),
        'event-3': DateTime(2031, 1, 3),
      });

      // Still on the server: kept as it was, answers included.
      expect(store.feedbackFor('event-1', email)!.answers, {'kept': true});
      // Gone from the server: dropped.
      expect(store.hasSubmitted('event-2', email), isFalse);
      // Submitted on another device: added.
      expect(store.hasSubmitted('event-3', email), isTrue);
    });

    test('hydrating one volunteer leaves another’s feedback alone', () {
      store.markSubmitted(
        eventId: 'event-42',
        participantEmail: 'maria@uclm.edu.ph',
        submittedAt: DateTime(2031, 3, 15),
      );

      store.hydrate(email, const {});

      expect(store.hasSubmitted('event-42', 'maria@uclm.edu.ph'), isTrue);
      store.hydrate('maria@uclm.edu.ph', const {});
    });

    test('listeners hear about changes, and only real ones', () {
      var notifications = 0;
      void listener() => notifications++;
      store.addListener(listener);
      addTearDown(() => store.removeListener(listener));

      store.markSubmitted(
        eventId: 'event-42',
        participantEmail: email,
        submittedAt: DateTime(2031, 3, 15),
      );
      expect(notifications, 1);

      // Same list as already held: nothing changes, nobody is told.
      store.hydrate(email, {'event-42': DateTime(2031, 3, 15)});
      expect(notifications, 1);

      store.clear('event-42', email);
      expect(notifications, 2);
      expect(store.hasSubmitted('event-42', email), isFalse);

      store.clear('event-42', email);
      expect(notifications, 2);
    });
  });

  // -------------------------------------------------------------------------
  // Screen — what it shows before there is anything to fill in
  // -------------------------------------------------------------------------

  group('EventFeedbackScreen — load states', () {
    testWidgets('a prototype event never asks the server', (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        await _openScreen(tester, event: _event(id: 'mock-cleanup-1'));

        expect(find.text('Could not load the questionnaire'), findsOneWidget);
        expect(
          find.text('This event is not available for feedback.'),
          findsOneWidget,
        );
        expect(rec.requests, isEmpty);
      });
    });

    testWidgets('a load failure shows the message and Try again refetches',
        (tester) async {
      final rec = _Recorder()
        ..onFetch = (_) async => _fail(503, 'Evaluation is unavailable');
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Could not load the questionnaire'), findsOneWidget);
        expect(find.text('Evaluation is unavailable'), findsOneWidget);

        rec.onFetch = null;
        await tester.tap(find.text('Try again'));
        await tester.pumpAndSettle();

        expect(rec.callsTo(_formPath), 2);
        expect(find.text('Clean-up Drive Feedback'), findsOneWidget);
      });
    });

    testWidgets('an earlier submission shows "already submitted"',
        (tester) async {
      final rec = _Recorder(
        evaluation: _evaluation(canSubmit: false, submission: _submission()),
      );
      await _withNetwork(rec, () async {
        final outcome = await _openScreen(tester);

        expect(find.text('Feedback already submitted'), findsOneWidget);
        expect(
          find.textContaining('your answers for Coastal Clean-up Drive'),
          findsOneWidget,
        );

        await tester.tap(find.text('Back'));
        await tester.pumpAndSettle();
        expect(outcome.submitted, isFalse);
      });
    });

    testWidgets('no published questionnaire yet; Refresh asks again',
        (tester) async {
      final rec = _Recorder(evaluation: _evaluation(withForm: false));
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Questionnaire not ready yet'), findsOneWidget);

        await tester.tap(find.text('Refresh'));
        await tester.pumpAndSettle();
        expect(rec.callsTo(_formPath), 2);
      });
    });

    testWidgets('a form with no questions counts as not ready',
        (tester) async {
      final rec = _Recorder(evaluation: _evaluation(questions: const []));
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Questionnaire not ready yet'), findsOneWidget);
      });
    });

    testWidgets('a completed event the volunteer missed is closed to them',
        (tester) async {
      final rec = _Recorder(evaluation: _evaluation(canSubmit: false));
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Feedback not open'), findsOneWidget);
        expect(
          find.text(
            'Only volunteers who took part in this event can give feedback.',
          ),
          findsOneWidget,
        );
      });
    });

    testWidgets('an event not yet completed has feedback closed',
        (tester) async {
      final rec = _Recorder(
        evaluation: _evaluation(canSubmit: false, status: 'Ongoing'),
      );
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(
          find.text('Feedback opens once the event has been marked as completed.'),
          findsOneWidget,
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Screen — the form
  // -------------------------------------------------------------------------

  group('EventFeedbackScreen — the form', () {
    testWidgets('shows the form, whose questions these are, and every card',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Clean-up Drive Feedback'), findsOneWidget);
        expect(
          find.text('Five minutes to help us plan the next drive.'),
          findsOneWidget,
        );
        expect(find.text('Coastal Clean-up Drive'), findsOneWidget);
        expect(find.text('Questions set for this event'), findsOneWidget);

        expect(
          find.text('Overall, how would you rate the event? *',
              findRichText: true),
          findsOneWidget,
        );
        expect(
          find.text('Any suggestions?', findRichText: true),
          findsOneWidget,
        );
        expect(
          find.text('Tell us what we can do better next time.'),
          findsOneWidget,
        );
        expect(find.text('Poor'), findsOneWidget);
        expect(find.text('Very likely'), findsOneWidget);
        expect(find.byIcon(Icons.star_outline_rounded), findsNWidgets(5));
        expect(find.text('3 required questions left.'), findsOneWidget);
      });
    });

    testWidgets('the default questionnaire is labelled as general',
        (tester) async {
      final rec = _Recorder(evaluation: _evaluation(isDefault: true));
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('General feedback questions'), findsOneWidget);
      });
    });

    testWidgets('an untitled question is numbered instead', (tester) async {
      final rec = _Recorder(
        evaluation: _evaluation(
          questions: [
            _q('q1', 'short_answer', 'Named question'),
            _q('q2', 'short_answer', '   '),
          ],
        ),
      );
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Question 2', findRichText: true), findsOneWidget);
      });
    });

    testWidgets('the required count goes down as questions are answered',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        await tester.tap(find.byTooltip('4 stars'));
        await tester.pump();
        expect(find.text('2 required questions left.'), findsOneWidget);
        expect(find.byIcon(Icons.star_rounded), findsNWidgets(4));

        await tester.tap(find.text('5'));
        await tester.pump();
        expect(find.text('1 required question left.'), findsOneWidget);

        await tester.tap(find.text('Clean-up'));
        await tester.pump();
        expect(find.textContaining('required question'), findsNothing);
      });
    });

    testWidgets('submitting with required questions missing flags them',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        await tester.tap(find.byTooltip('2 stars'));
        await tester.pump();
        await _tapSubmit(tester);

        // The rating is answered; the scale and the choice are not.
        expect(find.text('This question is required.'), findsNWidgets(2));
        expect(rec.callsTo(_submitPath), 0);
      });
    });

    testWidgets('a whitespace-only answer does not count', (tester) async {
      final rec = _Recorder(
        evaluation: _evaluation(
          questions: [
            _q('q_word', 'short_answer', 'One word', required: true),
          ],
        ),
      );
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        await tester.enterText(find.byType(TextField), '   ');
        await tester.pump();
        expect(find.text('1 required question left.'), findsOneWidget);

        await tester.enterText(find.byType(TextField), 'Fun');
        await tester.pump();
        expect(find.textContaining('required question'), findsNothing);
      });
    });

    testWidgets('submits exactly what was answered, then thanks the volunteer',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        final outcome = await _openScreen(tester);

        await _answerRequired(tester);
        await tester.tap(find.text('Organization'));
        await tester.pump();
        await tester.tap(find.text('Safety'));
        await tester.pump();
        await tester.enterText(find.byType(TextField).at(0), 'Fulfilling');
        await tester.enterText(
          find.byType(TextField).at(1),
          'More water stations, please.',
        );
        await tester.pump();

        await _tapSubmit(tester);

        expect(rec.callsTo(_submitPath), 1);
        expect(_sentAnswers(rec.lastTo(_submitPath)), {
          'q_overall': 4,
          'q_again': 5,
          'q_role': 'Clean-up',
          'q_well': ['Organization', 'Safety'],
          'q_word': 'Fulfilling',
          'q_suggest': 'More water stations, please.',
        });

        expect(find.text('Thank you for your feedback!'), findsOneWidget);
        expect(
          find.textContaining('Your feedback for Coastal Clean-up Drive'),
          findsOneWidget,
        );
        expect(
          EventFeedbackStore.instance.isCertificateUnlocked('event-42', _guest),
          isTrue,
        );
        expect(
          EventFeedbackStore.instance.feedbackFor('event-42', _guest)!.answers,
          containsPair('q_role', 'Clean-up'),
        );

        await tester.tap(find.text('Continue'));
        await tester.pumpAndSettle();
        expect(outcome.closed, isTrue);
        expect(outcome.submitted, isTrue);
      });
    });

    testWidgets('unanswered optional questions are left out', (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        await _answerRequired(tester);
        await _tapSubmit(tester);

        expect(_sentAnswers(rec.lastTo(_submitPath)), {
          'q_overall': 4,
          'q_again': 5,
          'q_role': 'Clean-up',
        });
      });
    });

    testWidgets('unticking every checkbox and clearing text removes them',
        (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        await _answerRequired(tester);
        await tester.tap(find.text('Communication'));
        await tester.pump();
        await tester.tap(find.text('Communication'));
        await tester.pump();
        await tester.enterText(find.byType(TextField).at(0), 'Tiring');
        await tester.enterText(find.byType(TextField).at(0), '');
        await tester.pump();

        await _tapSubmit(tester);

        final sent = _sentAnswers(rec.lastTo(_submitPath));
        expect(sent.containsKey('q_well'), isFalse);
        expect(sent.containsKey('q_word'), isFalse);
      });
    });

    testWidgets('changing an answer sends the latest pick', (tester) async {
      final rec = _Recorder();
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        await _answerRequired(tester);
        await tester.tap(find.byTooltip('2 stars'));
        await tester.tap(find.text('Setup'));
        await tester.pump();

        await _tapSubmit(tester);

        final sent = _sentAnswers(rec.lastTo(_submitPath));
        expect(sent['q_overall'], 2);
        expect(sent['q_role'], 'Setup');
      });
    });

    testWidgets('a dropdown question sends the chosen option',
        (tester) async {
      final rec = _Recorder(
        evaluation: _evaluation(
          questions: [
            _q(
              'q_dept',
              'dropdown',
              'Which department are you from?',
              required: true,
              options: ['CBA', 'CCS', 'CTE'],
            ),
          ],
        ),
      );
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Choose one'), findsOneWidget);
        await tester.tap(find.text('Choose one'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('CCS').last);
        await tester.pumpAndSettle();

        await _tapSubmit(tester);

        expect(_sentAnswers(rec.lastTo(_submitPath)), {'q_dept': 'CCS'});
      });
    });

    testWidgets('a date question starts empty', (tester) async {
      final rec = _Recorder(
        evaluation: _evaluation(
          questions: [_q('q_date', 'date', 'When did you arrive?')],
        ),
      );
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Pick a date'), findsOneWidget);
      });
    });

    testWidgets('an image question offers to add photos', (tester) async {
      final rec = _Recorder(
        evaluation: _evaluation(
          questions: [_q('q_photo', 'image_upload', 'Share a photo')],
        ),
      );
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        expect(find.text('Share a photo', findRichText: true), findsOneWidget);
        // Nothing attached yet, so no thumbnails.
        expect(find.byType(Image), findsNothing);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Screen — when the server refuses
  // -------------------------------------------------------------------------

  group('EventFeedbackScreen — refusals', () {
    testWidgets('a 409 means it was already sent: mirror it and say so',
        (tester) async {
      final rec = _Recorder(
        onSubmit: (_) async =>
            _fail(409, 'You already submitted feedback for this event'),
      );
      await _withNetwork(rec, () async {
        final outcome = await _openScreen(tester);

        await _answerRequired(tester);
        await _tapSubmit(tester);

        expect(
          find.text('You already submitted feedback for this event'),
          findsOneWidget,
        );
        expect(
          EventFeedbackStore.instance.hasSubmitted('event-42', _guest),
          isTrue,
        );
        expect(find.text('Thank you for your feedback!'), findsNothing);
        expect(outcome.closed, isFalse);
      });
    });

    testWidgets('any other refusal is shown and nothing is recorded',
        (tester) async {
      final rec = _Recorder(
        onSubmit: (_) async =>
            _fail(400, 'Answer for q_again must be between 1 and 5'),
      );
      await _withNetwork(rec, () async {
        await _openScreen(tester);

        await _answerRequired(tester);
        await _tapSubmit(tester);

        expect(
          find.text('Answer for q_again must be between 1 and 5'),
          findsOneWidget,
        );
        expect(
          EventFeedbackStore.instance.hasSubmitted('event-42', _guest),
          isFalse,
        );
        // The button is usable again for another try.
        expect(
          tester.widget<ButtonStyleButton>(_submitButton).onPressed,
          isNotNull,
        );
      });
    });
  });
}
