// Unit tests for Help & Support — the FAQ, search, and the support tickets a
// user files and follows up on:
//
//   kHelpArticles / searchHelpArticles     the static FAQ and its ranking
//   GET  /v1/support-tickets/me                     SupportTicketService.fetchMine
//   GET  /v1/support-tickets/me/:id                 SupportTicketService.fetchOne
//   POST /v1/support-tickets/me                     SupportTicketService.create
//   POST /v1/support-tickets/me/:id/replies         SupportTicketService.reply
//   POST /v1/support-tickets/me/:id/confirm-fix     SupportTicketService.confirmFix
//   POST /v1/support-tickets/me/:id/reopen          SupportTicketService.reopen
//   SupportRequestsNotifier                the shared ticket list
//   HelpSupportScreen, ContactSupportScreen, SupportMessageFormScreen,
//   SupportRequestSubmittedScreen, MySupportRequestsScreen,
//   SupportRequestDetailScreen, ReportBugScreen, ReportProblemScreen,
//   ReportFormScreen, ReportSubmittedScreen
//
// The screens read tickets through `supportTicketServiceProvider`, which is
// overridden with a service on package:http's MockClient. Every ticket and
// reply is a local fixture — nothing reaches a server.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/dashboard/data/help_center_data.dart';
import 'package:mobile/features/dashboard/data/models/support_ticket_models.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/data/support_ticket_service.dart';
import 'package:mobile/features/dashboard/presentation/providers/support_requests_provider.dart';
import 'package:mobile/features/dashboard/screens/help_support_screen.dart';
import 'package:mobile/features/dashboard/widgets/help_support_widgets.dart';

const _origin = 'http://api.test';
const _mine = '/v1/support-tickets/me';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

Map<String, dynamic> _reply({
  String author = 'Ana Cruz',
  String type = 'STAFF',
  String body = 'Could you send the donation reference number?',
  String at = '2031-03-11T02:05:00.000Z',
}) => {
  'author_name': author,
  'author_type': type,
  'body': body,
  'created_at': at,
};

Map<String, dynamic> _ticketJson({
  String id = 't-1',
  int reference = 12,
  String subject = 'Donation receipt not received',
  String description = 'I donated ₱500 on March 9 but never got a receipt.',
  String type = 'ACCOUNT',
  String status = 'OPEN',
  String? assignee,
  List<Map<String, dynamic>> replies = const [],
  String created = '2031-03-10T04:00:00.000Z',
  String updated = '2031-03-11T04:00:00.000Z',
}) => {
  'support_ticket_id': id,
  'reference_number': reference,
  'subject': subject,
  'description': description,
  'type': type,
  'status': status,
  'assignee_name': assignee,
  'replies': replies,
  'created_at': created,
  'updated_at': updated,
};

SupportRequest _request(Map<String, dynamic> json) =>
    SupportTicketResponse.fromJson(json).toRequest();

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

typedef _Handler = Future<http.Response> Function(http.Request request);

/// A tiny support desk: keeps tickets, answers the `me/` endpoints, and moves
/// a ticket along the way the portal would.
class _Desk {
  _Desk([List<Map<String, dynamic>>? tickets]) : tickets = [...?tickets];

  final List<Map<String, dynamic>> tickets;
  final List<http.Request> requests = [];

  /// Overrides keyed `METHOD path`.
  final Map<String, _Handler> overrides = {};

  var _nextReference = 40;

  List<http.Request> where(String method, String path) =>
      requests.where((r) => r.method == method && r.url.path == path).toList();

  Map<String, dynamic> _find(String id) =>
      tickets.firstWhere((t) => t['support_ticket_id'] == id);

  Map<String, dynamic> _update(String id, Map<String, dynamic> changes) {
    final index = tickets.indexWhere((t) => t['support_ticket_id'] == id);
    final next = {...tickets[index], ...changes};
    tickets[index] = next;
    return next;
  }

  List<Map<String, dynamic>> _withReply(String id, String body) => [
    ...(_find(id)['replies'] as List).cast<Map<String, dynamic>>(),
    _reply(author: 'Rosa Reyes', type: 'REQUESTER', body: body),
  ];

  Future<http.Response> _handle(http.Request request) async {
    requests.add(request);
    final custom = overrides['${request.method} ${request.url.path}'];
    if (custom != null) return custom(request);

    final path = request.url.path;
    final body = request.body.isEmpty
        ? const <String, dynamic>{}
        : jsonDecode(request.body) as Map<String, dynamic>;

    if (request.method == 'GET' && path == _mine) {
      return _ok({'items': tickets});
    }
    if (request.method == 'POST' && path == _mine) {
      final created = _ticketJson(
        id: 't-new',
        reference: _nextReference++,
        subject: body['subject'] as String,
        description: body['description'] as String,
        type: body['type'] as String,
        created: '2031-03-12T01:00:00.000Z',
        updated: '2031-03-12T01:00:00.000Z',
      );
      tickets.insert(0, created);
      return _ok(created);
    }
    final match = RegExp('^$_mine/([^/]+)(?:/(.+))?\$').firstMatch(path);
    if (match != null) {
      final id = match[1]!;
      final action = match[2];
      if (request.method == 'GET' && action == null) return _ok(_find(id));
      if (request.method == 'POST') {
        switch (action) {
          case 'replies':
            return _ok(
              _update(id, {
                'status': 'IN_PROGRESS',
                'replies': _withReply(id, body['body'] as String),
              }),
            );
          case 'confirm-fix':
            final fixed = body['fixed'] as bool;
            return _ok(
              _update(id, {
                'status': fixed ? 'RESOLVED' : 'IN_PROGRESS',
                if (!fixed) 'replies': _withReply(id, body['body'] as String),
              }),
            );
          case 'reopen':
            return _ok(
              _update(id, {
                'status': 'OPEN',
                'replies': _withReply(id, body['body'] as String),
              }),
            );
        }
      }
    }
    return _fail(404, 'Not found');
  }

  http.Client client() => MockClient(_handle);

  SupportTicketService service() =>
      SupportTicketService(apiClient: ApiClient(client: client()));
}

http.Response _json(int status, Map<String, dynamic> body) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response _ok(Object data) =>
    _json(200, {'ok': true, 'message': 'OK', 'data': data});

http.Response _fail(int status, String message) =>
    _json(status, {'ok': false, 'message': message});

Map<String, dynamic> _bodyOf(http.Request request) =>
    jsonDecode(request.body) as Map<String, dynamic>;

// ---------------------------------------------------------------------------
// Screen harness
// ---------------------------------------------------------------------------

/// Pumps [home] in a ProviderScope whose ticket service talks to [desk], on a
/// tall surface so long pages build without scrolling.
Future<void> _pump(WidgetTester tester, _Desk desk, Widget home) async {
  tester.view.physicalSize = const Size(900, 4200);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        supportTicketServiceProvider.overrideWithValue(desk.service()),
      ],
      child: MaterialApp(home: home),
    ),
  );
  await tester.pumpAndSettle();
}

Finder _button(String label) => find.ancestor(
  of: find.text(label),
  matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
);

Finder _field(String hint) => find.byWidgetPredicate(
  (w) => w is TextField && w.decoration?.hintText == hint,
);

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder.first);
  await tester.tap(finder.first);
  await tester.pumpAndSettle();
}

Future<void> _type(WidgetTester tester, String hint, String text) async {
  await tester.enterText(_field(hint), text);
  await tester.pump();
}

