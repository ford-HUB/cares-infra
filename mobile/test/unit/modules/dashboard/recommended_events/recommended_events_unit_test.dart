// Unit tests for recommended events — the interest-matched feed on the
// volunteer home tab, and the sibling feeds that share its row shape:
//
//   GET /v1/events/recommended?limit=N     RecommendedEventsService.fetch
//   GET /v1/events/beneficiary             .fetchForBeneficiaries
//   GET /v1/events/beneficiary/completed   .fetchCompletedForBeneficiaries
//   GET /v1/events/registered              .fetchRegistered
//   RecommendedEvent / MatchedInterest / RecommendedEventsPage   parsing
//   recommendedEventsProvider              what the home tab watches
//   RecommendedEventsSection               loading / error / no interests /
//                                          empty / list states
//   RecommendedEventTile                   one row: title, organizer,
//                                          schedule, match %, slots
//
// Every event is a local fixture and the network is replaced with
// package:http's MockClient, so nothing reaches a real server.
//
// The feed rows here are all unregistered on purpose: a registered row makes
// the provider write to the registration store, which mirrors to SQLite and
// schedules device reminders — platform plugins a unit test can't run.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/data/recommended_events_service.dart';
import 'package:mobile/features/dashboard/domain/event_participation_role.dart';
import 'package:mobile/features/dashboard/presentation/providers/recommended_events_provider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/recommended_event_tile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/recommended_events_section.dart';

const _origin = 'http://api.test';

const _recommendedPath = '/v1/events/recommended';
const _beneficiaryPath = '/v1/events/beneficiary';
const _beneficiaryDonePath = '/v1/events/beneficiary/completed';
const _registeredPath = '/v1/events/registered';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/// One `GET /events/recommended` row, as the server sends it.
Map<String, dynamic> _row({
  int id = 42,
  String title = 'Coastal Clean-up Drive',
  String organizer = 'UCLM CARES Office',
  String location = 'Looc Seawall, Mandaue City',
  DateTime? startsAt,
  int maxParticipants = 50,
  int participants = 38,
  bool isRegistered = false,
  double matchScore = 0.82,
  int imageCount = 0,
}) {
  final start = startsAt ?? DateTime(2031, 3, 14, 13, 30);
  return {
    'event_id': id,
    'title': title,
    'description': 'Help clear the shoreline of plastic waste.',
    'event_started': start.toUtc().toIso8601String(),
    'event_ended': start
        .add(const Duration(hours: 4))
        .toUtc()
        .toIso8601String(),
    'location': location,
    'max_participants': maxParticipants,
    'participants': participants,
    'is_registered': isRegistered,
    'organizer_name': organizer,
    'category': 'Environment',
    'status': 'Upcoming',
    'beneficiary_applicable': false,
    'image_count': imageCount,
    'matched_interests': [
      {'code': 'ENV', 'label': 'Environment', 'score': 0.91},
      {'code': 'OUT', 'label': 'Outdoor', 'score': 0.64},
    ],
    'match_score': matchScore,
  };
}

Map<String, dynamic> _page({
  bool hasInterests = true,
  List<Map<String, dynamic>>? events,
}) => {'has_interests': hasInterests, 'events': events ?? [_row()]};

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

class _Recorder {
  _Recorder(this.reply);

  Future<http.Response> Function(http.Request request) reply;
  final List<http.Request> requests = [];

  http.Request get last => requests.last;

  int callsTo(String path) =>
      requests.where((r) => r.url.path == path).length;

  RecommendedEventsService service() => RecommendedEventsService(
    apiClient: ApiClient(
      client: MockClient((request) async {
        requests.add(request);
        return reply(request);
      }),
    ),
  );
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

// ---------------------------------------------------------------------------
// Widget harness
// ---------------------------------------------------------------------------

Future<void> _pumpSection(
  WidgetTester tester,
  _Recorder rec, {
  int maxItems = 5,
  VoidCallback? onSeeAll,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        recommendedEventsServiceProvider.overrideWithValue(rec.service()),
      ],
      child: MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: RecommendedEventsSection(
              maxItems: maxItems,
              onSeeAll: onSeeAll,
            ),
          ),
        ),
      ),
    ),
  );
}

