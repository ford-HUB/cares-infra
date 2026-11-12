// Unit tests for the event details screen (EventDetailsScreen) — everything it
// reads, derives and sends, minus the screen shell itself:
//
//   CaresEvent                     labels, start/end time, phase, slots, flags
//   RecommendedEvent.toCaresEvent  how a server row becomes the details model
//   EventParticipationRole         the "Participation Role" dropdown values
//   POST   /v1/events/:id/register EventRegistrationService.register  (Join)
//   DELETE /v1/events/:id/register EventRegistrationService.cancel    (Cancel)
//   event_details_widgets.dart     info card, register bar, members row,
//                                  organizer row, action card, banners
//
// Every event here is a local fixture and the network is replaced with
// package:http's MockClient, so nothing reaches a real server.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/dashboard/data/event_registration_service.dart';
import 'package:mobile/features/dashboard/data/event_reminder_store.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';
import 'package:mobile/features/dashboard/domain/event_participation_role.dart';
import 'package:mobile/features/dashboard/utils/geo_utils.dart';
import 'package:mobile/features/dashboard/widgets/event_details_widgets.dart';

const _origin = 'http://api.test';

// UCLM main campus, Mandaue — the venue every fixture sits at.
const _venueLat = 10.3297;
const _venueLng = 123.9496;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

CaresEvent _event({
  String id = 'event-42',
  String title = 'Coastal Clean-up Drive',
  String organization = 'UCLM CARES Office',
  DateTime? date,
  String time = '8:00 AM',
  String location = 'Looc Seawall, Mandaue City',
  String description = 'Help clear the shoreline of plastic waste.',
  int slotsLeft = 12,
  int daysUntil = 5,
  double capacityFilled = 0.76,
  String category = 'Environment',
  List<String> tags = const ['Outdoor', 'Climate'],
  int registeredCount = 38,
  int totalCapacity = 50,
  List<GeofenceRing>? geofence,
  double attendanceRadiusMeters = 500,
  bool isCompleted = false,
  int? hoursCompleted,
  DateTime? endDate,
  String? attendanceStatus,
  String? applicationStatus,
  String? applicationRejectionReason,
  EventParticipationRole? participationRole,
  EventRoleApproval? roleApproval,
}) => CaresEvent(
  id: id,
  title: title,
  organization: organization,
  date: date ?? DateTime(2031, 3, 14),
  time: time,
  location: location,
  description: description,
  slotsLeft: slotsLeft,
  daysUntil: daysUntil,
  capacityFilled: capacityFilled,
  category: category,
  tags: tags,
  registeredCount: registeredCount,
  totalCapacity: totalCapacity,
  requirements: const ['Bring gloves', 'Wear closed shoes'],
  venueLatitude: _venueLat,
  venueLongitude: _venueLng,
  attendanceRadiusMeters: attendanceRadiusMeters,
  geofence: geofence,
  isCompleted: isCompleted,
  hoursCompleted: hoursCompleted,
  endDate: endDate,
  attendanceStatus: attendanceStatus,
  applicationStatus: applicationStatus,
  applicationRejectionReason: applicationRejectionReason,
  participationRole: participationRole,
  roleApproval: roleApproval,
);

/// "h:mm AM/PM" for [at], the shape the details screen shows and parses.
String _clock(DateTime at) {
  final hour = at.hour % 12 == 0 ? 12 : at.hour % 12;
  final minute = at.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${at.hour < 12 ? 'AM' : 'PM'}';
}

/// An event that started an hour ago (to the minute) and ends in two hours.
CaresEvent _ongoingEvent() {
  final now = DateTime.now();
  final start = DateTime(
    now.year,
    now.month,
    now.day,
    now.hour,
    now.minute,
  ).subtract(const Duration(hours: 1));
  return _event(
    date: start,
    time: _clock(start),
    daysUntil: 0,
    endDate: now.add(const Duration(hours: 2)),
  );
}

