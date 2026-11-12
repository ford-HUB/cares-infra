// Unit tests for donations — a donor giving money or goods to an event that
// accepts them, and following the donation until CARES confirms it:
//
//   GET   /v1/events/donations            DonationService.fetchCampaigns
//   GET   /v1/donations/me                DonationService.fetchMine
//   GET   /v1/donations/:id               DonationService.fetchDonation
//   POST  /v1/donations/goods             DonationService.pledgeGoods
//   PATCH /v1/donations/:id/goods         DonationService.updateGoods
//   POST  /v1/donations/:id/cancel        DonationService.cancel
//   GET   /v1/payments/methods            DonationPaymentService.fetchAvailableMethods
//   POST  /v1/donations/payments          DonationPaymentService.createPayment
//   GET   /v1/donations/payments/:id      DonationPaymentService.fetchPayment
//   DonationFormat, Donation / DonationPayment / DonationCampaign models,
//   DonorSummary, and DonationFlowScreen (money via QR Ph and GCash, goods
//   pledge, status views, edit and cancel).
//
// The flow screen builds its own services, so the network is package:http's
// MockClient through `http.runWithClient`. The browser hand-off for GCash goes
// to a fake url_launcher channel. Every campaign, payment and donation is a
// local fixture — nothing reaches a server or the payment gateway.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/constants/cares_office.dart';
import 'package:mobile/core/constants/goods_types.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';
import 'package:mobile/features/dashboard/data/donation_payment_service.dart';
import 'package:mobile/features/dashboard/data/donation_service.dart';
import 'package:mobile/features/dashboard/data/models/donation_campaign_models.dart';
import 'package:mobile/features/dashboard/data/models/donation_models.dart';
import 'package:mobile/features/dashboard/data/models/donation_payment_models.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';
import 'package:mobile/features/dashboard/screens/donation_flow_screen.dart';

const _origin = 'http://api.test';
const _methodsPath = '/v1/payments/methods';
const _paymentsPath = '/v1/donations/payments';
const _paymentPath = '/v1/donations/payments/pay-1';
const _goodsPath = '/v1/donations/goods';
const _donationPath = '/v1/donations/don-1';
const _donationGoodsPath = '/v1/donations/don-1/goods';
const _cancelPath = '/v1/donations/don-1/cancel';

const _campaignTitle = 'Typhoon Odette Relief Drive';
const _qrString =
    '00020101021228580011ph.ppmi.p2m0111CARESQRPH5204000053036085802PH';
const _gcashUrl = 'https://checkout.xendit.test/gcash/pay-1';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

Map<String, dynamic> _eventJson({
  int id = 42,
  String title = _campaignTitle,
  bool funds = true,
  bool goods = true,
  List<String> goodsTypes = const ['food', 'clothing'],
  String category = 'Disaster Relief',
  String organizer = 'UCLM CARES Office',
  String location = 'Pajo, Lapu-Lapu City',
  int raised = 12500,
  int donations = 3,
  String startsAt = '2031-03-14T00:00:00.000Z',
}) => {
  'event_id': id,
  'title': title,
  'description': 'Relief packs for families displaced by the typhoon.',
  'event_started': startsAt,
  'event_ended': '2031-03-14T08:00:00.000Z',
  'location': location,
  'organizer_name': organizer,
  'category': category,
  'funds_donation': funds,
  'goods_donation': goods,
  'goods_types': goodsTypes,
  'funds_raised': raised,
  'donations_count': donations,
};

DonationCampaign _campaign({
  bool funds = true,
  bool goods = true,
  List<String> goodsTypes = const ['food', 'clothing'],
}) => DonationCampaign(
  RecommendedEvent.fromJson(
    _eventJson(funds: funds, goods: goods, goodsTypes: goodsTypes),
  ),
);

Map<String, dynamic> _methodJson(
  String method,
  String label, {
  int min = 1,
  int max = 100000,
  String? accountName,
  String? accountNumber,
}) => {
  'method': method,
  'label': label,
  'description': '$label — as set by the director',
  'min_amount': min,
  'max_amount': max,
  'account_name': ?accountName,
  'account_number': ?accountNumber,
};

Map<String, dynamic> _methodsJson({bool accepting = true}) => {
  'accepting_payments': accepting,
  'items': accepting
      ? [
          _methodJson(
            'GCASH',
            'GCash',
            accountName: 'CARES — UCLM',
            accountNumber: '0917 000 0000',
          ),
          _methodJson('QRPH', 'QR Ph', max: 50000, accountName: 'CARES — UCLM'),
          _methodJson('CARD', 'Credit/Debit Card', min: 1000),
        ]
      : <Map<String, dynamic>>[],
  'support_email': 'cares@uclm.edu.ph',
};

Map<String, dynamic> _paymentJson({
  String method = 'QRPH',
  String status = 'PENDING',
  int amount = 500,
  String? checkoutUrl,
  String? qr,
  String? paymentReference,
  String? failureReason,
  String? donationId,
  String? expiresAt,
}) => {
  'donation_payment_id': 'pay-1',
  'campaign_id': 'event-42',
  'campaign_title': _campaignTitle,
  'amount': amount,
  'method': method,
  'status': status,
  'gateway_reference': 'CARES-DON-000123',
  'payment_reference': ?paymentReference,
  'checkout_url': ?checkoutUrl,
  'qr_string': ?qr,
  'failure_reason': ?failureReason,
  'donation_id': ?donationId,
  'expires_at': ?expiresAt,
  'created_at': '2031-03-10T01:30:00.000Z',
};

Map<String, dynamic> _donationJson({
  String id = 'don-1',
  String reference = 'DN-0007',
  String kind = 'MONEY',
  String status = 'PLEDGED',
  int amount = 500,
  String? method = 'QRPH',
  String? paymentReference = 'xnd_pay_123',
  String? goodsType,
  String? goodsItem,
  int? quantity,
  String? contact,
  String? deliveryDate,
  List<Map<String, dynamic>> trail = const [],
}) => {
  'donation_id': id,
  'reference': reference,
  'kind': kind,
  'status': status,
  'event_id': 42,
  'event_title': _campaignTitle,
  'amount': amount,
  'payment_id': kind == 'MONEY' ? 'pay-1' : null,
  'method': ?method,
  'payment_reference': ?paymentReference,
  'goods_type': ?goodsType,
  'goods_item': ?goodsItem,
  'goods_quantity': ?quantity,
  'donor_contact': ?contact,
  'delivery_date': ?deliveryDate,
  'trail': trail,
  'created_at': '2031-03-10T01:30:00.000Z',
  'updated_at': '2031-03-10T01:30:00.000Z',
};

Map<String, dynamic> _goodsJson({
  String status = 'PLEDGED',
  String goodsType = 'food',
  String? goodsItem = '5kg bags of rice',
  int quantity = 3,
}) => _donationJson(
  kind: 'GOODS',
  status: status,
  amount: 0,
  method: null,
  paymentReference: null,
  goodsType: goodsType,
  goodsItem: goodsItem,
  quantity: quantity,
  contact: '09171234567',
  deliveryDate: '2031-03-12',
);

Donation _goods({
  String status = 'PLEDGED',
  String? goodsItem = '5kg bags of rice',
}) => Donation.fromJson(_goodsJson(status: status, goodsItem: goodsItem));

Donation _money({String status = 'PLEDGED'}) =>
    Donation.fromJson(_donationJson(status: status));

// ---------------------------------------------------------------------------
// Mock network
// ---------------------------------------------------------------------------

typedef _Handler = Future<http.Response> Function(http.Request request);

/// Answers the donation endpoints. Each route can be replaced per test.
class _Server {
  _Server() {
    routes.addAll({
      'GET $_methodsPath': (_) async => _ok(_methodsJson()),
      'POST $_paymentsPath': (request) async {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        final method = body['method'] as String;
        return _ok(
          _paymentJson(
            method: method,
            amount: body['amount'] as int,
            qr: method == 'QRPH' ? _qrString : null,
            checkoutUrl: method == 'QRPH' ? null : _gcashUrl,
          ),
        );
      },
      'GET $_paymentPath': (_) async =>
          _ok(_paymentJson(qr: _qrString)), // still pending
      'GET $_donationPath': (_) async => _ok(_donationJson()),
      'POST $_goodsPath': (request) async {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        return _ok(
          _donationJson(
            kind: 'GOODS',
            amount: 0,
            method: null,
            paymentReference: null,
            goodsType: body['goodsType'] as String,
            goodsItem: body['goodsItem'] as String?,
            quantity: body['quantity'] as int,
            contact: body['contactNumber'] as String,
            deliveryDate: body['deliveryDate'] as String,
          ),
        );
      },
      'PATCH $_donationGoodsPath': (request) async {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        return _ok(
          _donationJson(
            kind: 'GOODS',
            amount: 0,
            method: null,
            paymentReference: null,
            goodsType: body['goodsType'] as String,
            goodsItem: body['goodsItem'] as String?,
            quantity: body['quantity'] as int,
            contact: body['contactNumber'] as String,
            deliveryDate: body['deliveryDate'] as String,
          ),
        );
      },
      'POST $_cancelPath': (_) async => _ok(_goodsJson(status: 'CANCELLED')),
    });
  }