/// Lets the mount-time refetch and the mock network finish. The skeleton
/// shimmer never goes idle, so `pumpAndSettle` is only safe once data is in.
Future<void> _load(WidgetTester tester) async {
  await tester.pump();
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

Future<void> _pumpTile(
  WidgetTester tester,
  RecommendedEvent event, {
  VoidCallback? onTap,
}) => tester.pumpWidget(
  MaterialApp(
    home: Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: RecommendedEventTile(event: event, onTap: onTap ?? () {}),
      ),
    ),
  ),
);

RecommendedEvent _event([Map<String, dynamic>? row]) =>
    RecommendedEvent.fromJson(row ?? _row());

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

  // -------------------------------------------------------------------------
  // Service
  // -------------------------------------------------------------------------

  group('GET /events/recommended', () {
    test('asks for the default 10 with the volunteer’s token', () async {
      AuthSession.setAccessToken('jwt.volunteer');
      final rec = _Recorder((_) async => _ok(_page()));

      await rec.service().fetch();

      expect(rec.requests, hasLength(1));
      expect(rec.last.method, 'GET');
      expect(rec.last.url.toString(), '$_origin$_recommendedPath?limit=10');
      expect(rec.last.headers['Authorization'], 'Bearer jwt.volunteer');
      expect(RecommendedEventsService.defaultLimit, 10);
    });

    test('passes a custom limit through', () async {
      final rec = _Recorder((_) async => _ok(_page()));

      await rec.service().fetch(limit: RecommendedEventsService.maxLimit);

      expect(rec.last.url.queryParameters, {'limit': '50'});
    });

    test('parses the page and keeps the server’s best-first order', () async {
      final rec = _Recorder(
        (_) async => _ok(
          _page(
            events: [
              _row(id: 1, title: 'Tree Planting', matchScore: 0.93),
              _row(id: 2, title: 'Reading Camp', matchScore: 0.71),
            ],
          ),
        ),
      );

      final page = await rec.service().fetch();

      expect(page.hasInterests, isTrue);
      expect(page.events.map((e) => e.title), ['Tree Planting', 'Reading Camp']);
      expect(page.events.first.matchScore, closeTo(0.93, 1e-9));
    });

    test('a volunteer with no interests gets an empty, flagged page',
        () async {
      final rec = _Recorder(
        (_) async => _ok({'has_interests': false, 'events': []}),
      );

      final page = await rec.service().fetch();

      expect(page.hasInterests, isFalse);
      expect(page.events, isEmpty);
    });

    test('a failure throws the server message', () async {
      final rec = _Recorder(
        (_) async => _fail(503, 'Recommendations are unavailable right now'),
      );

      await expectLater(
        rec.service().fetch(),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 503)
              .having(
                (e) => e.message,
                'message',
                'Recommendations are unavailable right now',
              ),
        ),
      );
    });
  });

  group('sibling feeds sharing the recommended row shape', () {
    final feeds = <String, Future<List<RecommendedEvent>> Function(
      RecommendedEventsService service,
    )>{
      _beneficiaryPath: (s) => s.fetchForBeneficiaries(),
      _beneficiaryDonePath: (s) => s.fetchCompletedForBeneficiaries(),
      _registeredPath: (s) => s.fetchRegistered(),
    };

    for (final entry in feeds.entries) {
      test('${entry.key} parses its events', () async {
        final rec = _Recorder(
          (_) async => _ok({
            'events': [_row(id: 7), _row(id: 8)],
          }),
        );

        final events = await entry.value(rec.service());

        expect(rec.last.method, 'GET');
        expect(rec.last.url.toString(), '$_origin${entry.key}');
        expect(events.map((e) => e.id), [7, 8]);
      });

      test('${entry.key} with no events list is an empty list', () async {
        final rec = _Recorder((_) async => _ok({}));

        expect(await entry.value(rec.service()), isEmpty);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Models
  // -------------------------------------------------------------------------

  group('RecommendedEvent parsing', () {
    test('reads the row and converts the UTC times to local', () {
      final event = _event();

      expect(event.id, 42);
      expect(event.caresEventId, 'event-42');
      expect(event.title, 'Coastal Clean-up Drive');
      expect(event.organizerName, 'UCLM CARES Office');
      expect(event.category, 'Environment');
      expect(event.startsAt, DateTime(2031, 3, 14, 13, 30));
      expect(event.endsAt, DateTime(2031, 3, 14, 17, 30));
      expect(event.isRegistered, isFalse);
      expect(event.matchScore, closeTo(0.82, 1e-9));
    });

    test('keeps the matched interests in the server’s order', () {
      final interests = _event().matchedInterests;

      expect(interests.map((m) => m.code), ['ENV', 'OUT']);
      expect(interests.first.label, 'Environment');
      expect(interests.first.score, closeTo(0.91, 1e-9));
    });

    test('a matched interest without a label or score falls back', () {
      final interest = MatchedInterest.fromJson({'code': 'HEALTH'});

      expect(interest.label, 'HEALTH');
      expect(interest.score, 0);
    });

    test('optional fields default instead of failing the row', () {
      final event = RecommendedEvent.fromJson({
        'event_id': 9,
        'title': 'Blood Letting',
        'event_started': '2031-05-01T00:00:00Z',
        'event_ended': '2031-05-01T04:00:00Z',
      });

      expect(event.description, '');
      expect(event.location, '');
      expect(event.organizerName, '');
      expect(event.category, '');
      expect(event.status, 'Upcoming');
      expect(event.maxParticipants, 0);
      expect(event.participants, 0);
      expect(event.isRegistered, isFalse);
      expect(event.beneficiaryApplicable, isFalse);
      expect(event.fundsDonation, isFalse);
      expect(event.goodsDonation, isFalse);
      expect(event.goodsTypes, isEmpty);
      expect(event.fundsRaised, 0);
      expect(event.donationsCount, 0);
      expect(event.participationRole, isNull);
      expect(event.roleApproval, isNull);
      expect(event.geofence, isNull);
      expect(event.imageCount, 0);
      expect(event.matchedInterests, isEmpty);
      expect(event.matchScore, 0);
    });

    test('reads the volunteer’s registration and the donation panel', () {
      final event = RecommendedEvent.fromJson({
        ..._row(isRegistered: true),
        'participation_role': 'ORGANIZER',
        'role_approval': 'APPROVED',
        'attendance_status': 'PENDING',
        'funds_donation': true,
        'goods_donation': true,
        'goods_types': ['canned_goods', 'clothes'],
        'funds_raised': 12500.0,
        'donations_count': 14,
      });

      expect(event.isRegistered, isTrue);
      expect(event.participationRole, EventParticipationRole.organizer);
      expect(event.roleApproval, EventRoleApproval.approved);
      expect(event.attendanceStatus, 'PENDING');
      expect(event.fundsDonation, isTrue);
      expect(event.goodsTypes, ['canned_goods', 'clothes']);
      expect(event.fundsRaised, 12500);
      expect(event.donationsCount, 14);
    });

    test('slots left never goes negative', () {
      expect(_event(_row(maxParticipants: 50, participants: 38)).slotsLeft, 12);
      expect(_event(_row(maxParticipants: 50, participants: 60)).slotsLeft, 0);
      expect(_event(_row(maxParticipants: 0, participants: 0)).slotsLeft, 0);
    });

    test('a row missing its id is rejected, not silently defaulted', () {
      expect(
        () => RecommendedEvent.fromJson({
          'title': 'No id',
          'event_started': '2031-05-01T00:00:00Z',
          'event_ended': '2031-05-01T04:00:00Z',
        }),
        throwsA(isA<TypeError>()),
      );
    });

    test('an empty page payload reads as no interests and no events', () {
      final page = RecommendedEventsPage.fromJson({});

      expect(page.hasInterests, isFalse);
      expect(page.events, isEmpty);
    });
  });

  // -------------------------------------------------------------------------
  // Provider
  // -------------------------------------------------------------------------

  group('recommendedEventsProvider', () {
    ProviderContainer containerFor(_Recorder rec) {
      final container = ProviderContainer(
        overrides: [
          recommendedEventsServiceProvider.overrideWithValue(rec.service()),
        ],
      );
      addTearDown(container.dispose);
      return container;
    }

    test('loads the page through the overridden service', () async {
      final rec = _Recorder((_) async => _ok(_page()));
      final container = containerFor(rec);

      final sub = container.listen(recommendedEventsProvider, (_, _) {});
      addTearDown(sub.close);
      final page = await container.read(recommendedEventsProvider.future);

      expect(page.events.single.title, 'Coastal Clean-up Drive');
      expect(rec.callsTo(_recommendedPath), 1);
    });

    test('unregistered rows leave the registration store untouched',
        () async {
      final rec = _Recorder(
        (_) async => _ok(_page(events: [_row(id: 501), _row(id: 502)])),
      );
      final container = containerFor(rec);

      final sub = container.listen(recommendedEventsProvider, (_, _) {});
      addTearDown(sub.close);
      await container.read(recommendedEventsProvider.future);

      final store = EventRegistrationStore.instance;
      expect(store.participationsForEvent('event-501'), isEmpty);
      expect(store.participationsForEvent('event-502'), isEmpty);
    });

    test('invalidating it asks the server again', () async {
      final rec = _Recorder((_) async => _ok(_page()));
      final container = containerFor(rec);

      final sub = container.listen(recommendedEventsProvider, (_, _) {});
      addTearDown(sub.close);
      await container.read(recommendedEventsProvider.future);

      container.invalidate(recommendedEventsProvider);
      await container.read(recommendedEventsProvider.future);

      expect(rec.callsTo(_recommendedPath), 2);
    });

    test('a server failure surfaces as the provider’s error', () async {
      final rec = _Recorder((_) async => _fail(500, 'Something went wrong'));
      final container = containerFor(rec);

      final sub = container.listen(recommendedEventsProvider, (_, _) {});
      addTearDown(sub.close);

      await expectLater(
        container.read(recommendedEventsProvider.future),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'Something went wrong',
          ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Home-tab section
  // -------------------------------------------------------------------------

  group('RecommendedEventsSection', () {
    testWidgets('shows the header and a skeleton while loading',
        (tester) async {
      final pending = Completer<http.Response>();
      final rec = _Recorder((_) => pending.future);
      var seeAll = 0;
      await _pumpSection(tester, rec, onSeeAll: () => seeAll++);
      await tester.pump();

      expect(find.text('Recommended Events'), findsOneWidget);
      expect(find.byType(SkeletonLoader), findsOneWidget);
      expect(find.byType(RecommendedEventTile), findsNothing);

      await tester.tap(find.text('See all'));
      expect(seeAll, 1);

      pending.complete(_ok(_page()));
      await _load(tester);
    });

    testWidgets('lists the matched events once loaded', (tester) async {
      final rec = _Recorder(
        (_) async => _ok(
          _page(
            events: [
              _row(id: 1, title: 'Tree Planting'),
              _row(id: 2, title: 'Reading Camp'),
            ],
          ),
        ),
      );
      await _pumpSection(tester, rec);
      await _load(tester);

      expect(find.byType(SkeletonLoader), findsNothing);
      expect(find.byType(RecommendedEventTile), findsNWidgets(2));
      expect(find.text('Tree Planting'), findsOneWidget);
      expect(find.text('Reading Camp'), findsOneWidget);
    });

    testWidgets('shows only the best few on home', (tester) async {
      final rec = _Recorder(
        (_) async => _ok(
          _page(
            events: [
              for (var i = 1; i <= 8; i++) _row(id: i, title: 'Event $i'),
            ],
          ),
        ),
      );
      await _pumpSection(tester, rec, maxItems: 3);
      await _load(tester);

      expect(find.byType(RecommendedEventTile), findsNWidgets(3));
      expect(find.text('Event 1'), findsOneWidget);
      expect(find.text('Event 3'), findsOneWidget);
      expect(find.text('Event 4'), findsNothing);
    });

    testWidgets('defaults to five items', (tester) async {
      final rec = _Recorder(
        (_) async => _ok(
          _page(
            events: [
              for (var i = 1; i <= 8; i++) _row(id: i, title: 'Event $i'),
            ],
          ),
        ),
      );
      await _pumpSection(tester, rec);
      await _load(tester);

      expect(find.byType(RecommendedEventTile), findsNWidgets(5));
    });

    testWidgets('asks a volunteer without interests to choose some',
        (tester) async {
      final rec = _Recorder(
        (_) async => _ok({'has_interests': false, 'events': []}),
      );
      await _pumpSection(tester, rec);
      await _load(tester);

      expect(find.text('Tell us what you care about'), findsOneWidget);
      expect(find.text('Choose interests'), findsOneWidget);
      expect(find.byType(RecommendedEventTile), findsNothing);
    });

    testWidgets('says so when nothing matches yet', (tester) async {
      final rec = _Recorder((_) async => _ok(_page(events: [])));
      await _pumpSection(tester, rec);
      await _load(tester);

      expect(
        find.text(
          'No open events match your interests yet. Check back soon or browse all events.',
        ),
        findsOneWidget,
      );
      expect(find.text('Choose interests'), findsNothing);
    });

    testWidgets('a server error shows its message and Retry refetches',
        (tester) async {
      final rec = _Recorder(
        (_) async => _fail(503, 'Recommendations are unavailable right now'),
      );
      await _pumpSection(tester, rec);
      await _load(tester);

      expect(
        find.text('Recommendations are unavailable right now'),
        findsOneWidget,
      );
      expect(find.text('Retry'), findsOneWidget);

      rec.reply = (_) async => _ok(_page());
      final before = rec.callsTo(_recommendedPath);
      await tester.tap(find.text('Retry'));
      await _load(tester);

      expect(rec.callsTo(_recommendedPath), before + 1);
      expect(find.text('Coastal Clean-up Drive'), findsOneWidget);
      expect(find.text('Retry'), findsNothing);
    });

    testWidgets('an unexpected failure shows the generic message',
        (tester) async {
      // A row with no id fails to parse — not an ApiException.
      final rec = _Recorder(
        (_) async => _ok({
          'has_interests': true,
          'events': [
            {'title': 'Broken row'},
          ],
        }),
      );
      await _pumpSection(tester, rec);
      await _load(tester);

      expect(
        find.text('Could not load recommendations right now.'),
        findsOneWidget,
      );
    });

    testWidgets('every mount asks the server for fresh data', (tester) async {
      final rec = _Recorder((_) async => _ok(_page()));
      await _pumpSection(tester, rec);
      await _load(tester);
      final firstMount = rec.callsTo(_recommendedPath);
      expect(firstMount, greaterThanOrEqualTo(1));

      // Unmount, then mount again (what a pull-to-refresh remount does).
      await tester.pumpWidget(const SizedBox());
      await _pumpSection(tester, rec);
      await _load(tester);

      expect(rec.callsTo(_recommendedPath), greaterThan(firstMount));
    });
  });

  // -------------------------------------------------------------------------
  // One row
  // -------------------------------------------------------------------------

  group('RecommendedEventTile', () {
    testWidgets('shows title, organizer, schedule, match and slots',
        (tester) async {
      await _pumpTile(tester, _event());

      expect(find.text('Coastal Clean-up Drive'), findsOneWidget);
      expect(find.text('UCLM CARES Office'), findsOneWidget);
      expect(find.text('March 14, 13:30'), findsOneWidget);
      expect(find.text('82% match'), findsOneWidget);
      expect(find.text('12 slots left'), findsOneWidget);
    });

    testWidgets('falls back to the venue when there is no organizer',
        (tester) async {
      await _pumpTile(tester, _event(_row(organizer: '')));

      expect(find.text('Looc Seawall, Mandaue City'), findsOneWidget);
    });

    testWidgets('pads the schedule to two-digit hours and minutes',
        (tester) async {
      await _pumpTile(
        tester,
        _event(_row(startsAt: DateTime(2031, 1, 5, 8, 5))),
      );

      expect(find.text('January 5, 08:05'), findsOneWidget);
    });

    testWidgets('rounds the match score and keeps it within 0–100%',
        (tester) async {
      await _pumpTile(tester, _event(_row(matchScore: 0.666)));
      expect(find.text('67% match'), findsOneWidget);

      await _pumpTile(tester, _event(_row(matchScore: 1.4)));
      expect(find.text('100% match'), findsOneWidget);

      await _pumpTile(tester, _event(_row(matchScore: -0.2)));
      expect(find.text('0% match'), findsOneWidget);
    });

    testWidgets('a full event shows 0 slots left', (tester) async {
      await _pumpTile(
        tester,
        _event(_row(maxParticipants: 20, participants: 25)),
      );

      expect(find.text('0 slots left'), findsOneWidget);
    });

    testWidgets('without images it draws the category placeholder',
        (tester) async {
      await _pumpTile(tester, _event(_row(imageCount: 0)));

      expect(find.byIcon(Icons.volunteer_activism_outlined), findsOneWidget);
      expect(find.byType(Image), findsNothing);
    });

    testWidgets('with images it loads the first one from the API',
        (tester) async {
      await _pumpTile(tester, _event(_row(imageCount: 3)));

      final image = tester.widget<Image>(find.byType(Image));
      final provider = image.image as NetworkImage;
      expect(provider.url, '$_origin/v1/events/42/images/0');
    });

    testWidgets('tapping the row calls onTap', (tester) async {
      var taps = 0;
      await _pumpTile(tester, _event(), onTap: () => taps++);

      await tester.tap(find.text('Coastal Clean-up Drive'));
      expect(taps, 1);
    });
  });
}