/// A server row as `GET /events/recommended` sends it.
Map<String, dynamic> _serverRow({
  int eventId = 42,
  DateTime? startsAt,
  DateTime? endsAt,
  int maxParticipants = 50,
  int participants = 38,
  String status = 'Upcoming',
  Object? geofence,
  double? markerLat = _venueLat,
  double? markerLng = _venueLng,
  int imageCount = 2,
}) {
  final start = startsAt ?? DateTime(2031, 3, 14, 13, 30);
  final end = endsAt ?? DateTime(2031, 3, 14, 17, 0);
  return {
    'event_id': eventId,
    'title': 'Coastal Clean-up Drive',
    'description': 'Help clear the shoreline of plastic waste.',
    'event_started': start.toUtc().toIso8601String(),
    'event_ended': end.toUtc().toIso8601String(),
    'location': 'Looc Seawall, Mandaue City',
    'max_participants': maxParticipants,
    'participants': participants,
    'is_registered': true,
    'attendance_status': 'PENDING',
    'participation_role': 'FACILITATOR',
    'role_approval': 'PENDING',
    'organizer_name': 'UCLM CARES Office',
    'category': 'Environment',
    'status': status,
    'beneficiary_applicable': true,
    'marker_lat': markerLat,
    'marker_lng': markerLng,
    'geofence': geofence,
    'image_count': imageCount,
    'matched_interests': [
      {'code': 'ENV', 'label': 'Environment', 'score': 0.9},
      {'code': 'OUT', 'label': 'Outdoor', 'score': 0.6},
    ],
    'match_score': 0.82,
  };
}

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

class _Recorder {
  _Recorder(this.reply);

  final Future<http.Response> Function(http.Request request) reply;
  final List<http.Request> requests = [];

  http.Request get last => requests.last;