  final Map<String, _Handler> routes = {};
  final List<http.Request> requests = [];

  List<http.Request> where(String method, String path) =>
      requests.where((r) => r.method == method && r.url.path == path).toList();

  http.Client client() => MockClient((request) async {
    requests.add(request);
    final handler = routes['${request.method} ${request.url.path}'];
    if (handler == null) return _fail(404, 'Not found');
    return handler(request);
  });

  /// Replies to the payment status poll with these, one per call, repeating
  /// the last.
  void paymentReplies(List<Map<String, dynamic>> replies) {
    var i = 0;
    routes['GET $_paymentPath'] = (_) async {
      final reply = replies[i < replies.length ? i : replies.length - 1];
      i++;
      return _ok(reply);
    };
  }
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

Map<String, dynamic> _bodyOf(http.Request request) =>
    jsonDecode(request.body) as Map<String, dynamic>;

// ---------------------------------------------------------------------------
// Fake browser hand-off
// ---------------------------------------------------------------------------

class _Launcher {
  static const channel = MethodChannel('plugins.flutter.io/url_launcher');

  final List<String> opened = [];
  bool succeeds = true;

  Future<Object?> handle(MethodCall call) async {
    if (call.method == 'launch') {
      opened.add((call.arguments as Map)['url'] as String);
      return succeeds;
    }
    if (call.method == 'canLaunch') return true;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Flow harness
// ---------------------------------------------------------------------------

class _Outcome {
  bool closed = false;
}

/// Opens the donation flow from a launcher page, inside a ProviderScope,
/// on a tall surface so each step is fully built.
Future<_Outcome> _openFlow(
  WidgetTester tester, {
  DonationCampaign? campaign,
  Donation? existing,
}) async {
  tester.view.physicalSize = const Size(900, 2600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  final outcome = _Outcome();
  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => DonationFlowScreen(
                        campaign: campaign,
                        existingDonation: existing,
                      ),
                    ),
                  );
                  outcome.closed = true;
                },
                child: const Text('Donate now'),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Donate now'));
  await _settle(tester);
  expect(find.byType(DonationFlowScreen), findsOneWidget);
  return outcome;
}

/// Pumps through a step change (the 220 ms switcher) without waiting for
/// spinners to stop.
Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 150));
  }
}

Finder _button(String label) => find.ancestor(
  of: find.text(label),
  matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
);

bool _enabled(WidgetTester tester, String label) =>
    tester.widget<ButtonStyleButton>(_button(label).first).onPressed != null;

Future<void> _tap(WidgetTester tester, String label) async {
  await tester.tap(_button(label).first);
  await _settle(tester);
}

Future<void> _tapText(WidgetTester tester, String text) async {
  await tester.tap(find.text(text).first);
  await _settle(tester);
}

String get _title =>
    (find
                .descendant(
                  of: find.byType(AppBar),
                  matching: find.byType(Text),
                )
                .evaluate()
                .first
                .widget
            as Text)
        .data!;

/// The value next to a summary row label.
String _row(WidgetTester tester, String label) {
  final row = find.ancestor(of: find.text(label), matching: find.byType(Row));
  return tester
      .widgetList<Text>(
        find.descendant(of: row.first, matching: find.byType(Text)),
      )
      .map((t) => t.data)
      .where((t) => t != label)
      .first!;
}

Finder _field(String hint) => find.byWidgetPredicate(
  (w) => w is TextField && w.decoration?.hintText == hint,
);

/// Money: pick "Money" (when asked), keep ₱500, choose [method], continue
/// to the review step.
Future<void> _toReview(
  WidgetTester tester, {
  String method = 'QR Ph',
  bool chooseType = true,
}) async {
  if (chooseType) {
    await _tapText(tester, 'Money');
    await _tap(tester, 'Continue');
  }
  await _tap(tester, 'Continue'); // amount → payment method
  await _tapText(tester, method);
  await _tap(tester, 'Continue'); // → review
  expect(find.text('Review Your Donation'), findsOneWidget);
}

/// Goods: pick Food with a note and quantity 2, then fill the delivery step.
Future<DateTime> _toGoodsReview(WidgetTester tester) async {
  await _tapText(tester, 'Food');
  await tester.enterText(_field('e.g. 5kg bags of rice'), '5kg bags of rice');
  await tester.pump();
  await tester.tap(find.byIcon(Icons.add_rounded));
  await tester.pump();
  await _tap(tester, 'Continue');

  await tester.enterText(_field('09XX XXX XXXX'), '0917 1234 567');
  await tester.pump();
  final date = await _pickTomorrow(tester);
  await _tap(tester, 'Continue');
  return date;
}