/// Whether the FAQ entry for [question] is open.
bool _faqOpen(WidgetTester tester, String question) {
  final tile = find.ancestor(
    of: find.text(question),
    matching: find.byType(FaqExpansionTile),
  );
  return tester
          .widget<AnimatedCrossFade>(
            find.descendant(
              of: tile.first,
              matching: find.byType(AnimatedCrossFade),
            ),
          )
          .crossFadeState ==
      CrossFadeState.showFirst;
}

/// Picks a ticket type from the "What is this about?" sheet.
Future<void> _pickType(WidgetTester tester, SupportTicketType type) async {
  await _tap(tester, find.text('Select what this is about'));
  await _tap(tester, find.text(type.label).last);
}

const _subjectHint = 'e.g. Donation receipt not received';
const _descriptionHint =
    'Include dates, amounts, event names, or reference numbers where you can.';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  tearDown(() {
    // Filing a ticket schedules a notifications re-read.
    NotificationSync.instance.stop();
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  /// A widget test that drops the notification follow-up timer before the
  /// framework checks for pending timers.
  void screenTest(
    String description,
    Future<void> Function(WidgetTester) body,
  ) {
    testWidgets(description, (tester) async {
      await body(tester);
      NotificationSync.instance.stop();
    });
  }

  // =========================================================================
  // FAQ content and search
  // =========================================================================

  group('help content', () {
    test('every topic has a label, short label, blurb and articles', () {
      expect(HelpTopic.values.map((t) => t.label), [
        'Donations',
        'Events',
        'Account & Profile',
        'Payments',
      ]);
      expect(HelpTopic.account.shortLabel, 'Account');
      expect(HelpTopic.payments.blurb, 'Failed charges and payment methods');
      expect(kQuickHelpTopics, [
        HelpTopic.donations,
        HelpTopic.events,
        HelpTopic.account,
      ]);
      expect(articlesForTopic(HelpTopic.donations), hasLength(6));
      expect(articlesForTopic(HelpTopic.events), hasLength(5));
      expect(articlesForTopic(HelpTopic.account), hasLength(4));
      expect(articlesForTopic(HelpTopic.payments), hasLength(3));
    });

    test('article ids are unique and every answer is filled in', () {
      final ids = kHelpArticles.map((a) => a.id).toList();
      expect(ids.toSet(), hasLength(ids.length));
      for (final article in kHelpArticles) {
        expect(article.question.trim(), isNotEmpty, reason: article.id);
        expect(
          article.answer.trim().length,
          greaterThan(40),
          reason: article.id,
        );
      }
    });

    test('search needs at least one word of two letters', () {
      expect(searchHelpArticles(''), isEmpty);
      expect(searchHelpArticles('   '), isEmpty);
      expect(searchHelpArticles('a ? !'), isEmpty);
    });

    test('a question match ranks above an answer-only match', () {
      final results = searchHelpArticles('password');
      expect(results.first.id, 'acc-password');
      expect(results.map((a) => a.id), contains('acc-password'));
    });

    test('search ignores case and punctuation', () {
      expect(
        searchHelpArticles('REFUND??').first.id,
        searchHelpArticles('refund').first.id,
      );
      expect(searchHelpArticles('refund').first.id, 'don-refund');
    });

    test('a topic name finds that topic\'s articles', () {
      final results = searchHelpArticles('payments');
      expect(results, isNotEmpty);
      expect(
        results.take(3).every((a) => a.topic == HelpTopic.payments),
        isTrue,
      );
    });

    test('nothing matches gibberish', () {
      expect(searchHelpArticles('xyzzy qwerty'), isEmpty);
    });

    test('every example search returns something', () {
      for (final example in kExampleSearches) {
        expect(searchHelpArticles(example), isNotEmpty, reason: example);
      }
    });
  });

  // =========================================================================
  // Ticket model
  // =========================================================================

  group('support statuses, types and priority', () {
    test('status labels and who has the ball', () {
      expect(SupportRequestStatus.values.map((s) => s.label), [
        'Open',
        'In Progress',
        'Confirm Fix',
        'Needs Your Reply',
        'Resolved',
        'Closed',
      ]);
      expect(SupportRequestStatus.values.where((s) => s.needsRequesterAction), [
        SupportRequestStatus.underVerification,
        SupportRequestStatus.clientFeedback,
      ]);
      expect(SupportRequestStatus.values.where((s) => !s.isUnresolved), [
        SupportRequestStatus.resolved,
        SupportRequestStatus.closed,
      ]);
      for (final s in SupportRequestStatus.values) {
        expect(s.hint, isNotEmpty);
      }
    });

    test('priority follows the type, as on the portal', () {
      final issue = [
        SupportTicketType.bug,
        SupportTicketType.login,
        SupportTicketType.verification,
        SupportTicketType.mobileApp,
        SupportTicketType.report,
      ];
      final support = [
        SupportTicketType.account,
        SupportTicketType.event,
        SupportTicketType.other,
      ];
      for (final t in issue) {
        expect(t.priority, SupportPriority.issue, reason: t.name);
      }
      for (final t in support) {
        expect(t.priority, SupportPriority.support, reason: t.name);
      }
      expect(
        SupportTicketType.featureRequest.priority,
        SupportPriority.feature,
      );
      expect(
        SupportPriority.issue.caption,
        'High priority — broken or blocking',
      );
      expect(SupportPriority.feature.label, 'Feature');
    });

    test('types map to the server enum and back', () {
      expect(SupportTicketType.values.map(supportTicketTypeToApi), [
        'BUG',
        'LOGIN',
        'ACCOUNT',
        'VERIFICATION',
        'EVENT',
        'MOBILE_APP',
        'FEATURE_REQUEST',
        'REPORT',
        'OTHER',
      ]);
      for (final t in SupportTicketType.values) {
        expect(supportTicketTypeFromApi(supportTicketTypeToApi(t)), t);
      }
      expect(supportTicketTypeFromApi('PAYMENTS'), SupportTicketType.other);
      expect(SupportTicketType.login.label, 'Login Issue');
    });

    test('reference numbers are padded to three digits', () {
      expect(formatSupportReference(7), 'Support #007');
      expect(formatSupportReference(12), 'Support #012');
      expect(formatSupportReference(1234), 'Support #1234');
    });

    test('dates read as "Mar 4, 2031 · 3:05 PM"', () {
      expect(formatSupportDate(DateTime(2031, 3, 4, 15, 5)), 'Mar 4, 2031');
      expect(
        formatSupportDateTime(DateTime(2031, 3, 4, 15, 5)),
        'Mar 4, 2031 · 3:05 PM',
      );
      expect(
        formatSupportDateTime(DateTime(2031, 3, 4, 0, 9)),
        'Mar 4, 2031 · 12:09 AM',
      );
      expect(
        formatSupportDateTime(DateTime(2031, 3, 4, 12, 0)),
        'Mar 4, 2031 · 12:00 PM',
      );
    });

    test('bug and report options', () {
      expect(BugArea.other.label, 'Somewhere else');
      expect(BugArea.values, hasLength(8));
      expect(BugFrequency.values.map((f) => f.label), [
        'Every time',
        'Sometimes',
        'Just once',
      ]);
      expect(ReportReason.values, hasLength(5));
      expect(ReportReason.user.label, 'Report a user');
      expect(
        ReportReason.user.hint,
        'Username or profile link, and what they did',
      );
      expect(BugDeviceInfo.summary, startsWith(Platform.operatingSystem));
    });

    test('server errors are shown as-is, anything else as one line', () {
      expect(
        describeSupportError(ApiException('Subject is too long.')),
        'Subject is too long.',
      );
      expect(
        describeSupportError(StateError('boom')),
        'Something went wrong. Please try again.',
      );
    });
  });

  group('SupportTicketResponse', () {
    test('maps a ticket and its conversation', () {
      final r = _request(
        _ticketJson(
          status: 'CLIENT_FEEDBACK',
          type: 'MOBILE_APP',
          assignee: 'Ana Cruz',
          replies: [
            _reply(),
            _reply(
              author: 'Rosa Reyes',
              type: 'REQUESTER',
              body: 'It is DN-0007.',
            ),
          ],
        ),
      );
      expect(r.id, 't-1');
      expect(r.referenceId, 'Support #012');
      expect(r.type, SupportTicketType.mobileApp);
      expect(r.priority, SupportPriority.issue);
      expect(r.status, SupportRequestStatus.clientFeedback);
      expect(r.assignee, 'Ana Cruz');
      expect(r.conversation, hasLength(2));
      expect(r.conversation[0].author, SupportAuthor.agent);
      expect(r.conversation[0].authorName, 'Ana Cruz');
      expect(r.conversation[1].author, SupportAuthor.you);
      expect(r.conversation[1].authorName, isNull); // it is the requester
      expect(
        r.conversation[0].timeLabel,
        formatSupportDateTime(DateTime.utc(2031, 3, 11, 2, 5)),
      );
      expect(r.submittedLabel, formatSupportDate(DateTime.utc(2031, 3, 10, 4)));
    });

    test('every server status, unknown ones read as Open', () {
      const wire = {
        'OPEN': SupportRequestStatus.open,
        'IN_PROGRESS': SupportRequestStatus.inProgress,
        'UNDER_VERIFICATION': SupportRequestStatus.underVerification,
        'CLIENT_FEEDBACK': SupportRequestStatus.clientFeedback,
        'RESOLVED': SupportRequestStatus.resolved,
        'CLOSED': SupportRequestStatus.closed,
        'ESCALATED': SupportRequestStatus.open,
      };
      wire.forEach((value, status) {
        expect(
          _request(_ticketJson(status: value)).status,
          status,
          reason: value,
        );
      });
    });

    test('an unassigned ticket has no assignee', () {
      expect(_request(_ticketJson()).assignee, isNull);
    });
  });

  group('SupportRequestSummary and filters', () {
    final requests = [
      _request(_ticketJson(id: 'a', status: 'OPEN')),
      _request(_ticketJson(id: 'b', status: 'IN_PROGRESS')),
      _request(_ticketJson(id: 'c', status: 'UNDER_VERIFICATION')),
      _request(_ticketJson(id: 'd', status: 'CLIENT_FEEDBACK')),
      _request(_ticketJson(id: 'e', status: 'RESOLVED')),
      _request(_ticketJson(id: 'f', status: 'CLOSED')),
    ];

    test('counts total, unresolved, waiting on you and resolved', () {
      final s = SupportRequestSummary.of(requests);
      expect(s.total, 6);
      expect(s.unresolved, 4);
      expect(s.needsAction, 2);
      expect(s.resolved, 2);
      final empty = SupportRequestSummary.of(const []);
      expect(
        [empty.total, empty.unresolved, empty.needsAction, empty.resolved],
        [0, 0, 0, 0],
      );
    });

    test('each filter shows its slice', () {
      List<String> ids(SupportRequestFilter f) =>
          requests.where(f.matches).map((r) => r.id).toList();
      expect(ids(SupportRequestFilter.all), ['a', 'b', 'c', 'd', 'e', 'f']);
      expect(ids(SupportRequestFilter.needsAction), ['c', 'd']);
      expect(ids(SupportRequestFilter.active), ['a', 'b']);
      expect(ids(SupportRequestFilter.closed), ['e', 'f']);
      expect(SupportRequestFilter.values.map((f) => f.label), [
        'All',
        'Waiting on you',
        'In progress',
        'Resolved',
      ]);
    });
  });

  // =========================================================================
  // Service and shared list
  // =========================================================================

  group('SupportTicketService', () {
    setUp(() => AuthSession.setAccessToken('jwt.volunteer'));

    test('fetchMine lists the caller\'s tickets with the token', () async {
      final desk = _Desk([
        _ticketJson(),
        _ticketJson(id: 't-2', reference: 13),
      ]);

      final mine = await desk.service().fetchMine();

      expect(mine.map((r) => r.referenceId), ['Support #012', 'Support #013']);
      final request = desk.requests.single;
      expect(request.url.toString(), '$_origin$_mine');
      expect(request.headers['authorization'], 'Bearer jwt.volunteer');
    });

    test('fetchOne reads a single ticket', () async {
      final desk = _Desk([_ticketJson(status: 'RESOLVED')]);

      final one = await desk.service().fetchOne('t-1');

      expect(one.status, SupportRequestStatus.resolved);
      expect(desk.requests.single.url.path, '$_mine/t-1');
    });

    test(
      'create sends subject, description and type — never a priority',
      () async {
        final desk = _Desk();

        final created = await desk.service().create(
          subject: 'Cannot log in',
          description: 'The OTP never arrives on my phone.',
          type: SupportTicketType.login,
        );

        expect(_bodyOf(desk.where('POST', _mine).single), {
          'subject': 'Cannot log in',
          'description': 'The OTP never arrives on my phone.',
          'type': 'LOGIN',
        });
        expect(created.referenceId, 'Support #040');
        expect(created.priority, SupportPriority.issue);
      },
    );

    test('reply, confirmFix and reopen post to their own endpoints', () async {
      final desk = _Desk([_ticketJson(status: 'UNDER_VERIFICATION')]);
      final service = desk.service();

      await service.reply('t-1', 'Here is the screenshot.');
      await service.confirmFix('t-1', fixed: true);
      await service.confirmFix('t-1', fixed: false, body: 'Still broken.');
      await service.reopen('t-1', 'It came back.');

      expect(_bodyOf(desk.where('POST', '$_mine/t-1/replies').single), {
        'body': 'Here is the screenshot.',
      });
      final fixes = desk.where('POST', '$_mine/t-1/confirm-fix');
      expect(_bodyOf(fixes[0]), {'fixed': true}); // no body key at all
      expect(_bodyOf(fixes[1]), {'fixed': false, 'body': 'Still broken.'});
      expect(_bodyOf(desk.where('POST', '$_mine/t-1/reopen').single), {
        'body': 'It came back.',
      });
    });

    test('a refusal carries the server message', () async {
      final desk = _Desk()
        ..overrides['POST $_mine'] = (_) async =>
            _fail(429, 'You have filed too many requests today.');

      await expectLater(
        desk.service().create(
          subject: 'x',
          description: 'xxxxxxxxxxxx',
          type: SupportTicketType.other,
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 429)
              .having(
                (e) => e.message,
                'message',
                'You have filed too many requests today.',
              ),
        ),
      );
    });
  });

  group('SupportRequestsNotifier', () {
    late _Desk desk;
    late ProviderContainer container;

    setUp(() {
      desk = _Desk([
        _ticketJson(id: 't-1', reference: 12),
        _ticketJson(id: 't-2', reference: 13, status: 'CLIENT_FEEDBACK'),
      ]);
      container = ProviderContainer(
        overrides: [
          supportTicketServiceProvider.overrideWithValue(desk.service()),
        ],
      );
      addTearDown(container.dispose);
    });

    SupportRequestsNotifier notifier() =>
        container.read(supportRequestsProvider.notifier);

    List<String> ids() => container
        .read(supportRequestsProvider)
        .value!
        .map((r) => r.id)
        .toList();

    test('loads the tickets once', () async {
      await container.read(supportRequestsProvider.future);
      expect(ids(), ['t-1', 't-2']);
      expect(desk.where('GET', _mine), hasLength(1));
    });

    test('a new ticket goes to the top', () async {
      await container.read(supportRequestsProvider.future);

      final created = await notifier().create(
        subject: 'Feature idea',
        description: 'Dark mode for night briefings.',
        type: SupportTicketType.featureRequest,
      );

      expect(created.id, 't-new');
      expect(ids(), ['t-new', 't-1', 't-2']);
      expect(desk.where('GET', _mine), hasLength(1)); // no refetch
    });

    test('a changed ticket keeps its slot', () async {
      await container.read(supportRequestsProvider.future);

      await notifier().reply('t-2', 'The reference is DN-0007.');

      expect(ids(), ['t-1', 't-2']);
      final t2 = container.read(supportRequestsProvider).value![1];
      expect(t2.status, SupportRequestStatus.inProgress);
      expect(t2.conversation.last.body, 'The reference is DN-0007.');
    });

    test('refresh re-reads the list', () async {
      await container.read(supportRequestsProvider.future);
      desk.tickets.removeAt(0);

      await notifier().refresh();

      expect(ids(), ['t-2']);
      expect(desk.where('GET', _mine), hasLength(2));
    });

    test('a failed load surfaces as an error', () async {
      desk.overrides['GET $_mine'] = (_) async => _fail(503, 'Desk offline.');

      await expectLater(
        container.read(supportRequestsProvider.future),
        throwsA(isA<ApiException>()),
      );
      expect(container.read(supportRequestsProvider).hasError, isTrue);
    });

    test('a refused change leaves the list as it was', () async {
      await container.read(supportRequestsProvider.future);
      desk.overrides['POST $_mine/t-1/reopen'] = (_) async =>
          _fail(409, 'This request is not closed.');

      await expectLater(
        notifier().reopen('t-1', 'again'),
        throwsA(isA<ApiException>()),
      );

      expect(ids(), ['t-1', 't-2']);
      expect(
        container.read(supportRequestsProvider).value!.first.status,
        SupportRequestStatus.open,
      );
    });
  });

  // =========================================================================
  // Help & Support home
  // =========================================================================

  group('HelpSupportScreen', () {
    screenTest('shows search, quick actions, quick help, FAQ and more help', (
      tester,
    ) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());

      expect(find.text('Help & Support'), findsOneWidget);
      expect(find.text('What can we help you with?'), findsOneWidget);
      expect(_field('Search for a question or topic...'), findsOneWidget);
      expect(find.text('Report a Bug'), findsNWidgets(2)); // action + card
      expect(find.text('My Requests'), findsOneWidget);
      expect(find.text('Nothing open right now'), findsOneWidget);
      expect(find.text('Quick Help'), findsOneWidget);
      expect(find.byType(QuickHelpCard), findsNWidgets(3));
      expect(find.text('Frequently Asked Questions (FAQ)'), findsOneWidget);
      expect(find.text('Tap a question to see the answer.'), findsOneWidget);
      expect(
        find.byType(FaqExpansionTile),
        findsNWidgets(kHelpArticles.length),
      );
      for (final title in [
        'Need More Help?',
        'Suggest a Feature',
        'My Support Requests',
        'Report a Problem',
      ]) {
        expect(find.text(title), findsOneWidget, reason: title);
      }
    });

    screenTest('a FAQ question opens and closes on tap', (tester) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());
      const question = 'How do I change my password?';
      expect(_faqOpen(tester, question), isFalse);

      await _tap(tester, find.text(question));
      expect(_faqOpen(tester, question), isTrue);

      await _tap(tester, find.text(question));
      expect(_faqOpen(tester, question), isFalse);
    });

    screenTest('a quick help topic narrows the FAQ, tapped again shows all', (
      tester,
    ) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());

      await _tap(tester, find.byType(QuickHelpCard).first); // Donations

      expect(find.text('Showing Donations'), findsOneWidget);
      expect(find.byType(FaqExpansionTile), findsNWidgets(6));
      expect(find.text('How do I register for an event?'), findsNothing);

      await _tap(tester, find.byType(QuickHelpCard).first);
      expect(
        find.byType(FaqExpansionTile),
        findsNWidgets(kHelpArticles.length),
      );
    });

    screenTest('"Show all" clears the topic', (tester) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());
      await _tap(tester, find.byType(QuickHelpCard).at(1)); // Events
      expect(find.byType(FaqExpansionTile), findsNWidgets(5));

      await _tap(tester, find.text('Show all'));

      expect(find.text('Tap a question to see the answer.'), findsOneWidget);
      expect(
        find.byType(FaqExpansionTile),
        findsNWidgets(kHelpArticles.length),
      );
    });

    screenTest('searching lists ranked results and hides the rest', (
      tester,
    ) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());

      await _type(tester, 'Search for a question or topic...', 'password');

      final expected = searchHelpArticles('password');
      expect(
        find.text(
          '${expected.length} result${expected.length == 1 ? '' : 's'}',
        ),
        findsOneWidget,
      );
      expect(find.text(expected.first.question), findsOneWidget);
      expect(find.text('Quick Help'), findsNothing);
      expect(find.text('Need More Help?'), findsNothing);
    });

    screenTest('no results offers to contact support', (tester) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());

      await _type(tester, 'Search for a question or topic...', 'xyzzy');

      expect(find.text('No results for "xyzzy"'), findsOneWidget);
      await _tap(tester, _button('Contact Support'));
      expect(find.byType(ContactSupportScreen), findsOneWidget);
    });

    screenTest('Clear empties the search and brings the page back', (
      tester,
    ) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());
      await _type(tester, 'Search for a question or topic...', 'refund');
      expect(find.text('Quick Help'), findsNothing);

      await _tap(tester, find.byTooltip('Clear'));

      expect(
        tester
            .widget<TextField>(_field('Search for a question or topic...'))
            .controller!
            .text,
        isEmpty,
      );
      expect(find.text('Quick Help'), findsOneWidget);
    });

    screenTest('focusing the empty search suggests examples', (tester) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());

      await _tap(tester, _field('Search for a question or topic...'));

      expect(find.text('Try searching for:'), findsOneWidget);
      for (final example in kExampleSearches) {
        expect(find.text(example), findsWidgets, reason: example);
      }

      await _tap(tester, find.text('How can I cancel my donation?'));

      expect(find.text('Try searching for:'), findsNothing);
      expect(
        tester
            .widget<TextField>(_field('Search for a question or topic...'))
            .controller!
            .text,
        'How can I cancel my donation?',
      );
      expect(find.textContaining(RegExp(r'^\d+ results?$')), findsOneWidget);
    });

    screenTest('My Requests counts what is open and what waits on you', (
      tester,
    ) async {
      final desk = _Desk([
        _ticketJson(id: 'a', status: 'OPEN'),
        _ticketJson(id: 'b', status: 'UNDER_VERIFICATION'),
        _ticketJson(id: 'c', status: 'RESOLVED'),
      ]);
      await _pump(tester, desk, const HelpSupportScreen());

      expect(find.text('2 open'), findsOneWidget);
      expect(find.text('1 request is waiting on you'), findsOneWidget);

      await _tap(tester, find.text('1 request is waiting on you'));

      expect(find.byType(MySupportRequestsScreen), findsOneWidget);
      // Opened on the "Waiting on you" filter.
      expect(find.byType(SupportRequestTile), findsOneWidget);
    });

    screenTest('a failed ticket load breaks the quick actions', (tester) async {
      final desk = _Desk()
        ..overrides['GET $_mine'] = (_) async => _fail(503, 'Desk offline.');
      await _pump(tester, desk, const HelpSupportScreen());

      // Same AsyncValue.value rethrow as the list screen: offline, the
      // "Report a Bug / My Requests" row fails to build. The static FAQ
      // below it still renders.
      expect(tester.takeException(), isA<ApiException>());
      expect(find.text('My Requests'), findsNothing);
      expect(find.text('Quick Help'), findsOneWidget);
    });

    screenTest('several requests waiting reads in the plural', (tester) async {
      final desk = _Desk([
        _ticketJson(id: 'a', status: 'UNDER_VERIFICATION'),
        _ticketJson(id: 'b', status: 'CLIENT_FEEDBACK'),
      ]);
      await _pump(tester, desk, const HelpSupportScreen());

      expect(find.text('2 requests are waiting on you'), findsOneWidget);
    });

    for (final (card, screen) in [
      ('Suggest a Feature', SupportMessageFormScreen),
      ('My Support Requests', MySupportRequestsScreen),
      ('Report a Problem', ReportProblemScreen),
    ]) {
      screenTest('"$card" opens its screen', (tester) async {
        await _pump(tester, _Desk(), const HelpSupportScreen());

        await _tap(tester, find.text(card));

        expect(find.byType(screen), findsOneWidget);
      });
    }

    screenTest('the Report a Bug action opens the bug form', (tester) async {
      await _pump(tester, _Desk(), const HelpSupportScreen());

      await _tap(tester, find.text('Report a Bug'));

      expect(find.byType(ReportBugScreen), findsOneWidget);
    });
  });

  // =========================================================================
  // Contact Support
  // =========================================================================

  group('ContactSupportScreen', () {
    screenTest('offers a message or the help desk', (tester) async {
      await _pump(tester, _Desk(), const ContactSupportScreen());

      expect(find.text('Still need help?'), findsOneWidget);
      expect(find.text('Send Us a Message'), findsOneWidget);

      await _tap(tester, find.text('Send Us a Message'));
      expect(find.byType(SupportMessageFormScreen), findsOneWidget);
    });

    screenTest('help desk details can be copied', (tester) async {
      final copied = <String>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            copied.add((call.arguments as Map)['text'] as String);
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      await _pump(tester, _Desk(), const ContactSupportScreen());

      await _tap(tester, find.text('Phone and email for the CARES help desk'));

      expect(find.text('CARES Help Desk'), findsOneWidget);
      expect(find.text(SupportContactInfo.email), findsOneWidget);
      expect(find.text(SupportContactInfo.hotline), findsOneWidget);
      expect(find.text(SupportContactInfo.hours), findsOneWidget);
      expect(
        find.byTooltip('Copy'),
        findsNWidgets(2),
      ); // hours are not copyable

      await _tap(tester, find.byTooltip('Copy').first);

      expect(copied, [SupportContactInfo.email]);
      expect(find.text('Copied "${SupportContactInfo.email}"'), findsOneWidget);
      expect(find.text('CARES Help Desk'), findsNothing);
    });
  });

  // =========================================================================
  // Send Us a Message
  // =========================================================================

  group('SupportMessageFormScreen', () {
    screenTest('an empty submit shows every error and sends nothing', (
      tester,
    ) async {
      final desk = _Desk();
      await _pump(tester, desk, const SupportMessageFormScreen());

      expect(find.text('Send Us a Message'), findsOneWidget);
      await _tap(tester, _button('Submit Request'));

      expect(find.text('Choose what this is about'), findsOneWidget);
      expect(find.text('Add a short subject'), findsOneWidget);
      expect(
        find.text('Tell us a little more (at least 10 characters)'),
        findsOneWidget,
      );
      expect(desk.where('POST', _mine), isEmpty);
    });

    screenTest('errors clear as the fields are filled', (tester) async {
      final desk = _Desk();
      await _pump(tester, desk, const SupportMessageFormScreen());
      await _tap(tester, _button('Submit Request'));

      await _pickType(tester, SupportTicketType.account);
      await _type(tester, _subjectHint, 'Receipt missing');
      await _type(tester, _descriptionHint, 'too short');

      expect(find.text('Choose what this is about'), findsNothing);
      expect(find.text('Add a short subject'), findsNothing);
      expect(
        find.text('Tell us a little more (at least 10 characters)'),
        findsOneWidget,
      );

      await _type(tester, _descriptionHint, '   short   ');
      expect(
        find.text('Tell us a little more (at least 10 characters)'),
        findsOneWidget,
      );
    });

    screenTest('the type sheet lists every type with its priority', (
      tester,
    ) async {
      await _pump(tester, _Desk(), const SupportMessageFormScreen());

      await _tap(tester, find.text('Select what this is about'));

      expect(
        find.text('This decides who picks it up and how urgently.'),
        findsOneWidget,
      );
      for (final type in SupportTicketType.values) {
        expect(find.text(type.label), findsWidgets, reason: type.name);
        expect(find.text(type.hint), findsOneWidget, reason: type.name);
      }

      await _tap(tester, find.text('Event').last);
      expect(
        find.text('Filed as Support · Medium priority — help requests'),
        findsOneWidget,
      );
    });

    screenTest('picking Bug points to the bug form', (tester) async {
      await _pump(tester, _Desk(), const SupportMessageFormScreen());

      await _pickType(tester, SupportTicketType.bug);

      expect(find.text('Reporting a bug?'), findsOneWidget);
      await _tap(tester, find.text('Use it'));
      expect(find.byType(ReportBugScreen), findsOneWidget);
      expect(find.byType(SupportMessageFormScreen), findsNothing);
    });

    screenTest('a valid message is filed and confirmed', (tester) async {
      final desk = _Desk();
      await _pump(tester, desk, const SupportMessageFormScreen());

      await _pickType(tester, SupportTicketType.account);
      await _type(tester, _subjectHint, '  Receipt missing  ');
      await _type(
        tester,
        _descriptionHint,
        '  I donated ₱500 on March 9 and got no receipt.  ',
      );
      await _tap(tester, _button('Submit Request'));

      expect(_bodyOf(desk.where('POST', _mine).single), {
        'subject': 'Receipt missing',
        'description': 'I donated ₱500 on March 9 and got no receipt.',
        'type': 'ACCOUNT',
      });
      expect(find.byType(SupportRequestSubmittedScreen), findsOneWidget);
      expect(find.text('Request submitted'), findsOneWidget);
      expect(find.text('Support #040'), findsOneWidget);
      expect(find.text('Receipt missing'), findsOneWidget);
      expect(find.text('Account'), findsOneWidget);
      expect(
        find.text('Support · Medium priority — help requests'),
        findsOneWidget,
      );
      expect(find.text('Open'), findsOneWidget);
    });

    screenTest('a refusal shows the server message and keeps the form', (
      tester,
    ) async {
      final desk = _Desk()
        ..overrides['POST $_mine'] = (_) async =>
            _fail(422, 'Subject must be under 120 characters.');
      await _pump(tester, desk, const SupportMessageFormScreen());
      await _pickType(tester, SupportTicketType.other);
      await _type(tester, _subjectHint, 'Hello');
      await _type(tester, _descriptionHint, 'A long enough description.');

      await _tap(tester, _button('Submit Request'));

      expect(
        find.text('Subject must be under 120 characters.'),
        findsOneWidget,
      );
      expect(find.byType(SupportMessageFormScreen), findsOneWidget);
      expect(
        tester.widget<ButtonStyleButton>(_button('Submit Request')).onPressed,
        isNotNull,
      );
    });

    screenTest('an unreadable reply gets the generic message', (tester) async {
      final desk = _Desk()
        ..overrides['POST $_mine'] = (_) async => _ok({'unexpected': true});
      await _pump(tester, desk, const SupportMessageFormScreen());
      await _pickType(tester, SupportTicketType.other);
      await _type(tester, _subjectHint, 'Hello');
      await _type(tester, _descriptionHint, 'A long enough description.');

      await _tap(tester, _button('Submit Request'));

      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
    });

    screenTest('"Suggest a Feature" is preset and worded for ideas', (
      tester,
    ) async {
      final desk = _Desk();
      await _pump(
        tester,
        desk,
        const SupportMessageFormScreen(
          initialType: SupportTicketType.featureRequest,
        ),
      );

      expect(find.text('Suggest a Feature'), findsOneWidget);
      expect(find.text('Your idea'), findsOneWidget);
      expect(find.text('Feature Request'), findsOneWidget);
      await _type(tester, 'e.g. Dark mode for night briefings', 'Dark mode');
      await _type(
        tester,
        'What would it do, and when would you use it?',
        'A dark theme for evening events.',
      );
      await _tap(tester, _button('Submit Request'));

      expect(
        _bodyOf(desk.where('POST', _mine).single)['type'],
        'FEATURE_REQUEST',
      );
      expect(
        find.text('Feature · Low priority — improvement ideas'),
        findsOneWidget,
      );
    });
  });

  group('SupportRequestSubmittedScreen', () {
    screenTest('a bug confirmation reads differently', (tester) async {
      await _pump(
        tester,
        _Desk(),
        const SupportRequestSubmittedScreen(
          referenceId: 'Support #041',
          subject: '[Events] App closes',
          type: SupportTicketType.bug,
        ),
      );

      expect(find.text('Bug report filed'), findsOneWidget);
      expect(
        find.textContaining('Bugs go straight to the Issue queue'),
        findsOneWidget,
      );
      expect(
        find.text('Issue · High priority — broken or blocking'),
        findsOneWidget,
      );
    });

    screenTest('"View my support requests" opens the list', (tester) async {
      await _pump(
        tester,
        _Desk([_ticketJson()]),
        const SupportRequestSubmittedScreen(
          referenceId: 'Support #012',
          subject: 'Receipt missing',
          type: SupportTicketType.account,
        ),
      );

      await _tap(tester, _button('View my support requests'));

      expect(find.byType(MySupportRequestsScreen), findsOneWidget);
    });
  });

  // =========================================================================
  // My Support Requests
  // =========================================================================

  group('MySupportRequestsScreen', () {
    final mixed = [
      _ticketJson(id: 'a', reference: 1, subject: 'Login loop', status: 'OPEN'),
      _ticketJson(
        id: 'b',
        reference: 2,
        subject: 'Slots wrong',
        status: 'IN_PROGRESS',
      ),
      _ticketJson(
        id: 'c',
        reference: 3,
        subject: 'Map crash',
        status: 'UNDER_VERIFICATION',
      ),
      _ticketJson(
        id: 'd',
        reference: 4,
        subject: 'Need receipt',
        status: 'CLIENT_FEEDBACK',
      ),
      _ticketJson(
        id: 'e',
        reference: 5,
        subject: 'Old issue',
        status: 'RESOLVED',
      ),
    ];

    screenTest('shows the summary and every request', (tester) async {
      await _pump(tester, _Desk(mixed), const MySupportRequestsScreen());

      expect(find.text('My Support Requests'), findsOneWidget);
      for (final (label, value) in [
        ('Total', '5'),
        ('Open', '4'),
        ('On you', '2'),
        ('Resolved', '1'),
      ]) {
        final cell = find.ancestor(
          of: find.text(label).first,
          matching: find.byType(Column),
        );
        expect(
          find.descendant(of: cell.first, matching: find.text(value)),
          findsOneWidget,
          reason: label,
        );
      }
      expect(find.text('Waiting on you · 2'), findsOneWidget);
      expect(find.byType(SupportRequestTile), findsNWidgets(5));
      expect(find.text('Support #001'), findsOneWidget);
    });

    screenTest('the filter chips narrow the list', (tester) async {
      await _pump(tester, _Desk(mixed), const MySupportRequestsScreen());

      await _tap(tester, find.text('Waiting on you · 2'));
      expect(find.text('Map crash'), findsOneWidget);
      expect(find.text('Need receipt'), findsOneWidget);
      expect(find.byType(SupportRequestTile), findsNWidgets(2));

      await _tap(tester, find.text('In progress'));
      expect(find.text('Login loop'), findsOneWidget);
      expect(find.text('Slots wrong'), findsOneWidget);
      expect(find.byType(SupportRequestTile), findsNWidgets(2));

      await _tap(tester, find.text('Resolved').last);
      expect(find.text('Old issue'), findsOneWidget);
      expect(find.byType(SupportRequestTile), findsOneWidget);
    });

    screenTest('an empty filter offers to show everything', (tester) async {
      await _pump(
        tester,
        _Desk([_ticketJson(status: 'OPEN')]),
        const MySupportRequestsScreen(
          initialFilter: SupportRequestFilter.closed,
        ),
      );

      expect(find.text('No resolved requests yet'), findsOneWidget);
      await _tap(tester, find.text('Show all requests'));
      expect(find.byType(SupportRequestTile), findsOneWidget);
    });

    screenTest(
      '"Waiting on you" without any reads "Nothing is waiting on you"',
      (tester) async {
        await _pump(
          tester,
          _Desk([_ticketJson(status: 'OPEN')]),
          const MySupportRequestsScreen(
            initialFilter: SupportRequestFilter.needsAction,
          ),
        );

        expect(find.text('Nothing is waiting on you'), findsOneWidget);
        expect(find.text('Waiting on you'), findsOneWidget); // no count
      },
    );

    screenTest('no requests at all shows the empty state', (tester) async {
      await _pump(tester, _Desk(), const MySupportRequestsScreen());

      expect(find.text('No support requests yet'), findsOneWidget);
      await _tap(tester, _button('Send Us a Message'));
      expect(find.byType(SupportMessageFormScreen), findsOneWidget);
    });

    screenTest('the empty state also offers the bug form', (tester) async {
      await _pump(tester, _Desk(), const MySupportRequestsScreen());

      await _tap(tester, _button('Report a Bug'));

      expect(find.byType(ReportBugScreen), findsOneWidget);
    });

    screenTest('a failed load crashes the list instead of showing the error '
        'state', (tester) async {
      final desk = _Desk([_ticketJson()])
        ..overrides['GET $_mine'] = (_) async => _fail(503, 'Desk offline.');
      await _pump(tester, desk, const MySupportRequestsScreen());

      // The screen reads `async.value` before switching on the state, and
      // Riverpod's AsyncValue.value rethrows the error when there is no
      // earlier value — so the build throws and the "Couldn't load your
      // requests" / Try again state below it is never reached.
      expect(
        tester.takeException(),
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Desk offline.',
        ),
      );
      expect(find.text("Couldn't load your requests"), findsNothing);
      expect(find.text('Try again'), findsNothing);
    });

    screenTest('"New request" opens the message form', (tester) async {
      await _pump(
        tester,
        _Desk([_ticketJson()]),
        const MySupportRequestsScreen(),
      );

      await _tap(tester, find.byTooltip('New request'));

      expect(find.byType(SupportMessageFormScreen), findsOneWidget);
    });

    screenTest('a tile opens its detail', (tester) async {
      await _pump(tester, _Desk(mixed), const MySupportRequestsScreen());

      await _tap(tester, find.text('Map crash'));

      expect(find.byType(SupportRequestDetailScreen), findsOneWidget);
      expect(find.text('Support #003'), findsOneWidget);
    });
  });

  // =========================================================================
  // Request detail
  // =========================================================================

  group('SupportRequestDetailScreen', () {
    Future<_Desk> openDetail(
      WidgetTester tester,
      Map<String, dynamic> ticket,
    ) async {
      final desk = _Desk([ticket]);
      await _pump(
        tester,
        desk,
        SupportRequestDetailScreen(request: _request(ticket)),
      );
      return desk;
    }

    screenTest('shows the ticket, its status and the conversation', (
      tester,
    ) async {
      await openDetail(
        tester,
        _ticketJson(
          status: 'CLIENT_FEEDBACK',
          assignee: 'Ana Cruz',
          replies: [
            _reply(),
            _reply(
              author: 'Rosa Reyes',
              type: 'REQUESTER',
              body: 'It is DN-0007.',
            ),
          ],
        ),
      );

      expect(find.text('Support #012'), findsOneWidget);
      expect(find.text('Donation receipt not received'), findsOneWidget);
      expect(find.text('Needs Your Reply'), findsWidgets);
      expect(
        find.text('We need more information from you before we can continue.'),
        findsOneWidget,
      );
      expect(find.text('Handled by Ana Cruz'), findsOneWidget);
      expect(
        find.text(
          'Submitted ${formatSupportDate(DateTime.utc(2031, 3, 10, 4))}',
        ),
        findsOneWidget,
      );
      expect(find.text('Your report'), findsOneWidget);
      expect(
        find.text('I donated ₱500 on March 9 but never got a receipt.'),
        findsOneWidget,
      );
      expect(find.byType(SupportMessageBubble), findsNWidgets(2));
      expect(find.text('Ana Cruz'), findsOneWidget);
      expect(find.text('You'), findsOneWidget);
      expect(find.text('It is DN-0007.'), findsOneWidget);
    });

    screenTest('an unassigned ticket with no replies says so', (tester) async {
      await openDetail(tester, _ticketJson());

      expect(find.text('Not yet assigned'), findsOneWidget);
      expect(
        find.text('No replies yet — we will post here once it is picked up.'),
        findsOneWidget,
      );
      expect(_button('Add a reply'), findsOneWidget);
    });

    screenTest('a staff reply without a name reads "CARES Support"', (
      tester,
    ) async {
      final ticket = _ticketJson(replies: [_reply()]);
      final request = _request(ticket);
      final unnamed = SupportRequest(
        id: request.id,
        referenceNumber: request.referenceNumber,
        subject: request.subject,
        description: request.description,
        type: request.type,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        conversation: [
          SupportMessage(
            author: SupportAuthor.agent,
            body: 'On it.',
            sentAt: DateTime(2031, 3, 11),
          ),
        ],
      );
      await _pump(
        tester,
        _Desk(),
        SupportRequestDetailScreen(request: unnamed),
      );

      expect(find.text('CARES Support'), findsOneWidget);
    });

    screenTest('"Yes, it\'s fixed" confirms and the ticket resolves', (
      tester,
    ) async {
      final desk = await openDetail(
        tester,
        _ticketJson(status: 'UNDER_VERIFICATION'),
      );

      expect(find.text("Yes, it's fixed"), findsOneWidget);
      await _tap(tester, _button("Yes, it's fixed"));

      expect(_bodyOf(desk.where('POST', '$_mine/t-1/confirm-fix').single), {
        'fixed': true,
      });
      expect(find.text('This request is resolved.'), findsOneWidget);
      expect(find.text('Reopen'), findsOneWidget);
    });

    screenTest('"Still not working" sends what is still wrong', (tester) async {
      final desk = await openDetail(
        tester,
        _ticketJson(status: 'UNDER_VERIFICATION'),
      );

      await _tap(tester, _button('Still not working'));
      expect(_field('What is still going wrong?'), findsOneWidget);
      expect(
        tester.widget<ButtonStyleButton>(_button('Send')).onPressed,
        isNull,
      );

      await _type(
        tester,
        'What is still going wrong?',
        '  The map still crashes.  ',
      );
      await _tap(tester, _button('Send'));

      expect(_bodyOf(desk.where('POST', '$_mine/t-1/confirm-fix').single), {
        'fixed': false,
        'body': 'The map still crashes.',
      });
      expect(find.text('In Progress'), findsWidgets);
      expect(find.text('The map still crashes.'), findsOneWidget);
    });

    screenTest('closing the composer sends nothing', (tester) async {
      final desk = await openDetail(
        tester,
        _ticketJson(status: 'UNDER_VERIFICATION'),
      );

      await _tap(tester, _button('Still not working'));
      await tester.tapAt(const Offset(10, 10)); // outside the sheet
      await tester.pumpAndSettle();

      expect(desk.where('POST', '$_mine/t-1/confirm-fix'), isEmpty);
    });

    screenTest('"Reply to support" answers a question', (tester) async {
      final desk = await openDetail(
        tester,
        _ticketJson(status: 'CLIENT_FEEDBACK', replies: [_reply()]),
      );

      await _tap(tester, _button('Reply to support'));
      await _type(tester, 'Answer what the team asked for', 'It is DN-0007.');
      await _tap(tester, _button('Send'));

      expect(_bodyOf(desk.where('POST', '$_mine/t-1/replies').single), {
        'body': 'It is DN-0007.',
      });
      expect(find.text('It is DN-0007.'), findsOneWidget);
      expect(_button('Add a reply'), findsOneWidget); // now in progress
    });

    screenTest('an open ticket takes more detail', (tester) async {
      final desk = await openDetail(tester, _ticketJson());

      await _tap(tester, _button('Add a reply'));
      expect(find.text('Add a reply'), findsWidgets);
      await _type(
        tester,
        'Add more detail for the team',
        'Screenshot attached.',
      );
      await _tap(tester, _button('Send'));

      expect(desk.where('POST', '$_mine/t-1/replies'), hasLength(1));
    });

    screenTest('a resolved ticket can be reopened with a reason', (
      tester,
    ) async {
      final desk = await openDetail(tester, _ticketJson(status: 'RESOLVED'));

      expect(find.text('This request is resolved.'), findsOneWidget);
      await _tap(tester, find.text('Reopen'));
      expect(find.text('Reopen request'), findsOneWidget);
      await _type(
        tester,
        'Tell us why this needs another look',
        'It came back.',
      );
      await _tap(tester, _button('Send'));

      expect(_bodyOf(desk.where('POST', '$_mine/t-1/reopen').single), {
        'body': 'It came back.',
      });
      expect(
        find.text('Received. Our team has not picked this up yet.'),
        findsOneWidget,
      );
    });

    screenTest('a closed ticket says it is closed', (tester) async {
      await openDetail(tester, _ticketJson(status: 'CLOSED'));

      expect(find.text('This request is closed.'), findsOneWidget);
      expect(find.text('Finished — no further action needed.'), findsOneWidget);
    });

    screenTest('a refused action shows why', (tester) async {
      final desk = _Desk([_ticketJson(status: 'UNDER_VERIFICATION')])
        ..overrides['POST $_mine/t-1/confirm-fix'] = (_) async =>
            _fail(409, 'This request was already closed by support.');
      await _pump(
        tester,
        desk,
        SupportRequestDetailScreen(
          request: _request(_ticketJson(status: 'UNDER_VERIFICATION')),
        ),
      );

      await _tap(tester, _button("Yes, it's fixed"));

      expect(
        find.text('This request was already closed by support.'),
        findsOneWidget,
      );
      expect(
        tester.widget<ButtonStyleButton>(_button("Yes, it's fixed")).onPressed,
        isNotNull,
      );
    });
  });

  // =========================================================================
  // Report a Bug
  // =========================================================================

  group('ReportBugScreen', () {
    const titleHint = 'e.g. App closes when opening the Events tab';
    const happenedHint =
        'What did you expect, and what did you see instead? Copy any error '
        'message you saw.';
    const stepsHint = '1. Open the app\n2. Tap Events\n3. App closes';

    screenTest('an empty submit shows every error and sends nothing', (
      tester,
    ) async {
      final desk = _Desk();
      await _pump(tester, desk, const ReportBugScreen());

      expect(find.text('Found something broken?'), findsOneWidget);
      expect(find.text(BugDeviceInfo.summary), findsOneWidget);
      await _tap(tester, _button('Submit Bug Report'));

      expect(find.text('Pick where it happened'), findsOneWidget);
      expect(find.text('Give the bug a short title'), findsOneWidget);
      expect(
        find.text('Describe what went wrong (at least 10 characters)'),
        findsOneWidget,
      );
      expect(desk.requests.where((r) => r.method == 'POST'), isEmpty);
    });

    screenTest('files a bug with the area in the subject and the details '
        'laid out', (tester) async {
      final desk = _Desk();
      await _pump(tester, desk, const ReportBugScreen());

      await _tap(tester, find.text('Events'));
      await _type(tester, titleHint, '  App closes  ');
      await _type(tester, happenedHint, ' The app closes when I open Events. ');
      await _type(tester, stepsHint, '1. Open the app\n2. Tap Events');
      await _tap(tester, find.text('Sometimes'));
      await _tap(tester, _button('Submit Bug Report'));

      final body = _bodyOf(desk.where('POST', _mine).single);
      expect(body['subject'], '[Events] App closes');
      expect(body['type'], 'BUG');
      expect(
        body['description'],
        'The app closes when I open Events.\n\n'
        'Steps to reproduce:\n1. Open the app\n2. Tap Events\n\n'
        'Happens: Sometimes\n\n'
        'Device: ${BugDeviceInfo.summary}',
      );
      expect(find.text('Bug report filed'), findsOneWidget);
      expect(find.text('[Events] App closes'), findsOneWidget);
    });

    screenTest('without steps or device details those sections are left out', (
      tester,
    ) async {
      final desk = _Desk();
      await _pump(tester, desk, const ReportBugScreen());

      await _tap(tester, find.text('Somewhere else'));
      await _type(tester, titleHint, 'Typo');
      await _type(tester, happenedHint, 'The word "volunter" is misspelled.');
      await _tap(tester, find.byType(Switch));
      await _tap(tester, _button('Submit Bug Report'));

      final body = _bodyOf(desk.where('POST', _mine).single);
      expect(body['subject'], '[Somewhere else] Typo');
      expect(
        body['description'],
        'The word "volunter" is misspelled.\n\nHappens: Every time',
      );
    });

    screenTest('shows "Sending…" while the report is on the wire', (
      tester,
    ) async {
      final desk = _Desk();
      final reply = Completer<http.Response>();
      desk.overrides['POST $_mine'] = (_) => reply.future;
      await _pump(tester, desk, const ReportBugScreen());
      await _tap(tester, find.text('Login'));
      await _type(tester, titleHint, 'OTP never arrives');
      await _type(tester, happenedHint, 'I waited ten minutes for the code.');

      await tester.tap(_button('Submit Bug Report'));
      await tester.pump();

      expect(find.text('Sending…'), findsOneWidget);
      expect(
        tester.widget<ButtonStyleButton>(_button('Sending…')).onPressed,
        isNull,
      );

      reply.complete(
        _ok(
          _ticketJson(
            id: 't-9',
            reference: 9,
            subject: '[Login] OTP never arrives',
            type: 'BUG',
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Bug report filed'), findsOneWidget);
    });

    screenTest('a refusal keeps the report', (tester) async {
      final desk = _Desk()
        ..overrides['POST $_mine'] = (_) async =>
            _fail(503, 'Try again later.');
      await _pump(tester, desk, const ReportBugScreen());
      await _tap(tester, find.text('Profile'));
      await _type(tester, titleHint, 'Photo will not upload');
      await _type(tester, happenedHint, 'The upload spinner never stops.');

      await _tap(tester, _button('Submit Bug Report'));

      expect(find.text('Try again later.'), findsOneWidget);
      expect(find.byType(ReportBugScreen), findsOneWidget);
      expect(
        tester.widget<TextField>(_field(titleHint)).controller!.text,
        'Photo will not upload',
      );
    });
  });

  // =========================================================================
  // Report a Problem
  // =========================================================================

  group('ReportProblemScreen and ReportFormScreen', () {
    screenTest('lists every reason with its hint', (tester) async {
      await _pump(tester, _Desk(), const ReportProblemScreen());

      expect(find.text('See something wrong?'), findsOneWidget);
      for (final reason in ReportReason.values) {
        expect(find.text(reason.label), findsOneWidget, reason: reason.name);
        expect(find.text(reason.hint), findsOneWidget, reason: reason.name);
      }

      await _tap(tester, find.text('Report a user'));

      expect(find.byType(ReportFormScreen), findsOneWidget);
      expect(find.text('Report a user'), findsOneWidget); // preset in dropdown
      expect(_field(ReportReason.user.hint), findsOneWidget);
    });

    screenTest('needs at least 10 characters of detail', (tester) async {
      final desk = _Desk();
      await _pump(
        tester,
        desk,
        const ReportFormScreen(reason: ReportReason.event),
      );

      await _type(tester, ReportReason.event.hint, 'fake');
      await _tap(tester, _button('Submit Report'));

      expect(
        find.text('Please add a few details so we can investigate'),
        findsOneWidget,
      );
      expect(desk.requests.where((r) => r.method == 'POST'), isEmpty);
    });

    screenTest('files a report ticket with the reason as the subject', (
      tester,
    ) async {
      final desk = _Desk();
      await _pump(
        tester,
        desk,
        const ReportFormScreen(reason: ReportReason.event),
      );

      // Change the reason in the dropdown.
      await _tap(tester, find.text('Report an event'));
      await _tap(tester, find.text('Report suspicious activity').last);
      expect(_field(ReportReason.suspiciousActivity.hint), findsOneWidget);

      await _type(
        tester,
        ReportReason.suspiciousActivity.hint,
        '  Someone is asking volunteers for GCash payments.  ',
      );
      await _tap(tester, _button('Submit Report'));

      expect(_bodyOf(desk.where('POST', _mine).single), {
        'subject': 'Report suspicious activity',
        'description': 'Someone is asking volunteers for GCash payments.',
        'type': 'REPORT',
      });
      expect(find.byType(ReportSubmittedScreen), findsOneWidget);
      expect(find.text('Report received'), findsOneWidget);
      expect(find.textContaining('Track it as Support #040'), findsOneWidget);
    });

    screenTest('a refused report shows why', (tester) async {
      final desk = _Desk()
        ..overrides['POST $_mine'] = (_) async =>
            _fail(422, 'Details are too long.');
      await _pump(
        tester,
        desk,
        const ReportFormScreen(reason: ReportReason.user),
      );
      await _type(
        tester,
        ReportReason.user.hint,
        'User @spam keeps messaging.',
      );

      await _tap(tester, _button('Submit Report'));

      expect(find.text('Details are too long.'), findsOneWidget);
      expect(find.byType(ReportFormScreen), findsOneWidget);
    });

    screenTest('the confirmation links to My Support Requests', (tester) async {
      await _pump(
        tester,
        _Desk([_ticketJson(type: 'REPORT')]),
        const ReportSubmittedScreen(referenceId: 'Support #040'),
      );

      await _tap(tester, _button('View My Support Requests'));

      expect(find.byType(MySupportRequestsScreen), findsOneWidget);
    });
  });
}