  EventRegistrationService service() => EventRegistrationService(
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

// ---------------------------------------------------------------------------
// Widget harness
// ---------------------------------------------------------------------------

Future<void> _pump(WidgetTester tester, Widget child) => tester.pumpWidget(
  MaterialApp(
    home: Scaffold(
      body: Padding(padding: const EdgeInsets.all(16), child: child),
    ),
  ),
);

Finder _rich(String text) => find.text(text, findRichText: true);

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
  // CaresEvent — what the details screen reads
  // -------------------------------------------------------------------------

  group('CaresEvent date and time labels', () {
    test('formats the date every way the details screen shows it', () {
      final event = _event(date: DateTime(2031, 3, 4), daysUntil: 5);

      expect(event.monthLabel, 'Mar');
      expect(event.dayLabel, '4');
      expect(event.formattedDate, '3/4/2031');
      expect(event.longDateLabel, 'March 4, 2031');
      expect(event.dateTimeLabel, '3/4/2031 · 8:00 AM');
      expect(event.countdownLabel, '5d');
      expect(event.countdownLeftLabel, '5d left');
    });

    test('labels the first and last month of the year', () {
      expect(_event(date: DateTime(2031, 1, 1)).monthLabel, 'Jan');
      expect(_event(date: DateTime(2031, 12, 31)).longDateLabel,
          'December 31, 2031');
    });

    test('parses the start clock time out of the time label', () {
      DateTime startOf(String time) => _event(time: time).startsAt;

      expect(startOf('8:00 AM'), DateTime(2031, 3, 14, 8));
      expect(startOf('1:30 PM'), DateTime(2031, 3, 14, 13, 30));
      expect(startOf('12:00 PM'), DateTime(2031, 3, 14, 12));
      expect(startOf('12:15 am'), DateTime(2031, 3, 14, 0, 15));
      expect(startOf('9 AM – 12 PM'), DateTime(2031, 3, 14, 9));
      expect(startOf('14:45'), DateTime(2031, 3, 14, 14, 45));
    });

    test('an unparseable time falls back to midnight', () {
      expect(_event(time: 'Whole day').startsAt, DateTime(2031, 3, 14));
    });

    test('the end is the server end time, else the hours, else 4 hours', () {
      final serverEnd = DateTime(2031, 3, 14, 11, 30);

      expect(_event(endDate: serverEnd, hoursCompleted: 8).endsAt, serverEnd);
      expect(
        _event(hoursCompleted: 6).endsAt,
        DateTime(2031, 3, 14, 14),
      );
      expect(_event(hoursCompleted: 0).endsAt, DateTime(2031, 3, 14, 12));
      expect(_event().endsAt, DateTime(2031, 3, 14, 12));
      expect(CaresEvent.defaultDuration, const Duration(hours: 4));
    });
  });

  group('CaresEvent phase (Upcoming → Ongoing → Completed)', () {
    final event = _event(endDate: DateTime(2031, 3, 14, 12));
    final start = DateTime(2031, 3, 14, 8);

    test('before the start it is upcoming', () {
      final now = start.subtract(const Duration(minutes: 1));
      expect(event.isOngoing(now), isFalse);
      expect(event.hasEnded(now), isFalse);
    });

    test('from the start until the end it is ongoing', () {
      expect(event.isOngoing(start), isTrue);
      expect(event.isOngoing(DateTime(2031, 3, 14, 11, 59)), isTrue);
      expect(event.hasEnded(start), isFalse);
    });

    test('at the end time it has ended', () {
      final end = DateTime(2031, 3, 14, 12);
      expect(event.hasEnded(end), isTrue);
      expect(event.isOngoing(end), isFalse);
    });

    test('a completed event has ended whatever the clock says', () {
      final completed = _event(isCompleted: true);
      expect(completed.hasEnded(DateTime(2000)), isTrue);
      expect(completed.isOngoing(start), isFalse);
    });

    test('the status label follows the device clock', () {
      expect(_event(date: DateTime(2099, 1, 1)).statusLabel, 'Upcoming');
      expect(_event(date: DateTime(2000, 1, 1)).statusLabel, 'Completed');
      expect(_ongoingEvent().statusLabel, 'Ongoing');
    });

    test('attendance tracking opens 30 minutes early and closes at the end',
        () {
      expect(event.trackingStartsAt, DateTime(2031, 3, 14, 7, 30));
      expect(event.isTrackingWindowOpen(DateTime(2031, 3, 14, 7, 29)), isFalse);
      expect(event.isTrackingWindowOpen(DateTime(2031, 3, 14, 7, 30)), isTrue);
      expect(event.isTrackingWindowOpen(DateTime(2031, 3, 14, 11, 59)), isTrue);
      expect(event.isTrackingWindowOpen(DateTime(2031, 3, 14, 12)), isFalse);
      expect(
        _event(isCompleted: true).isTrackingWindowOpen(start),
        isFalse,
      );
    });

    test('isSameDay ignores the clock time', () {
      expect(event.isSameDay(DateTime(2031, 3, 14, 23, 59)), isTrue);
      expect(event.isSameDay(DateTime(2031, 3, 15)), isFalse);
    });
  });

  group('CaresEvent slots and server id', () {
    test('a server event exposes its numeric id; a fixture has none', () {
      expect(_event(id: 'event-42').serverId, 42);
      expect(_event(id: 'mock-cleanup-1').serverId, isNull);
      expect(_event(id: 'event-').serverId, isNull);
    });

    test('fresh participant numbers re-derive slots and fill together', () {
      final updated = _event().withParticipants(
        registeredCount: 39,
        totalCapacity: 50,
      );

      expect(updated.registeredCount, 39);
      expect(updated.totalCapacity, 50);
      expect(updated.slotsLeft, 11);
      expect(updated.capacityFilled, closeTo(0.78, 1e-9));
      // Everything else is carried over untouched.
      expect(updated.title, 'Coastal Clean-up Drive');
      expect(updated.date, DateTime(2031, 3, 14));
    });

    test('an over-full event shows no negative slots and 100% fill', () {
      final updated = _event().withParticipants(
        registeredCount: 55,
        totalCapacity: 50,
      );

      expect(updated.slotsLeft, 0);
      expect(updated.capacityFilled, 1.0);
    });

    test('an event with no capacity reads as empty, not NaN', () {
      final updated = _event().withParticipants(
        registeredCount: 0,
        totalCapacity: 0,
      );

      expect(updated.slotsLeft, 0);
      expect(updated.capacityFilled, 0);
    });
  });

  group('CaresEvent participation, attendance and application', () {
    test('a join records the role and its approval; a cancel clears both', () {
      final joined = _event().withParticipationRole(
        EventParticipationRole.speaker,
        EventRoleApproval.pending,
      );
      expect(joined.participationRole, EventParticipationRole.speaker);
      expect(joined.isRolePendingApproval, isTrue);

      final cancelled = joined.withParticipationRole(null, null);
      expect(cancelled.participationRole, isNull);
      expect(cancelled.roleApproval, isNull);
      expect(cancelled.isRolePendingApproval, isFalse);
    });

    test('feedback waits for an attendance ruling and is closed when absent',
        () {
      final fixture = _event();
      expect(fixture.canGiveFeedback, isTrue);

      final pending = _event(attendanceStatus: 'PENDING');
      expect(pending.isAttendancePending, isTrue);
      expect(pending.canGiveFeedback, isFalse);

      final absent = _event(attendanceStatus: 'ABSENT');
      expect(absent.isMarkedAbsent, isTrue);
      expect(absent.canGiveFeedback, isFalse);

      expect(_event(attendanceStatus: 'COMPLETED').canGiveFeedback, isTrue);
    });

    test('application status flags match the server values', () {
      expect(_event(applicationStatus: 'PENDING').isApplicationPending, isTrue);
      expect(
        _event(applicationStatus: 'ACCEPTED').isApplicationAccepted,
        isTrue,
      );
      expect(
        _event(applicationStatus: 'REJECTED').isApplicationRejected,
        isTrue,
      );
      final none = _event();
      expect(none.isApplicationPending, isFalse);
      expect(none.isApplicationAccepted, isFalse);
      expect(none.isApplicationRejected, isFalse);
    });

    test('re-applying drops the old rejection reason', () {
      final rejected = _event(
        applicationStatus: 'REJECTED',
        applicationRejectionReason: 'Proof of residency was unreadable.',
      );

      final reapplied = rejected.withApplicationStatus('PENDING');

      expect(reapplied.isApplicationPending, isTrue);
      expect(reapplied.applicationRejectionReason, isNull);
    });
  });

  group('CaresEvent attendance area', () {
    test('without a drawn area it is a circle around the venue', () {
      final event = _event(attendanceRadiusMeters: 200);

      expect(
        event.containsPoint(latitude: _venueLat, longitude: _venueLng),
        isTrue,
      );
      // ~110 m north of the venue.
      expect(
        event.containsPoint(latitude: _venueLat + 0.001, longitude: _venueLng),
        isTrue,
      );
      // ~1.1 km north of the venue.
      expect(
        event.containsPoint(latitude: _venueLat + 0.01, longitude: _venueLng),
        isFalse,
      );
    });

    test('a drawn area wins over the radius', () {
      // A small square around the venue, as the server sends it: [lng, lat].
      final geofence = GeoUtils.geofenceFromJson([
        [
          [_venueLng - 0.0005, _venueLat - 0.0005],
          [_venueLng + 0.0005, _venueLat - 0.0005],
          [_venueLng + 0.0005, _venueLat + 0.0005],
          [_venueLng - 0.0005, _venueLat + 0.0005],
        ],
      ]);
      final event = _event(geofence: geofence, attendanceRadiusMeters: 5000);

      expect(
        event.containsPoint(latitude: _venueLat, longitude: _venueLng),
        isTrue,
      );
      // Inside the 5 km radius, but outside the drawn square.
      expect(
        event.containsPoint(latitude: _venueLat + 0.002, longitude: _venueLng),
        isFalse,
      );
    });
  });

  group('CaresEvent search and category filter', () {
    final event = _event();

    test('matches title, organizer, venue, category, description and tags',
        () {
      expect(event.matchesQuery(''), isTrue);
      expect(event.matchesQuery('   '), isTrue);
      expect(event.matchesQuery('clean-up'), isTrue);
      expect(event.matchesQuery('cares office'), isTrue);
      expect(event.matchesQuery('SEAWALL'), isTrue);
      expect(event.matchesQuery('environment'), isTrue);
      expect(event.matchesQuery('plastic'), isTrue);
      expect(event.matchesQuery('climate'), isTrue);
      expect(event.matchesQuery('blood drive'), isFalse);
    });

    test('the category filter ignores case and "All" matches everything', () {
      expect(event.matchesCategory('All'), isTrue);
      expect(event.matchesCategory('environment'), isTrue);
      expect(event.matchesCategory('Health'), isFalse);
      expect(kEventFilterCategories.first, 'All');
    });
  });

  // -------------------------------------------------------------------------
  // Server row → details model
  // -------------------------------------------------------------------------

  group('RecommendedEvent.toCaresEvent (server row → details)', () {
    test('maps the identity, schedule and numbers', () {
      final event = RecommendedEvent.fromJson(_serverRow()).toCaresEvent();

      expect(event.id, 'event-42');
      expect(event.serverId, 42);
      expect(event.title, 'Coastal Clean-up Drive');
      expect(event.organization, 'UCLM CARES Office');
      expect(event.location, 'Looc Seawall, Mandaue City');
      expect(event.category, 'Environment');
      expect(event.time, '1:30 PM');
      expect(event.startsAt, DateTime(2031, 3, 14, 13, 30));
      expect(event.endsAt, DateTime(2031, 3, 14, 17));
      expect(event.longDateLabel, 'March 14, 2031');
      expect(event.registeredCount, 38);
      expect(event.totalCapacity, 50);
      expect(event.slotsLeft, 12);
      expect(event.capacityFilled, closeTo(0.76, 1e-9));
      expect(event.daysUntil, greaterThan(0));
    });

    test('carries the volunteer’s registration and the beneficiary flag', () {
      final event = RecommendedEvent.fromJson(_serverRow()).toCaresEvent();

      expect(event.participationRole, EventParticipationRole.facilitator);
      expect(event.roleApproval, EventRoleApproval.pending);
      expect(event.isAttendancePending, isTrue);
      expect(event.openToBeneficiaries, isTrue);
      expect(event.tags, ['Environment', 'Outdoor']);
      expect(event.requirements, isEmpty);
    });

    test('builds one authenticated image URL per uploaded image', () {
      final event = RecommendedEvent.fromJson(_serverRow()).toCaresEvent();

      expect(event.imageUrls, [
        '$_origin/v1/events/42/images/0',
        '$_origin/v1/events/42/images/1',
      ]);
      expect(
        RecommendedEvent.fromJson(_serverRow(imageCount: 0))
            .toCaresEvent()
            .imageUrls,
        isEmpty,
      );
    });

    test('a "Completed" status closes the event out', () {
      final event = RecommendedEvent.fromJson(
        _serverRow(status: 'Completed'),
      ).toCaresEvent();

      expect(event.isCompleted, isTrue);
      expect(event.statusLabel, 'Completed');
    });

    test('noon and midnight starts read as 12, not 0', () {
      String timeOf(int hour) => RecommendedEvent.fromJson(
        _serverRow(
          startsAt: DateTime(2031, 3, 14, hour, 5),
          endsAt: DateTime(2031, 3, 14, 23, 0),
        ),
      ).toCaresEvent().time;

      expect(timeOf(0), '12:05 AM');
      expect(timeOf(12), '12:05 PM');
      expect(timeOf(9), '9:05 AM');
    });

    test('an over-full event and a zero-capacity event stay in range', () {
      final over = RecommendedEvent.fromJson(
        _serverRow(participants: 60),
      ).toCaresEvent();
      expect(over.slotsLeft, 0);
      expect(over.capacityFilled, 1.0);

      final none = RecommendedEvent.fromJson(
        _serverRow(maxParticipants: 0, participants: 0),
      ).toCaresEvent();
      expect(none.slotsLeft, 0);
      expect(none.capacityFilled, 0);
    });

    test('with no venue pin the drawn area’s centre stands in for it', () {
      final event = RecommendedEvent.fromJson(
        _serverRow(
          markerLat: null,
          markerLng: null,
          geofence: [
            [
              [123.949, 10.329],
              [123.951, 10.329],
              [123.951, 10.331],
              [123.949, 10.331],
            ],
          ],
        ),
      ).toCaresEvent();

      expect(event.geofence, isNotNull);
      expect(event.venueLatitude, closeTo(10.330, 1e-3));
      expect(event.venueLongitude, closeTo(123.950, 1e-3));
      expect(
        event.containsPoint(latitude: 10.330, longitude: 123.950),
        isTrue,
      );
    });

    test('without a pin or an area it falls back to a 500 m circle', () {
      final event = RecommendedEvent.fromJson(
        _serverRow(markerLat: null, markerLng: null),
      ).toCaresEvent();

      expect(event.geofence, isNull);
      expect(event.attendanceRadiusMeters, 500);
    });
  });

  // -------------------------------------------------------------------------
  // Participation role dropdown
  // -------------------------------------------------------------------------

  group('EventParticipationRole', () {
    test('only Regular is confirmed without a review', () {
      expect(EventParticipationRole.regular.requiresApproval, isFalse);
      expect(EventParticipationRole.organizer.requiresApproval, isTrue);
      expect(EventParticipationRole.facilitator.requiresApproval, isTrue);
      expect(EventParticipationRole.speaker.requiresApproval, isTrue);
    });

    test('roles and approvals round-trip through their API values', () {
      for (final role in EventParticipationRole.values) {
        expect(EventParticipationRole.fromApi(role.apiValue), role);
        expect(role.label, isNotEmpty);
        expect(role.description, isNotEmpty);
      }
      for (final approval in EventRoleApproval.values) {
        expect(EventRoleApproval.fromApi(approval.apiValue), approval);
      }
    });

    test('an unknown or missing value reads as "no role on record"', () {
      expect(EventParticipationRole.fromApi('VIP'), isNull);
      expect(EventParticipationRole.fromApi('regular'), isNull);
      expect(EventParticipationRole.fromApi(null), isNull);
      expect(EventRoleApproval.fromApi('MAYBE'), isNull);
    });
  });

  // -------------------------------------------------------------------------
  // Join / cancel
  // -------------------------------------------------------------------------

  group('POST /events/:id/register (Join)', () {
    test('sends the picked role and parses the fresh slot numbers', () async {
      final rec = _Recorder(
        (_) async => _ok({
          'event_id': 42,
          'is_registered': true,
          'max_participants': 50,
          'participants': 39,
          'slots_left': 11,
          'participation_role': 'SPEAKER',
          'role_approval': 'PENDING',
        }),
      );

      final result = await rec.service().register(
        42,
        role: EventParticipationRole.speaker,
      );

      expect(rec.requests, hasLength(1));
      expect(rec.last.method, 'POST');
      expect(rec.last.url.toString(), '$_origin/v1/events/42/register');
      expect(jsonDecode(rec.last.body), {'participation_role': 'SPEAKER'});

      expect(result.eventId, 42);
      expect(result.isRegistered, isTrue);
      expect(result.maxParticipants, 50);
      expect(result.participants, 39);
      expect(result.slotsLeft, 11);
      expect(result.participationRole, EventParticipationRole.speaker);
      expect(result.roleApproval, EventRoleApproval.pending);
    });

    test('defaults to Regular, which is approved straight away', () async {
      final rec = _Recorder(
        (_) async => _ok({
          'event_id': 42,
          'is_registered': true,
          'max_participants': 50,
          'participants': 39,
          'slots_left': 11,
          'participation_role': 'REGULAR',
          'role_approval': 'APPROVED',
        }),
      );

      final result = await rec.service().register(42);

      expect(jsonDecode(rec.last.body), {'participation_role': 'REGULAR'});
      expect(result.roleApproval, EventRoleApproval.approved);
    });

    test('sends the signed-in volunteer’s bearer token', () async {
      AuthSession.setAccessToken('jwt.volunteer');
      final rec = _Recorder(
        (_) async => _ok({'event_id': 42, 'is_registered': true}),
      );

      await rec.service().register(42);

      expect(rec.last.headers['Authorization'], 'Bearer jwt.volunteer');
    });

    test('the joined numbers redraw the event the screen holds', () async {
      final rec = _Recorder(
        (_) async => _ok({
          'event_id': 42,
          'is_registered': true,
          'max_participants': 50,
          'participants': 39,
          'slots_left': 11,
          'participation_role': 'ORGANIZER',
          'role_approval': 'PENDING',
        }),
      );

      final result = await rec.service().register(
        42,
        role: EventParticipationRole.organizer,
      );
      final redrawn = _event()
          .withParticipants(
            registeredCount: result.participants,
            totalCapacity: result.maxParticipants,
          )
          .withParticipationRole(result.participationRole, result.roleApproval);

      expect(redrawn.slotsLeft, result.slotsLeft);
      expect(redrawn.registeredCount, 39);
      expect(redrawn.isRolePendingApproval, isTrue);
    });

    test('a full event is refused with the server message', () async {
      final rec = _Recorder(
        (_) async => _json(409, {
          'ok': false,
          'message': 'This event is already full',
        }),
      );

      await expectLater(
        rec.service().register(42),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 409)
              .having((e) => e.message, 'message', 'This event is already full'),
        ),
      );
    });

    test('a missing event id in the reply is a parsing failure', () async {
      final rec = _Recorder((_) async => _ok({'is_registered': true}));

      await expectLater(rec.service().register(42), throwsA(isA<TypeError>()));
    });
  });

  group('DELETE /events/:id/register (Cancel)', () {
    test('gives the slot back and clears the role', () async {
      final rec = _Recorder(
        (_) async => _ok({
          'event_id': 42,
          'is_registered': false,
          'max_participants': 50,
          'participants': 37,
          'slots_left': 13,
        }),
      );

      final result = await rec.service().cancel(42);

      expect(rec.last.method, 'DELETE');
      expect(rec.last.url.toString(), '$_origin/v1/events/42/register');
      expect(result.isRegistered, isFalse);
      expect(result.slotsLeft, 13);
      expect(result.participationRole, isNull);
      expect(result.roleApproval, isNull);
    });

    test('cancelling an ongoing event is refused with the server message',
        () async {
      final rec = _Recorder(
        (_) async => _json(400, {
          'ok': false,
          'message': 'You can no longer cancel once the event has started',
        }),
      );

      await expectLater(
        rec.service().cancel(42),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'You can no longer cancel once the event has started',
          ),
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Details widgets
  // -------------------------------------------------------------------------

  group('EventInfoCard', () {
    testWidgets('shows the long date, time and venue', (tester) async {
      await _pump(tester, EventInfoCard(event: _event(date: DateTime(2099, 3, 14))));

      expect(find.text('Date & time'), findsOneWidget);
      expect(find.text('March 14, 2099 · 8:00 AM'), findsOneWidget);
      expect(find.text('Venue'), findsOneWidget);
      expect(find.text('Looc Seawall, Mandaue City'), findsOneWidget);
    });

    testWidgets('counts down Today / Tomorrow / In N days for upcoming events',
        (tester) async {
      final upcoming = DateTime(2099, 3, 14);
      for (final entry in {
        0: 'Today',
        1: 'Tomorrow',
        5: 'In 5 days',
      }.entries) {
        await _pump(
          tester,
          EventInfoCard(event: _event(date: upcoming, daysUntil: entry.key)),
        );
        expect(find.text(entry.value), findsOneWidget, reason: entry.value);
      }
    });

    testWidgets('an ongoing event says "Happening now" instead',
        (tester) async {
      await _pump(tester, EventInfoCard(event: _ongoingEvent()));

      expect(find.text('Happening now'), findsOneWidget);
      expect(find.text('Today'), findsNothing);
    });

    testWidgets('a finished event shows no countdown at all', (tester) async {
      await _pump(
        tester,
        EventInfoCard(event: _event(date: DateTime(2000, 1, 1), daysUntil: 0)),
      );

      expect(find.text('Happening now'), findsNothing);
      expect(find.text('Today'), findsNothing);
    });
  });

  group('EventRegisterBar', () {
    testWidgets('shows slots out of capacity and registers on tap',
        (tester) async {
      var taps = 0;
      await _pump(
        tester,
        EventRegisterBar(slotsLeft: 12, capacity: 50, onRegister: () => taps++),
      );

      expect(find.text('Slots left'), findsOneWidget);
      expect(_rich('12 / 50'), findsOneWidget);
      expect(find.text('Register Now'), findsOneWidget);

      await tester.tap(find.text('Register Now'));
      expect(taps, 1);
    });

    testWidgets('a full event says so and cannot be registered for',
        (tester) async {
      await _pump(
        tester,
        const EventRegisterBar(slotsLeft: 0, capacity: 50, onRegister: null),
      );

      expect(find.text('No slots left'), findsOneWidget);
      expect(find.text('Event full'), findsOneWidget);
      expect(find.byIcon(Icons.block_rounded), findsOneWidget);
      final button = tester.widget<ButtonStyleButton>(
        find.byWidgetPredicate((w) => w is ButtonStyleButton),
      );
      expect(button.onPressed, isNull);
    });

    testWidgets('an uncapped event shows the slot count alone',
        (tester) async {
      await _pump(
        tester,
        EventRegisterBar(slotsLeft: 7, capacity: 0, onRegister: () {}),
      );

      expect(_rich('7'), findsOneWidget);
      expect(find.textContaining('/'), findsNothing);
    });
  });

  group('EventMembersRow', () {
    testWidgets('invites the first volunteer when nobody has joined',
        (tester) async {
      await _pump(tester, const EventMembersRow(count: 0, capacity: 50));

      expect(find.text('Be the first to join this event'), findsOneWidget);
      expect(find.byIcon(Icons.person_rounded), findsNothing);
    });

    testWidgets('shows up to three avatars without an overflow disc',
        (tester) async {
      await _pump(tester, const EventMembersRow(count: 2, capacity: 50));

      expect(_rich('2 Members are joined:'), findsOneWidget);
      expect(find.byIcon(Icons.person_rounded), findsNWidgets(2));
      expect(find.textContaining('+'), findsNothing);
    });

    testWidgets('puts everyone past three in a "+N" disc', (tester) async {
      await _pump(tester, const EventMembersRow(count: 38, capacity: 50));

      expect(_rich('38 Members are joined:'), findsOneWidget);
      expect(find.byIcon(Icons.person_rounded), findsNWidgets(3));
      expect(find.text('+35'), findsOneWidget);
    });

    testWidgets('compacts large counts to "k"', (tester) async {
      // Under 10k keeps one decimal.
      await _pump(tester, const EventMembersRow(count: 1500, capacity: 2000));
      expect(_rich('1.5k Members are joined:'), findsOneWidget);
      expect(find.text('+1.5k'), findsOneWidget);

      // A trailing ".0" is dropped.
      await _pump(tester, const EventMembersRow(count: 1003, capacity: 2000));
      expect(_rich('1k Members are joined:'), findsOneWidget);

      // From 10k up it rounds to a whole number. (The `_compact` doc comment
      // says 15700 → "15.7k"; the code gives "16k".)
      await _pump(tester, const EventMembersRow(count: 15700, capacity: 20000));
      expect(_rich('16k Members are joined:'), findsOneWidget);
      expect(find.text('+16k'), findsOneWidget);

      await _pump(tester, const EventMembersRow(count: 999, capacity: 2000));
      expect(_rich('999 Members are joined:'), findsOneWidget);
    });
  });

  group('EventOrganizerRow', () {
    testWidgets('shows the organizer with their initial', (tester) async {
      await _pump(
        tester,
        EventOrganizerRow(
          name: 'uclm CARES Office',
          expanded: false,
          onToggle: () {},
        ),
      );

      expect(find.text('U'), findsOneWidget);
      expect(_rich('Organized by uclm CARES Office'), findsOneWidget);
      // No blurb, nothing to expand.
      expect(find.byIcon(Icons.expand_more_rounded), findsNothing);
    });

    testWidgets('a blank organizer name shows "?"', (tester) async {
      await _pump(
        tester,
        EventOrganizerRow(name: '  ', expanded: false, onToggle: () {}),
      );

      expect(find.text('?'), findsOneWidget);
    });

    testWidgets('a blurb adds a chevron that toggles it open',
        (tester) async {
      var toggles = 0;
      const blurb = 'The university office for community extension work.';
      Widget row(bool expanded) => EventOrganizerRow(
        name: 'UCLM CARES Office',
        description: '  $blurb ',
        expanded: expanded,
        onToggle: () => toggles++,
      );

      await _pump(tester, row(false));
      expect(find.byIcon(Icons.expand_more_rounded), findsOneWidget);
      expect(find.text(blurb), findsNothing);

      await tester.tap(_rich('Organized by UCLM CARES Office'));
      expect(toggles, 1);

      await _pump(tester, row(true));
      await tester.pumpAndSettle();
      expect(find.text(blurb), findsOneWidget);
    });
  });

  group('EventActionCard', () {
    testWidgets('offers participants, directions and the reminder',
        (tester) async {
      final tapped = <String>[];
      await _pump(
        tester,
        EventActionCard(
          eventId: 'event-action-1',
          onParticipants: () => tapped.add('participants'),
          onDirections: () => tapped.add('directions'),
          onReminder: () => tapped.add('reminder'),
        ),
      );

      expect(find.text('Participants'), findsOneWidget);
      expect(find.text('Directions'), findsOneWidget);
      expect(find.text('Reminder'), findsOneWidget);
      // On by default, a day before.
      expect(find.text('1d before'), findsOneWidget);

      await tester.tap(find.text('Participants'));
      await tester.tap(find.text('Directions'));
      await tester.tap(find.text('Reminder'));
      expect(tapped, ['participants', 'directions', 'reminder']);
    });

    testWidgets('follows the reminder preference as it changes',
        (tester) async {
      const id = 'event-action-2';
      await _pump(
        tester,
        EventActionCard(
          eventId: id,
          onParticipants: () {},
          onDirections: () {},
          onReminder: () {},
        ),
      );

      EventReminderStore.instance.setDaysBefore(id, 7);
      await tester.pump();
      expect(find.text('1 wk before'), findsOneWidget);

      EventReminderStore.instance.setDaysBefore(id, 3);
      await tester.pump();
      expect(find.text('3d before'), findsOneWidget);

      EventReminderStore.instance.setEnabled(id, false);
      await tester.pump();
      expect(find.text('Off'), findsOneWidget);
      expect(find.byIcon(Icons.notifications_off_outlined), findsOneWidget);
    });
  });

  group('status pill and rejection banner', () {
    testWidgets('EventStatusPill shows its label', (tester) async {
      await _pump(tester, const EventStatusPill(label: 'REGISTERED'));

      expect(find.text('REGISTERED'), findsOneWidget);
    });

    testWidgets('a rejected application shows the director’s reason',
        (tester) async {
      await _pump(
        tester,
        const ApplicationRejectedBanner(
          reason: '  Proof of residency was unreadable. ',
        ),
      );

      expect(find.text('Application rejected'), findsOneWidget);
      expect(find.text('Reason from the director'), findsOneWidget);
      expect(find.text('Proof of residency was unreadable.'), findsOneWidget);
      expect(
        find.text('You can apply again with an updated document.'),
        findsOneWidget,
      );
    });

    testWidgets('a rejection without a reason says none was given',
        (tester) async {
      await _pump(tester, const ApplicationRejectedBanner());

      expect(find.text('No reason was given.'), findsOneWidget);
    });
  });
}