/// Opens the delivery date picker and accepts its first suggestion,
/// tomorrow.
Future<DateTime> _pickTomorrow(WidgetTester tester) async {
  await tester.tap(find.text('Select the date you will deliver'));
  await tester.pumpAndSettle();
  expect(find.text('When will you deliver the goods?'), findsOneWidget);
  await tester.tap(find.text('OK'));
  await tester.pumpAndSettle();
  final now = DateTime.now().add(const Duration(days: 1));
  return DateTime(now.year, now.month, now.day);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  late _Server server;
  late _Launcher launcher;

  setUp(() {
    dotenv.testLoad(
      fileInput: 'APP_ENV=development\nDEVELOPMENT_ORIGIN=$_origin/\n',
    );
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
    server = _Server();
    launcher = _Launcher();
    messenger.setMockMethodCallHandler(_Launcher.channel, launcher.handle);
  });

  tearDown(() {
    // pledge / cancel / a settled payment schedule a notifications re-read.
    NotificationSync.instance.stop();
    messenger.setMockMethodCallHandler(_Launcher.channel, null);
    AuthSession.clear();
    AuthSession.onSessionEnded = null;
  });

  /// A widget test with the flow's network faked, that drops the
  /// notification follow-up timer before the test ends.
  void flowTest(String description, Future<void> Function(WidgetTester) body) {
    testWidgets(description, (tester) async {
      await http.runWithClient(() => body(tester), server.client);
      NotificationSync.instance.stop();
    });
  }

  // =========================================================================
  // Formatting
  // =========================================================================

  group('DonationFormat', () {
    test('peso: compact thousands for tiles', () {
      expect(DonationFormat.peso(0), '₱0');
      expect(DonationFormat.peso(850), '₱850');
      expect(DonationFormat.peso(999), '₱999');
      expect(DonationFormat.peso(1000), '₱1.0k');
      expect(DonationFormat.peso(1250), '₱1.3k');
      expect(DonationFormat.peso(9999), '₱10.0k');
      expect(DonationFormat.peso(12500), '₱13k');
      expect(DonationFormat.peso(250000), '₱250k');
    });

    test('pesoFull: comma-grouped for receipts', () {
      expect(DonationFormat.pesoFull(0), '₱0');
      expect(DonationFormat.pesoFull(500), '₱500');
      expect(DonationFormat.pesoFull(1000), '₱1,000');
      expect(DonationFormat.pesoFull(12500), '₱12,500');
      expect(DonationFormat.pesoFull(1234567), '₱1,234,567');
    });

    test('dates and times', () {
      final at = DateTime(2031, 10, 2, 9, 5);
      expect(DonationFormat.dateOnly(at), 'Oct 2, 2031');
      expect(DonationFormat.dateTime(at), 'Oct 2, 2031 · 9:05 AM');
      expect(
        DonationFormat.dateTime(DateTime(2031, 1, 1, 0, 0)),
        'Jan 1, 2031 · 12:00 AM',
      );
      expect(
        DonationFormat.dateTime(DateTime(2031, 1, 1, 12, 30)),
        'Jan 1, 2031 · 12:30 PM',
      );
      expect(DonationFormat.minutes(23 * 60 + 59), '11:59 PM');
    });

    test('isoDate is zero-padded with no time', () {
      expect(
        DonationFormat.isoDate(DateTime(2031, 3, 4, 18, 45)),
        '2031-03-04',
      );
      expect(DonationFormat.isoDate(DateTime(987, 12, 31)), '0987-12-31');
    });
  });

  // =========================================================================
  // Models
  // =========================================================================

  group('donation enums', () {
    test('kind from the wire, money by default', () {
      expect(DonationKind.fromWire('GOODS'), DonationKind.goods);
      expect(DonationKind.fromWire('MONEY'), DonationKind.money);
      expect(DonationKind.fromWire('ANYTHING'), DonationKind.money);
      expect(DonationKind.goods.label, 'Goods');
    });

    test('payment methods: labels, wire values and hand-off', () {
      expect(DonationPaymentMethod.values.map((m) => m.wireValue), [
        'GCASH',
        'QRPH',
        'CARD',
        'BANK_TRANSFER',
      ]);
      expect(DonationPaymentMethod.bank.label, 'Bank Transfer');
      expect(DonationPaymentMethod.gcash.referenceLabel, 'GCash Reference No.');
      expect(DonationPaymentMethod.qrph.referenceLabel, 'QR Ph Reference No.');
      expect(
        DonationPaymentMethod.card.referenceLabel,
        'Payment Reference No.',
      );
      expect(DonationPaymentMethod.qrph.opensExternally, isFalse);
      expect(DonationPaymentMethod.gcash.opensExternally, isTrue);
      expect(DonationPaymentMethod.card.opensExternally, isTrue);
      expect(
        DonationPaymentMethod.gcash.assetPath,
        'assets/images/payment/gcash.svg',
      );
    });

    test('payment method parsing: strict and lenient', () {
      expect(
        DonationPaymentMethodMeta.fromWire('BANK_TRANSFER'),
        DonationPaymentMethod.bank,
      );
      expect(
        () => DonationPaymentMethodMeta.fromWire('PAYPAL'),
        throwsArgumentError,
      );
      expect(DonationPaymentMethodMeta.tryFromWire('PAYPAL'), isNull);
      expect(DonationPaymentMethodMeta.tryFromWire(null), isNull);
      expect(
        DonationPaymentMethodMeta.tryFromWire('QRPH'),
        DonationPaymentMethod.qrph,
      );
    });

    test('status ladder', () {
      expect(
        DonationStatus.fromWire('AWAITING_PICKUP'),
        DonationStatus.awaitingPickup,
      );
      expect(DonationStatus.fromWire('VERIFYING'), DonationStatus.verifying);
      expect(DonationStatus.fromWire('CONFIRMED'), DonationStatus.confirmed);
      expect(DonationStatus.fromWire('DECLINED'), DonationStatus.declined);
      expect(DonationStatus.fromWire('CANCELLED'), DonationStatus.cancelled);
      expect(DonationStatus.fromWire(null), DonationStatus.pledged);
      expect(DonationStatus.fromWire('WHATEVER'), DonationStatus.pledged);
      expect(DonationStatus.awaitingPickup.label, 'Awaiting Drop-off');
      expect(DonationStatus.awaitingPickup.upperLabel, 'AWAITING DROP-OFF');

      expect(DonationStatus.values.where((s) => s.isTerminal), [
        DonationStatus.confirmed,
        DonationStatus.declined,
        DonationStatus.cancelled,
      ]);
      expect(DonationStatus.flowFor(DonationKind.goods), [
        DonationStatus.pledged,
        DonationStatus.awaitingPickup,
        DonationStatus.verifying,
        DonationStatus.confirmed,
      ]);
      expect(DonationStatus.flowFor(DonationKind.money), [
        DonationStatus.pledged,
        DonationStatus.verifying,
        DonationStatus.confirmed,
      ]);
    });

    test('payment status: only pending is open', () {
      expect(
        DonationPaymentStatus.fromWire('PAID'),
        DonationPaymentStatus.paid,
      );
      expect(
        DonationPaymentStatus.fromWire('FAILED'),
        DonationPaymentStatus.failed,
      );
      expect(
        DonationPaymentStatus.fromWire('EXPIRED'),
        DonationPaymentStatus.expired,
      );
      expect(
        DonationPaymentStatus.fromWire('PENDING'),
        DonationPaymentStatus.pending,
      );
      expect(
        DonationPaymentStatus.fromWire('NEW'),
        DonationPaymentStatus.pending,
      );
      expect(DonationPaymentStatus.pending.isTerminal, isFalse);
      expect(DonationPaymentStatus.paid.isTerminal, isTrue);
      expect(DonationPaymentStatus.expired.isTerminal, isTrue);
    });
  });

  group('Donation', () {
    test('a money row', () {
      final d = Donation.fromJson(
        _donationJson(
          status: 'VERIFYING',
          trail: [
            {
              'donation_trail_entry_id': 't1',
              'status': 'VERIFYING',
              'note': 'GCash reference matches.',
              'actor_label': 'Director Ana',
              'created_at': '2031-03-11T02:00:00.000Z',
            },
          ],
        ),
      );
      expect(d.id, 'don-1');
      expect(d.reference, 'DN-0007');
      expect(d.isMoney, isTrue);
      expect(d.status, DonationStatus.verifying);
      expect(d.statusLabel, 'Verifying');
      expect(d.amount, 500);
      expect(d.eventId, 42);
      expect(d.paymentMethod, DonationPaymentMethod.qrph);
      expect(d.paymentReferenceLabel, 'QR Ph Reference No.');
      expect(d.paymentReference, 'xnd_pay_123');
      expect(d.canModify, isFalse);
      expect(d.createdAt.isUtc, isFalse);
      expect(
        d.createdAt.isAtSameMomentAs(DateTime.utc(2031, 3, 10, 1, 30)),
        isTrue,
      );
      final step = d.trail.single;
      expect(step.status, DonationStatus.verifying);
      expect(step.note, 'GCash reference matches.');
      expect(step.actorLabel, 'Director Ana');
    });

    test('a goods row, with its delivery day kept as a calendar day', () {
      final d = _goods();
      expect(d.isGoods, isTrue);
      expect(d.goodsLabel, 'Food — 5kg bags of rice');
      expect(d.goodsQuantity, 3);
      expect(d.contactNumber, '09171234567');
      expect(d.deliveryDate, DateTime(2031, 3, 12));
      expect(d.deliveryDateLabel, 'Mar 12, 2031');
      expect(d.paymentMethod, isNull);
      expect(d.paymentReferenceLabel, 'Payment Reference No.');
    });

    test('goods label without an item, and for unknown or missing types', () {
      expect(_goods(goodsItem: null).goodsLabel, 'Food');
      expect(_goods(goodsItem: '   ').goodsLabel, 'Food');
      expect(
        Donation.fromJson(
          _goodsJson(goodsType: 'toys', goodsItem: 'Teddy bears'),
        ).goodsLabel,
        'Other — Teddy bears',
      );
      expect(Donation.fromJson(_donationJson()).goodsLabel, 'Goods');
    });

    test('only a pledged goods donation can be edited or cancelled', () {
      expect(_goods().canModify, isTrue);
      expect(_goods(status: 'AWAITING_PICKUP').canModify, isFalse);
      expect(_goods(status: 'CANCELLED').canModify, isFalse);
      expect(_money().canModify, isFalse);
      expect(_goods(status: 'CANCELLED').isCancelled, isTrue);
      expect(_goods(status: 'DECLINED').isDeclined, isTrue);
      expect(_goods(status: 'CONFIRMED').isComplete, isTrue);
    });

    test('a sparse row gets safe defaults', () {
      final d = Donation.fromJson({'donation_id': 'x', 'event_id': 7});
      expect(d.kind, DonationKind.money);
      expect(d.status, DonationStatus.pledged);
      expect(d.reference, '');
      expect(d.amount, 0);
      expect(d.trail, isEmpty);
      expect(d.deliveryDate, isNull);
      expect(d.deliveryDateLabel, isNull);
    });
  });

  group('DonationPayment and payment methods', () {
    test('a pending QR Ph checkout', () {
      final p = DonationPayment.fromJson(
        _paymentJson(qr: _qrString, expiresAt: '2031-03-10T02:00:00.000Z'),
      );
      expect(p.id, 'pay-1');
      expect(p.campaignId, 'event-42');
      expect(p.method, DonationPaymentMethod.qrph);
      expect(p.status, DonationPaymentStatus.pending);
      expect(p.qrString, _qrString);
      expect(p.checkoutUrl, isNull);
      expect(p.expiresAt, isNotNull);
      expect(p.donationId, isNull);
      expect(p.receiptReference, 'CARES-DON-000123');
    });

    test('once paid the gateway id becomes the receipt number', () {
      final p = DonationPayment.fromJson(
        _paymentJson(
          status: 'PAID',
          paymentReference: 'xnd_pay_123',
          donationId: 'don-1',
        ),
      );
      expect(p.receiptReference, 'xnd_pay_123');
      expect(p.donationId, 'don-1');
    });

    test('availability: methods, limits and the receiving account', () {
      final a = PaymentMethodAvailability.fromJson(_methodsJson());
      expect(a.acceptingPayments, isTrue);
      expect(a.methods.map((m) => m.method), [
        DonationPaymentMethod.gcash,
        DonationPaymentMethod.qrph,
        DonationPaymentMethod.card,
      ]);
      expect(a.supportEmail, 'cares@uclm.edu.ph');

      final card = a.forMethod(DonationPaymentMethod.card)!;
      expect(card.accepts(999), isFalse);
      expect(card.accepts(1000), isTrue);
      expect(card.accepts(100000), isTrue);
      expect(card.accepts(100001), isFalse);
      expect(
        a.forMethod(DonationPaymentMethod.gcash)!.accountNumber,
        '0917 000 0000',
      );
      expect(a.forMethod(DonationPaymentMethod.bank), isNull);
    });

    test('availability when CARES is not accepting payments', () {
      final a = PaymentMethodAvailability.fromJson(
        _methodsJson(accepting: false),
      );
      expect(a.acceptingPayments, isFalse);
      expect(a.methods, isEmpty);
      expect(
        PaymentMethodAvailability.fromJson(const {}).acceptingPayments,
        isFalse,
      );
      const none = PaymentMethodAvailability.unavailable();
      expect(none.acceptingPayments, isFalse);
      expect(none.methods, isEmpty);
    });
  });

  group('GoodsPledgeInput', () {
    test('sends the item trimmed and the delivery day as yyyy-MM-dd', () {
      final input = GoodsPledgeInput(
        goodsType: 'food',
        goodsItem: '  5kg bags of rice ',
        quantity: 3,
        contactNumber: '09171234567',
        deliveryDate: DateTime(2031, 3, 12, 15, 30),
      );
      expect(input.toJson(), {
        'goodsType': 'food',
        'goodsItem': '5kg bags of rice',
        'quantity': 3,
        'contactNumber': '09171234567',
        'deliveryDate': '2031-03-12',
      });
    });

    test('a missing or blank item is left out', () {
      for (final item in [null, '', '   ']) {
        final input = GoodsPledgeInput(
          goodsType: 'clothing',
          goodsItem: item,
          quantity: 1,
          contactNumber: '09171234567',
          deliveryDate: DateTime(2031, 3, 12),
        );
        expect(
          input.toJson().containsKey('goodsItem'),
          isFalse,
          reason: '$item',
        );
      }
    });
  });

  group('DonationCampaign', () {
    test('figures and labels come off the event', () {
      final c = _campaign();
      expect(c.id, 'event-42');
      expect(c.eventId, 42);
      expect(c.title, _campaignTitle);
      expect(c.organization, 'UCLM CARES Office');
      expect(c.acceptedDonationsLabel, 'Money & goods');
      expect(c.neededGoods.map((g) => g.id), ['food', 'clothing']);
      expect(c.raisedLabel, '₱13k');
      expect(c.fundingSummaryLabel, '₱13k raised');
      expect(c.compactFundingLabel, '₱13k raised');
      expect(c.donorsLabel, '3 donations');
      expect(c.eventDateLabel, DonationFormat.dateOnly(c.eventDate));
      expect(
        c.formattedDeadline,
        '${c.eventDate.month}/${c.eventDate.day}/${c.eventDate.year}',
      );
      expect(c.countdownLeftLabel, '${c.daysLeft}d left');
      expect(c.daysLeft, greaterThan(0));
    });

    test('labels for single-kind and closed campaigns', () {
      expect(_campaign(goods: false).acceptedDonationsLabel, 'Money');
      final goodsOnly = _campaign(funds: false);
      expect(goodsOnly.acceptedDonationsLabel, 'Goods');
      expect(goodsOnly.fundingSummaryLabel, 'Accepts goods donations');
      expect(goodsOnly.compactFundingLabel, 'Goods');
      expect(
        _campaign(funds: false, goods: false).acceptedDonationsLabel,
        'None',
      );
      final one = DonationCampaign(
        RecommendedEvent.fromJson(_eventJson(donations: 1)),
      );
      expect(one.donorsLabel, '1 donation');
    });

    test('a past event shows 0 days left', () {
      final past = DonationCampaign(
        RecommendedEvent.fromJson(
          _eventJson(startsAt: '2020-01-01T00:00:00.000Z'),
        ),
      );
      expect(past.daysLeft, 0);
      expect(past.countdownLabel, '0d');
    });

    test('goods types: catalog order, "other" offered separately', () {
      final c = _campaign(goodsTypes: ['hygiene', 'other', 'food']);
      expect(c.neededGoods.map((g) => g.id), ['food', 'hygiene']);
      expect(GoodsTypes.byId('nope').id, 'other');
      expect(GoodsTypes.labelOf(null), 'Goods');
      expect(GoodsTypes.labelOf('medicine'), 'Medicine');
    });

    test('category and search matching', () {
      final c = _campaign();
      expect(c.matchesCategory('All'), isTrue);
      expect(c.matchesCategory('disaster relief'), isTrue);
      expect(c.matchesCategory('Education'), isFalse);
      expect(c.matchesQuery(''), isTrue);
      expect(c.matchesQuery('  odette '), isTrue);
      expect(c.matchesQuery('uclm'), isTrue);
      expect(c.matchesQuery('lapu-lapu'), isTrue);
      expect(c.matchesQuery('clothing'), isTrue);
      expect(c.matchesQuery('books'), isFalse);
    });

    test('category list and search suggestions', () {
      final campaigns = [
        _campaign(),
        DonationCampaign(
          RecommendedEvent.fromJson(
            _eventJson(
              id: 43,
              title: 'Back-to-School Book Drive',
              category: 'Education',
              goodsTypes: ['books'],
            ),
          ),
        ),
        DonationCampaign(
          RecommendedEvent.fromJson(
            _eventJson(
              id: 44,
              title: 'Flood Relief',
              category: 'Disaster Relief',
            ),
          ),
        ),
        DonationCampaign(
          RecommendedEvent.fromJson(_eventJson(id: 45, category: ' ')),
        ),
      ];
      expect(campaignCategories(campaigns), [
        'All',
        'Disaster Relief',
        'Education',
      ]);
      expect(campaignSearchSuggestions(campaigns, ' '), isEmpty);
      expect(campaignSearchSuggestions(campaigns, 'relief'), [
        _campaignTitle,
        'Disaster Relief',
        'Flood Relief',
      ]);
      expect(campaignSearchSuggestions(campaigns, 'book'), [
        'Back-to-School Book Drive',
        'Books',
      ]);
      expect(
        campaignSearchSuggestions(campaigns, 'o').length,
        lessThanOrEqualTo(5),
      );
    });
  });

  group('DonorSummary', () {
    test('only confirmed pesos count; cancelled and declined drop out', () {
      final summary = DonorSummary.of([
        Donation.fromJson(
          _donationJson(id: 'a', status: 'CONFIRMED', amount: 1000),
        ),
        Donation.fromJson(
          _donationJson(id: 'b', status: 'PLEDGED', amount: 250),
        ),
        Donation.fromJson(
          _donationJson(id: 'c', status: 'CANCELLED', amount: 900),
        ),
        Donation.fromJson(
          _donationJson(id: 'd', status: 'DECLINED', amount: 400),
        ),
        Donation.fromJson({
          ..._donationJson(id: 'e', status: 'CONFIRMED', amount: 300),
          'event_id': 43,
        }),
      ]);
      expect(summary.confirmedAmount, 1300);
      expect(summary.donations, 3);
      expect(summary.campaigns, 2);
      expect(DonorSummary.of(const []).donations, 0);
    });
  });

  // =========================================================================
  // Services
  // =========================================================================

  group('DonationService', () {
    DonationService service() =>
        DonationService(apiClient: ApiClient(client: server.client()));

    setUp(() => AuthSession.setAccessToken('jwt.donor'));

    test('fetchCampaigns reads the open donation events', () async {
      server.routes['GET /v1/events/donations'] = (_) async => _ok({
        'events': [_eventJson(), _eventJson(id: 43, title: 'Book Drive')],
      });

      final campaigns = await service().fetchCampaigns();

      expect(campaigns.map((c) => c.id), ['event-42', 'event-43']);
      final request = server.requests.single;
      expect(request.url.toString(), '$_origin/v1/events/donations');
      expect(request.headers['authorization'], 'Bearer jwt.donor');
    });

    test('fetchCampaigns and fetchMine read an empty reply as none', () async {
      server.routes['GET /v1/events/donations'] = (_) async => _ok({});
      server.routes['GET /v1/donations/me'] = (_) async => _ok({});

      expect(await service().fetchCampaigns(), isEmpty);
      expect(await service().fetchMine(), isEmpty);
    });

    test('fetchMine reads the ledger in server order', () async {
      server.routes['GET /v1/donations/me'] = (_) async => _ok({
        'items': [_donationJson(id: 'don-2'), _goodsJson()],
      });

      final mine = await service().fetchMine();

      expect(mine.map((d) => d.id), ['don-2', 'don-1']);
      expect(mine.last.isGoods, isTrue);
    });

    test('fetchDonation reads one row', () async {
      server.routes['GET $_donationPath'] = (_) async =>
          _ok(_donationJson(status: 'CONFIRMED'));

      final d = await service().fetchDonation('don-1');

      expect(d.isComplete, isTrue);
      expect(server.requests.single.url.path, _donationPath);
    });

    test('pledgeGoods posts the event and the pledge', () async {
      final d = await service().pledgeGoods(
        eventId: 42,
        input: GoodsPledgeInput(
          goodsType: 'food',
          goodsItem: '5kg bags of rice',
          quantity: 3,
          contactNumber: '09171234567',
          deliveryDate: DateTime(2031, 3, 12),
        ),
      );

      final request = server.where('POST', _goodsPath).single;
      expect(_bodyOf(request), {
        'eventId': 42,
        'goodsType': 'food',
        'goodsItem': '5kg bags of rice',
        'quantity': 3,
        'contactNumber': '09171234567',
        'deliveryDate': '2031-03-12',
      });
      expect(d.status, DonationStatus.pledged);
      expect(d.goodsLabel, 'Food — 5kg bags of rice');
    });

    test('updateGoods patches without an event id', () async {
      await service().updateGoods(
        'don-1',
        GoodsPledgeInput(
          goodsType: 'clothing',
          goodsItem: null,
          quantity: 5,
          contactNumber: '09181112222',
          deliveryDate: DateTime(2031, 3, 13),
        ),
      );

      final request = server.where('PATCH', _donationGoodsPath).single;
      expect(_bodyOf(request), {
        'goodsType': 'clothing',
        'quantity': 5,
        'contactNumber': '09181112222',
        'deliveryDate': '2031-03-13',
      });
    });

    test('cancel posts an empty body and returns the cancelled row', () async {
      final d = await service().cancel('don-1');

      expect(_bodyOf(server.where('POST', _cancelPath).single), isEmpty);
      expect(d.isCancelled, isTrue);
    });

    test('a refusal surfaces the server message', () async {
      server.routes['POST $_cancelPath'] = (_) async =>
          _fail(409, 'CARES has already started receiving this donation.');

      await expectLater(
        service().cancel('don-1'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 409)
              .having(
                (e) => e.message,
                'message',
                'CARES has already started receiving this donation.',
              ),
        ),
      );
    });
  });

  group('DonationPaymentService', () {
    DonationPaymentService service() =>
        DonationPaymentService(apiClient: ApiClient(client: server.client()));

    setUp(() => AuthSession.setAccessToken('jwt.donor'));

    test('createPayment sends the idempotency key and the checkout', () async {
      final p = await service().createPayment(
        idempotencyKey: 'key-123',
        campaignId: 'event-42',
        campaignTitle: _campaignTitle,
        amount: 750,
        method: DonationPaymentMethod.gcash,
        eventId: 42,
      );

      final request = server.where('POST', _paymentsPath).single;
      expect(request.headers['idempotency-key'], 'key-123');
      expect(request.headers['authorization'], 'Bearer jwt.donor');
      expect(_bodyOf(request), {
        'campaignId': 'event-42',
        'campaignTitle': _campaignTitle,
        'amount': 750,
        'method': 'GCASH',
        'eventId': 42,
      });
      expect(p.checkoutUrl, _gcashUrl);
      expect(p.status, DonationPaymentStatus.pending);
    });

    test('createPayment leaves out a missing event id', () async {
      await service().createPayment(
        idempotencyKey: 'key-123',
        campaignId: 'general',
        campaignTitle: 'General fund',
        amount: 100,
        method: DonationPaymentMethod.bank,
      );

      final body = _bodyOf(server.where('POST', _paymentsPath).single);
      expect(body.containsKey('eventId'), isFalse);
      expect(body['method'], 'BANK_TRANSFER');
    });

    test('createPayment refusal carries the server message', () async {
      server.routes['POST $_paymentsPath'] = (_) async =>
          _fail(400, 'Amount is above the QR Ph limit.');

      await expectLater(
        service().createPayment(
          idempotencyKey: 'k',
          campaignId: 'event-42',
          campaignTitle: _campaignTitle,
          amount: 60000,
          method: DonationPaymentMethod.qrph,
        ),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            'Amount is above the QR Ph limit.',
          ),
        ),
      );
    });

    test('fetchAvailableMethods and fetchPayment', () async {
      server.paymentReplies([
        _paymentJson(status: 'PAID', donationId: 'don-1'),
      ]);

      final methods = await service().fetchAvailableMethods();
      final payment = await service().fetchPayment('pay-1');

      expect(methods.methods, hasLength(3));
      expect(server.requests.first.url.path, _methodsPath);
      expect(payment.status, DonationPaymentStatus.paid);
      expect(server.requests.last.url.path, _paymentPath);
    });

    test('newIdempotencyKey is a fresh v4 UUID each time', () {
      final keys = {
        for (var i = 0; i < 50; i++) DonationPaymentService.newIdempotencyKey(),
      };
      expect(keys, hasLength(50));
      final uuid = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      );
      expect(keys.every(uuid.hasMatch), isTrue);
    });
  });

  // =========================================================================
  // Flow — choosing how to give
  // =========================================================================

  group('DonationFlowScreen — start', () {
    flowTest('asks money or goods when the event takes both', (tester) async {
      await _openFlow(tester, campaign: _campaign());

      expect(_title, 'Donate');
      expect(find.text('How would you like to help?'), findsOneWidget);
      expect(find.text('Money'), findsOneWidget);
      expect(find.text('Goods'), findsOneWidget);
      expect(_enabled(tester, 'Continue'), isFalse);
      expect(find.text('Step 1 of 4'), findsOneWidget);

      await _tapText(tester, 'Goods');
      expect(_enabled(tester, 'Continue'), isTrue);
      await _tap(tester, 'Continue');
      expect(_title, 'Select Goods');
    });

    flowTest('a money-only event opens on the amount', (tester) async {
      await _openFlow(tester, campaign: _campaign(goods: false));

      expect(_title, 'Donation Amount');
      // No type step, so the progress counts one step fewer.
      expect(find.text('Step 1 of 3'), findsOneWidget);
      expect(find.text('How would you like to help?'), findsNothing);
    });

    flowTest('a goods-only event opens on the goods list', (tester) async {
      await _openFlow(tester, campaign: _campaign(funds: false));

      expect(_title, 'Select Goods');
      expect(find.text('Food'), findsOneWidget);
      expect(find.text('Clothing'), findsOneWidget);
      expect(find.text('Other'), findsOneWidget);
    });

    flowTest('close on the first step leaves the flow', (tester) async {
      final outcome = await _openFlow(tester, campaign: _campaign());

      await tester.tap(find.byIcon(Icons.close_rounded));
      await tester.pumpAndSettle();

      expect(find.byType(DonationFlowScreen), findsNothing);
      expect(outcome.closed, isTrue);
    });

    flowTest('back walks the steps in reverse', (tester) async {
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);

      for (final title in ['Payment Method', 'Donation Amount', 'Donate']) {
        await tester.tap(find.byIcon(Icons.arrow_back_rounded));
        await _settle(tester);
        expect(_title, title);
      }
    });
  });

  // =========================================================================
  // Flow — money amount and method
  // =========================================================================

  group('DonationFlowScreen — amount', () {
    flowTest('₱500 is preselected and presets replace it', (tester) async {
      await _openFlow(tester, campaign: _campaign(goods: false));

      for (final label in ['₱100', '₱250', '₱1,000']) {
        expect(find.text(label), findsOneWidget);
      }
      expect(find.text('₱500'), findsNWidgets(2)); // chip + total
      expect(_enabled(tester, 'Continue'), isTrue);

      await _tapText(tester, '₱1,000');
      expect(find.text('₱1,000'), findsNWidgets(2));
      expect(find.text('₱500'), findsOneWidget);
    });

    flowTest('a custom amount wins, digits only', (tester) async {
      await _openFlow(tester, campaign: _campaign(goods: false));

      await tester.enterText(_field('Enter amount'), '1,2a50');
      await tester.pump();

      expect(
        tester.widget<TextField>(_field('Enter amount')).controller!.text,
        '1250',
      );
      expect(find.text('₱1,250'), findsOneWidget);

      // Picking a preset clears the custom amount.
      await _tapText(tester, '₱250');
      expect(
        tester.widget<TextField>(_field('Enter amount')).controller!.text,
        isEmpty,
      );
      expect(find.text('₱250'), findsNWidgets(2));
    });

    flowTest('a custom amount of 0 falls back to the preset', (tester) async {
      await _openFlow(tester, campaign: _campaign(goods: false));

      await tester.enterText(_field('Enter amount'), '0');
      await tester.pump();

      expect(find.text('₱500'), findsWidgets);
      expect(_enabled(tester, 'Continue'), isTrue);
    });
  });

  group('DonationFlowScreen — payment method', () {
    flowTest('offers only what the director enabled', (tester) async {
      await _openFlow(tester, campaign: _campaign(goods: false));
      await _tap(tester, 'Continue');

      expect(_title, 'Payment Method');
      expect(server.where('GET', _methodsPath), hasLength(1));
      expect(find.text('GCash'), findsOneWidget);
      expect(find.text('QR Ph'), findsOneWidget);
      expect(find.text('Credit/Debit Card'), findsOneWidget);
      expect(find.text('Bank Transfer'), findsNothing);
      expect(find.text('GCash — as set by the director'), findsOneWidget);
      expect(_enabled(tester, 'Continue'), isFalse);
    });

    flowTest('a method whose limits rule out the amount is greyed out', (
      tester,
    ) async {
      await _openFlow(tester, campaign: _campaign(goods: false));
      await _tap(tester, 'Continue'); // ₱500, card needs ₱1,000+

      expect(find.text('Accepts ₱1,000 to ₱100,000'), findsOneWidget);
      await _tapText(tester, 'Credit/Debit Card');
      expect(_enabled(tester, 'Continue'), isFalse);

      await _tapText(tester, 'GCash');
      expect(_enabled(tester, 'Continue'), isTrue);
    });

    flowTest('says so when CARES is not taking online payments', (
      tester,
    ) async {
      server.routes['GET $_methodsPath'] = (_) async =>
          _ok(_methodsJson(accepting: false));
      await _openFlow(tester, campaign: _campaign(goods: false));
      await _tap(tester, 'Continue');

      expect(
        find.textContaining('CARES is not accepting online payments'),
        findsOneWidget,
      );
      expect(_enabled(tester, 'Continue'), isFalse);
    });

    flowTest('a load failure shows the message and can retry', (tester) async {
      server.routes['GET $_methodsPath'] = (_) async =>
          _fail(503, 'Payments are under maintenance.');
      await _openFlow(tester, campaign: _campaign(goods: false));
      await _tap(tester, 'Continue');

      expect(find.text('Payments are under maintenance.'), findsOneWidget);

      server.routes['GET $_methodsPath'] = (_) async => _ok(_methodsJson());
      await _tap(tester, 'Try again');

      expect(server.where('GET', _methodsPath), hasLength(2));
      expect(find.text('GCash'), findsOneWidget);
    });

    flowTest('review shows the amount, method and who is paid', (tester) async {
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester, method: 'GCash');

      expect(_row(tester, 'Campaign'), _campaignTitle);
      expect(_row(tester, 'Donation Type'), 'Money');
      expect(_row(tester, 'Amount'), '₱500');
      expect(_row(tester, 'Payment Method'), 'GCash');
      expect(_row(tester, 'Paid To'), 'CARES — UCLM · 0917 000 0000');
      expect(server.where('POST', _paymentsPath), isEmpty); // not charged yet
    });

    flowTest('review without a recorded account has no "Paid To"', (
      tester,
    ) async {
      server.routes['GET $_methodsPath'] = (_) async => _ok({
        'accepting_payments': true,
        'items': [_methodJson('QRPH', 'QR Ph')],
      });
      await _openFlow(tester, campaign: _campaign(goods: false));
      await _toReview(tester, chooseType: false);

      expect(find.text('Paid To'), findsNothing);
    });
  });

  // =========================================================================
  // Flow — checkout
  // =========================================================================

  group('DonationFlowScreen — QR Ph checkout', () {
    flowTest('opens a checkout and shows the code to scan', (tester) async {
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);

      await _tap(tester, 'Proceed to Payment');

      final request = server.where('POST', _paymentsPath).single;
      expect(request.headers['idempotency-key'], isNotEmpty);
      expect(_bodyOf(request), {
        'campaignId': 'event-42',
        'campaignTitle': _campaignTitle,
        'amount': 500,
        'method': 'QRPH',
        'eventId': 42,
      });
      expect(_title, 'QR Ph');
      expect(find.text('Scan to pay'), findsOneWidget);
      expect(find.text('Reference: CARES-DON-000123'), findsOneWidget);
      expect(launcher.opened, isEmpty); // nothing opens outside the app
    });

    flowTest('polls every 4 seconds while the checkout is open', (
      tester,
    ) async {
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      expect(server.where('GET', _paymentPath), isEmpty);

      await tester.pump(const Duration(seconds: 4));
      await tester.pump();
      expect(server.where('GET', _paymentPath), hasLength(1));

      await tester.pump(const Duration(seconds: 4));
      await tester.pump();
      expect(server.where('GET', _paymentPath), hasLength(2));
      expect(find.text('Scan to pay'), findsOneWidget);
    });

    flowTest('paid → reference, then the pledged donation', (tester) async {
      server.paymentReplies([
        _paymentJson(
          status: 'PAID',
          paymentReference: 'xnd_pay_123',
          donationId: 'don-1',
        ),
      ]);
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');

      await _tapText(tester, "I've paid — check status");

      expect(_title, 'Payment');
      expect(find.text('Payment Completed'), findsOneWidget);
      expect(find.textContaining('₱500 was paid via QR Ph.'), findsOneWidget);
      expect(find.text('QR Ph Reference No.'), findsOneWidget);
      expect(find.text('xnd_pay_123'), findsOneWidget);

      await _tap(tester, 'Continue');

      expect(server.where('GET', _donationPath), hasLength(1));
      expect(_title, 'Donation Details');
      expect(find.text('Donation Pledged'), findsOneWidget);
      expect(_row(tester, 'Amount'), '₱500');
      expect(_row(tester, 'Payment Method'), 'QR Ph');
      expect(_row(tester, 'QR Ph Reference No.'), 'xnd_pay_123');
      expect(_row(tester, 'Donation ID'), 'DN-0007');
      expect(_row(tester, 'Status'), 'PLEDGED');
      expect(
        find.textContaining('A CARES Director will verify your payment.'),
        findsOneWidget,
      );
    });

    flowTest('waits for the ledger row when the callback is late', (
      tester,
    ) async {
      server.paymentReplies([
        _paymentJson(status: 'PAID', paymentReference: 'xnd_pay_123'),
        _paymentJson(status: 'PAID', paymentReference: 'xnd_pay_123'),
        _paymentJson(
          status: 'PAID',
          paymentReference: 'xnd_pay_123',
          donationId: 'don-1',
        ),
      ]);
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await _tapText(tester, "I've paid — check status");

      await tester.tap(_button('Continue'));
      await tester.pump();
      expect(find.text('Payment Completed'), findsOneWidget);

      await tester.pump(const Duration(seconds: 2)); // no row yet
      await tester.pump(const Duration(seconds: 2)); // row is there
      await _settle(tester);

      expect(server.where('GET', _paymentPath), hasLength(3));
      expect(find.text('Donation Pledged'), findsOneWidget);
    });

    flowTest('gives up on the ledger row after 30 seconds and leaves', (
      tester,
    ) async {
      server.paymentReplies([
        _paymentJson(status: 'PAID', paymentReference: 'xnd_pay_123'),
      ]);
      final outcome = await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await _tapText(tester, "I've paid — check status");

      await tester.tap(_button('Continue'));
      for (var i = 0; i < 16; i++) {
        await tester.pump(const Duration(seconds: 2));
      }
      await tester.pumpAndSettle();

      // 1 check + 15 waits for the row.
      expect(server.where('GET', _paymentPath), hasLength(16));
      expect(server.where('GET', _donationPath), isEmpty);
      expect(
        find.text(
          'Your payment went through. The donation will appear in your '
          'activity shortly.',
        ),
        findsOneWidget,
      );
      expect(outcome.closed, isTrue);
    });

    flowTest('a declined payment explains and offers another try', (
      tester,
    ) async {
      server.paymentReplies([
        _paymentJson(status: 'FAILED', failureReason: 'Insufficient balance.'),
      ]);
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      final firstKey = server
          .where('POST', _paymentsPath)
          .single
          .headers['idempotency-key'];

      await _tapText(tester, "I've paid — check status");

      expect(find.text('Payment not completed'), findsOneWidget);
      expect(find.text('Insufficient balance.'), findsOneWidget);
      expect(find.text('Back to campaign'), findsOneWidget);

      await _tap(tester, 'Try again');
      expect(_title, 'Payment Method');

      await _tapText(tester, 'QR Ph');
      await _tap(tester, 'Continue');
      await _tap(tester, 'Proceed to Payment');

      final keys = server
          .where('POST', _paymentsPath)
          .map((r) => r.headers['idempotency-key'])
          .toList();
      expect(keys, hasLength(2));
      expect(keys.last, isNot(firstKey)); // a failed attempt needs a new key
    });

    flowTest('a failure without a reason gets the default message', (
      tester,
    ) async {
      server.paymentReplies([_paymentJson(status: 'FAILED')]);
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await _tapText(tester, "I've paid — check status");

      expect(
        find.text('The payment was declined or cancelled. No money was taken.'),
        findsOneWidget,
      );
    });

    flowTest('an expired checkout reads "Checkout expired"', (tester) async {
      server.paymentReplies([_paymentJson(status: 'EXPIRED')]);
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await _tapText(tester, "I've paid — check status");

      expect(find.text('Checkout expired'), findsOneWidget);
      expect(
        find.text(
          'The checkout expired before it was paid. No money was taken.',
        ),
        findsOneWidget,
      );
    });

    flowTest('a pending checkout past its expiry is closed locally', (
      tester,
    ) async {
      final past = DateTime.now()
          .subtract(const Duration(minutes: 1))
          .toUtc()
          .toIso8601String();
      server.paymentReplies([_paymentJson(qr: _qrString, expiresAt: past)]);
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await _tapText(tester, "I've paid — check status");

      expect(find.text('Checkout expired'), findsOneWidget);
      expect(
        find.text('The checkout expired before it was paid.'),
        findsOneWidget,
      );
    });

    flowTest('a 404 on the status check ends the checkout', (tester) async {
      server.routes['GET $_paymentPath'] = (_) async =>
          _fail(404, 'Payment not found.');
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await _tapText(tester, "I've paid — check status");

      expect(find.text('Payment not completed'), findsOneWidget);
      expect(find.text('Payment not found.'), findsOneWidget);
    });

    flowTest('other status-check errors just wait for the next tick', (
      tester,
    ) async {
      server.routes['GET $_paymentPath'] = (_) async =>
          _fail(503, 'Gateway busy.');
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await _tapText(tester, "I've paid — check status");

      expect(find.text('Scan to pay'), findsOneWidget);
      expect(find.text('Gateway busy.'), findsNothing);
    });

    flowTest('the server refusing the checkout shows its reason', (
      tester,
    ) async {
      server.routes['POST $_paymentsPath'] = (_) async =>
          _fail(400, 'Amount is above the QR Ph limit.');
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);

      await _tap(tester, 'Proceed to Payment');

      expect(find.text('Payment not completed'), findsOneWidget);
      expect(find.text('Amount is above the QR Ph limit.'), findsOneWidget);
    });

    flowTest('going back from the checkout reuses the same attempt key', (
      tester,
    ) async {
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');

      await tester.tap(find.byIcon(Icons.arrow_back_rounded));
      await _settle(tester);
      expect(_title, 'Review Donation');

      await _tap(tester, 'Proceed to Payment');

      final keys = server
          .where('POST', _paymentsPath)
          .map((r) => r.headers['idempotency-key'])
          .toSet();
      expect(server.where('POST', _paymentsPath), hasLength(2));
      expect(keys, hasLength(1));
    });

    flowTest('changing the method after going back mints a new key', (
      tester,
    ) async {
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester);
      await _tap(tester, 'Proceed to Payment');
      await tester.tap(find.byIcon(Icons.arrow_back_rounded)); // review
      await _settle(tester);
      await tester.tap(find.byIcon(Icons.arrow_back_rounded)); // method
      await _settle(tester);

      await _tapText(tester, 'GCash');
      await _tap(tester, 'Continue');
      await _tap(tester, 'Proceed to Payment');

      final keys = server
          .where('POST', _paymentsPath)
          .map((r) => r.headers['idempotency-key'])
          .toSet();
      expect(keys, hasLength(2));
    });
  });

  group('DonationFlowScreen — GCash checkout', () {
    flowTest('opens GCash outside the app and waits', (tester) async {
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester, method: 'GCash');

      await _tap(tester, 'Proceed to Payment');

      expect(
        _bodyOf(server.where('POST', _paymentsPath).single)['method'],
        'GCASH',
      );
      expect(launcher.opened, [_gcashUrl]);
      expect(_title, 'GCash');
      expect(find.text('Finish paying in GCash'), findsOneWidget);

      await _tap(tester, 'Open GCash');
      expect(launcher.opened, [_gcashUrl, _gcashUrl]);
    });

    flowTest('says so when the payment page cannot be opened', (tester) async {
      launcher.succeeds = false;
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester, method: 'GCash');

      await _tap(tester, 'Proceed to Payment');

      expect(find.text('Could not open the payment page.'), findsOneWidget);
      expect(find.text('Finish paying in GCash'), findsOneWidget);
    });

    flowTest('paid shows the GCash reference label', (tester) async {
      server.paymentReplies([
        _paymentJson(
          method: 'GCASH',
          status: 'PAID',
          paymentReference: 'gc_778899',
          donationId: 'don-1',
        ),
      ]);
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester, method: 'GCash');
      await _tap(tester, 'Proceed to Payment');

      await _tapText(tester, "I've paid — check status");

      expect(find.text('GCash Reference No.'), findsOneWidget);
      expect(find.text('gc_778899'), findsOneWidget);
    });

    flowTest('a checkout that is already settled skips the hand-off', (
      tester,
    ) async {
      server.routes['POST $_paymentsPath'] = (_) async => _ok(
        _paymentJson(
          method: 'GCASH',
          status: 'PAID',
          paymentReference: 'gc_778899',
          donationId: 'don-1',
        ),
      );
      await _openFlow(tester, campaign: _campaign());
      await _toReview(tester, method: 'GCash');

      await _tap(tester, 'Proceed to Payment');

      expect(launcher.opened, isEmpty);
      expect(find.text('Payment Completed'), findsOneWidget);
    });
  });

  // =========================================================================
  // Flow — goods pledge
  // =========================================================================

  group('DonationFlowScreen — goods pledge', () {
    flowTest('picking a listed good asks for optional details and quantity', (
      tester,
    ) async {
      await _openFlow(tester, campaign: _campaign(funds: false));
      expect(_enabled(tester, 'Continue'), isFalse);

      await _tapText(tester, 'Food');

      expect(find.text('Details (optional)'), findsOneWidget);
      expect(find.text('Quantity'), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(_enabled(tester, 'Continue'), isTrue);

      // Quantity never drops below 1.
      final minus = find.ancestor(
        of: find.byIcon(Icons.remove_rounded),
        matching: find.byType(IconButton),
      );
      expect(tester.widget<IconButton>(minus).onPressed, isNull);
      await tester.tap(find.byIcon(Icons.add_rounded));
      await tester.pump();
      await tester.tap(find.byIcon(Icons.add_rounded));
      await tester.pump();
      expect(find.text('3'), findsOneWidget);
      expect(tester.widget<IconButton>(minus).onPressed, isNotNull);
    });

    flowTest('"Other" requires the item to be named', (tester) async {
      await _openFlow(tester, campaign: _campaign(funds: false));

      await _tapText(tester, 'Other');

      expect(find.text('Item'), findsOneWidget);
      expect(_field('What would you like to donate?'), findsOneWidget);
      expect(_enabled(tester, 'Continue'), isFalse);

      await tester.enterText(_field('What would you like to donate?'), '   ');
      await tester.pump();
      expect(_enabled(tester, 'Continue'), isFalse);

      await tester.enterText(
        _field('What would you like to donate?'),
        'Blankets',
      );
      await tester.pump();
      expect(_enabled(tester, 'Continue'), isTrue);
    });

    flowTest('delivery needs a contact number and a date', (tester) async {
      await _openFlow(tester, campaign: _campaign(funds: false));
      await _tapText(tester, 'Clothing');
      await _tap(tester, 'Continue');

      expect(_title, 'Delivery Details');
      expect(find.text('Deliver your donation to CARES'), findsOneWidget);
      expect(find.text('CARES Drop-Off Location'), findsOneWidget);
      expect(_enabled(tester, 'Continue'), isFalse);

      await tester.enterText(_field('09XX XXX XXXX'), '0917-123-4567 ext');
      await tester.pump();
      expect(
        tester.widget<TextField>(_field('09XX XXX XXXX')).controller!.text,
        '09171234567',
      );
      expect(_enabled(tester, 'Continue'), isFalse);

      final date = await _pickTomorrow(tester);
      expect(find.text(DonationFormat.dateOnly(date)), findsOneWidget);
      expect(_enabled(tester, 'Continue'), isTrue);
    });

    flowTest('review lists the pledge, then Pledge files it', (tester) async {
      await _openFlow(tester, campaign: _campaign(funds: false));
      final date = await _toGoodsReview(tester);

      expect(_title, 'Review Donation');
      expect(_row(tester, 'Campaign'), _campaignTitle);
      expect(_row(tester, 'Donation Type'), 'Goods');
      expect(_row(tester, 'Item'), 'Food — 5kg bags of rice');
      expect(_row(tester, 'Quantity'), '2');
      expect(_row(tester, 'Fulfillment'), 'Drop-off at CARES Office');
      expect(_row(tester, 'Drop-Off Location'), CaresOffice.fullAddress);
      expect(_row(tester, 'Contact Number'), '0917 1234 5');
      expect(_row(tester, 'Delivery Date'), DonationFormat.dateOnly(date));
      expect(server.where('POST', _goodsPath), isEmpty);

      await _tap(tester, 'Pledge Donation');

      expect(_bodyOf(server.where('POST', _goodsPath).single), {
        'eventId': 42,
        'goodsType': 'food',
        'goodsItem': '5kg bags of rice',
        'quantity': 2,
        'contactNumber': '0917 1234 5',
        'deliveryDate': DonationFormat.isoDate(date),
      });
      expect(_title, 'Donation Details');
      expect(find.text('Donation Pledged'), findsOneWidget);
      expect(find.text('Edit Donation'), findsOneWidget);
      expect(find.text('Cancel Donation'), findsOneWidget);
    });

    flowTest('"Other" is pledged as goods type "other"', (tester) async {
      await _openFlow(tester, campaign: _campaign(funds: false));
      await _tapText(tester, 'Other');
      await tester.enterText(
        _field('What would you like to donate?'),
        ' Blankets ',
      );
      await tester.pump();
      await _tap(tester, 'Continue');
      await tester.enterText(_field('09XX XXX XXXX'), '09171234567');
      await tester.pump();
      await _pickTomorrow(tester);
      await _tap(tester, 'Continue');

      expect(_row(tester, 'Item'), 'Blankets');
      await _tap(tester, 'Pledge Donation');

      final body = _bodyOf(server.where('POST', _goodsPath).single);
      expect(body['goodsType'], 'other');
      expect(body['goodsItem'], 'Blankets');
      expect(body['quantity'], 1);
    });

    flowTest('a refused pledge keeps the review open', (tester) async {
      server.routes['POST $_goodsPath'] = (_) async =>
          _fail(422, 'This event is no longer accepting goods.');
      await _openFlow(tester, campaign: _campaign(funds: false));
      await _toGoodsReview(tester);

      await _tap(tester, 'Pledge Donation');

      expect(
        find.text('This event is no longer accepting goods.'),
        findsOneWidget,
      );
      expect(_title, 'Review Donation');
      expect(_enabled(tester, 'Pledge Donation'), isTrue);
    });

    flowTest('Pledge is locked while it is on the wire', (tester) async {
      final reply = Completer<http.Response>();
      server.routes['POST $_goodsPath'] = (_) => reply.future;
      await _openFlow(tester, campaign: _campaign(funds: false));
      await _toGoodsReview(tester);

      await tester.tap(_button('Pledge Donation'));
      await tester.pump();

      expect(find.text('Pledge Donation'), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byIcon(Icons.arrow_back_rounded), findsNothing);

      reply.complete(_ok(_goodsJson()));
      await _settle(tester);
      expect(find.text('Donation Pledged'), findsOneWidget);
      expect(server.where('POST', _goodsPath), hasLength(1));
    });
  });

  // =========================================================================
  // Flow — an existing donation
  // =========================================================================

  group('DonationFlowScreen — existing goods donation', () {
    flowTest('opens on its status and re-reads it', (tester) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      await _openFlow(tester, existing: _goods());

      expect(server.where('GET', _donationPath), hasLength(1));
      expect(_title, 'Donation Details');
      expect(find.text('Donation Pledged'), findsOneWidget);
      expect(_row(tester, 'Item'), 'Food — 5kg bags of rice');
      expect(_row(tester, 'Quantity'), '3');
      expect(_row(tester, 'Credited Value'), '₱0');
      expect(_row(tester, 'Delivery Date'), 'Mar 12, 2031');
      expect(_row(tester, 'Contact Number'), '09171234567');
      expect(_row(tester, 'Donation ID'), 'DN-0007');
      expect(_row(tester, 'Status'), 'PLEDGED');
    });

    flowTest('shows the director\'s latest move', (tester) async {
      server.routes['GET $_donationPath'] = (_) async =>
          _ok(_goodsJson(status: 'AWAITING_PICKUP'));
      await _openFlow(tester, existing: _goods());

      expect(find.text('Awaiting Drop-off'), findsWidgets);
      expect(find.textContaining('Locked — CARES has started'), findsOneWidget);
      expect(find.text('Edit Donation'), findsNothing);
      expect(find.text('Cancel Donation'), findsNothing);
    });

    flowTest('a failed re-read keeps what it had', (tester) async {
      server.routes['GET $_donationPath'] = (_) async =>
          _fail(500, 'Server error');
      await _openFlow(tester, existing: _goods());

      expect(find.text('Donation Pledged'), findsOneWidget);
      expect(find.text('Server error'), findsNothing);
    });

    for (final (status, heading, footer) in [
      ('VERIFYING', 'Verifying', 'being verified by the CARES team'),
      ('CONFIRMED', 'Donation Confirmed!', 'View Donation'),
      ('DECLINED', 'Donation Declined', 'Back to My Donations'),
      ('CANCELLED', 'Donation Cancelled', 'Back to My Donations'),
    ]) {
      flowTest('$status reads "$heading"', (tester) async {
        server.routes['GET $_donationPath'] = (_) async =>
            _ok(_goodsJson(status: status));
        await _openFlow(tester, existing: _goods(status: status));

        expect(find.text(heading), findsWidgets);
        expect(find.textContaining(footer), findsWidgets);
        expect(find.text('Edit Donation'), findsNothing);
      });
    }

    flowTest('cancel asks first; "Keep Donation" sends nothing', (
      tester,
    ) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      await _openFlow(tester, existing: _goods());

      await tester.tap(_button('Cancel Donation'));
      await tester.pumpAndSettle();

      expect(find.text('Cancel Donation?'), findsOneWidget);
      expect(find.text('Food — 5kg bags of rice'), findsWidgets);
      expect(find.text('Mar 12, 2031'), findsWidgets);

      await tester.tap(find.text('Keep Donation'));
      await tester.pumpAndSettle();

      expect(server.where('POST', _cancelPath), isEmpty);
      expect(find.text('Donation Pledged'), findsOneWidget);
    });

    flowTest('confirming cancels it', (tester) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      await _openFlow(tester, existing: _goods());

      await tester.tap(_button('Cancel Donation'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yes, Cancel Donation'));
      await _settle(tester);

      expect(server.where('POST', _cancelPath), hasLength(1));
      expect(find.text('Donation Cancelled'), findsOneWidget);
      expect(find.text('Back to My Donations'), findsOneWidget);
    });

    flowTest('a refused cancel shows why and keeps the donation', (
      tester,
    ) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      server.routes['POST $_cancelPath'] = (_) async =>
          _fail(409, 'CARES has already started receiving this donation.');
      await _openFlow(tester, existing: _goods());

      await tester.tap(_button('Cancel Donation'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yes, Cancel Donation'));
      await _settle(tester);

      expect(
        find.text('CARES has already started receiving this donation.'),
        findsOneWidget,
      );
      expect(find.text('Donation Pledged'), findsOneWidget);
    });

    flowTest('edit with its campaign keeps the listed good', (tester) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      tester.view.physicalSize = const Size(900, 2600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: DonationFlowScreen(
              campaign: _campaign(funds: false),
              existingDonation: _goods(),
            ),
          ),
        ),
      );
      await _settle(tester);

      await _tap(tester, 'Edit Donation');

      expect(_title, 'Edit Donation');
      expect(
        tester
            .widget<TextField>(_field('e.g. 5kg bags of rice'))
            .controller!
            .text,
        '5kg bags of rice',
      );
      expect(find.text('3'), findsOneWidget);

      await _tap(tester, 'Continue');
      expect(_title, 'Edit Delivery Details');
      expect(
        tester.widget<TextField>(_field('09XX XXX XXXX')).controller!.text,
        '09171234567',
      );
      expect(find.text('Mar 12, 2031'), findsOneWidget);

      await _tap(tester, 'Continue');
      expect(_title, 'Review Changes');
      expect(
        find.text('Confirm your updated donation details.'),
        findsOneWidget,
      );

      await _tap(tester, 'Save Changes');

      expect(_bodyOf(server.where('PATCH', _donationGoodsPath).single), {
        'goodsType': 'food',
        'goodsItem': '5kg bags of rice',
        'quantity': 3,
        'contactNumber': '09171234567',
        'deliveryDate': '2031-03-12',
      });
      expect(server.where('POST', _goodsPath), isEmpty);
      expect(
        find.text(
          'Donation Updated — your donation details have been successfully '
          'updated.',
        ),
        findsOneWidget,
      );
      expect(_title, 'Donation Details');
    });

    flowTest('edit opened from Activity (no campaign) re-files the good as '
        '"other"', (tester) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      await _openFlow(tester, existing: _goods());

      await _tap(tester, 'Edit Donation');

      // Without the campaign the app can't tell "food" is a listed need, so
      // the edit opens as "Other" with the note as the item…
      expect(find.text('Item'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(_field('What would you like to donate?'))
            .controller!
            .text,
        '5kg bags of rice',
      );

      await _tap(tester, 'Continue');
      await _tap(tester, 'Continue');
      await _tap(tester, 'Save Changes');

      // …and an unchanged save changes the goods type from food to other.
      expect(
        _bodyOf(server.where('PATCH', _donationGoodsPath).single)['goodsType'],
        'other',
      );
    });

    flowTest('back from editing returns to the status, unchanged', (
      tester,
    ) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      await _openFlow(tester, existing: _goods());
      await _tap(tester, 'Edit Donation');

      await tester.tap(find.byIcon(Icons.arrow_back_rounded));
      await _settle(tester);

      expect(_title, 'Donation Details');
      expect(server.where('PATCH', _donationGoodsPath), isEmpty);
    });

    flowTest('a refused edit keeps the review open', (tester) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_goodsJson());
      server.routes['PATCH $_donationGoodsPath'] = (_) async =>
          _fail(409, 'This donation can no longer be edited.');
      await _openFlow(tester, existing: _goods());
      await _tap(tester, 'Edit Donation');
      await _tap(tester, 'Continue');
      await _tap(tester, 'Continue');

      await _tap(tester, 'Save Changes');

      expect(
        find.text('This donation can no longer be edited.'),
        findsOneWidget,
      );
      expect(_title, 'Review Changes');
    });
  });

  group('DonationFlowScreen — existing money donation', () {
    for (final (status, heading) in [
      ('PLEDGED', 'Donation Pledged'),
      ('VERIFYING', 'Verifying'),
      ('CONFIRMED', 'Donation Successful!'),
      ('DECLINED', 'Donation Declined'),
    ]) {
      flowTest('$status reads "$heading"', (tester) async {
        server.routes['GET $_donationPath'] = (_) async =>
            _ok(_donationJson(status: status));
        await _openFlow(tester, existing: _money(status: status));

        expect(find.text(heading), findsWidgets);
        expect(_row(tester, 'Donation Type'), 'Money');
        expect(_row(tester, 'Status'), status);
        expect(find.text('Edit Donation'), findsNothing);
      });
    }

    flowTest('a confirmed donation opens its receipt', (tester) async {
      server.routes['GET $_donationPath'] = (_) async =>
          _ok(_donationJson(status: 'CONFIRMED'));
      await _openFlow(tester, existing: _money(status: 'CONFIRMED'));

      await tester.tap(_button('View Donation'));
      await tester.pumpAndSettle();

      expect(find.byType(DonationFlowScreen), findsNothing);
      expect(find.text('Donation Receipt'), findsOneWidget);
      expect(find.text('₱500'), findsWidgets);
    });

    flowTest('close on the status leaves the flow', (tester) async {
      server.routes['GET $_donationPath'] = (_) async => _ok(_donationJson());
      final outcome = await _openFlow(tester, existing: _money());

      await tester.tap(find.byIcon(Icons.close_rounded));
      await tester.pumpAndSettle();

      expect(outcome.closed, isTrue);
    });
  });

  test('donor providers are wired to the services', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    expect(container.read(donationServiceProvider), isA<DonationService>());
    expect(
      container.read(donationPaymentServiceProvider),
      isA<DonationPaymentService>(),
    );
  });
}
