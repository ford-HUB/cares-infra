import 'package:mobile/core/constants/goods_types.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';

/// Whether the donor is giving money or physical goods.
enum DonationKind {
  money,
  goods;

  String get label => switch (this) {
    DonationKind.money => 'Money',
    DonationKind.goods => 'Goods',
  };

  static DonationKind fromWire(String value) =>
      value == 'GOODS' ? DonationKind.goods : DonationKind.money;
}

/// Payment channels offered in the money flow. Each one is a different Xendit
/// product on the server, with its own hand-off:
///
/// * [gcash] — the donor is sent to GCash to approve the charge.
/// * [qrph]  — a QR Ph code is shown in-app for any bank / e-wallet to scan.
/// * [card]  — Xendit's hosted card page (3-D Secure) opens in the browser.
/// * [bank]  — Xendit's hosted page where the donor pays from their own bank
///   (BPI, UnionBank, RCBC, Chinabank).
enum DonationPaymentMethod { gcash, qrph, card, bank }

extension DonationPaymentMethodMeta on DonationPaymentMethod {
  String get label => switch (this) {
    DonationPaymentMethod.gcash => 'GCash',
    DonationPaymentMethod.qrph => 'QR Ph',
    DonationPaymentMethod.card => 'Credit/Debit Card',
    DonationPaymentMethod.bank => 'Bank Transfer',
  };

  /// One line under the name on the payment-method step.
  String get description => switch (this) {
    DonationPaymentMethod.gcash => 'Approve the payment in your GCash app',
    DonationPaymentMethod.qrph =>
      'Scan a QR code with any bank or e-wallet app',
    DonationPaymentMethod.card =>
      'Visa, Mastercard or JCB — secured with 3-D Secure',
    DonationPaymentMethod.bank =>
      'BPI, UnionBank, RCBC or Chinabank online banking',
  };

  /// Brand artwork under `assets/images/payment/`.
  String get assetPath => switch (this) {
    DonationPaymentMethod.gcash => 'assets/images/payment/gcash.svg',
    DonationPaymentMethod.qrph => 'assets/images/payment/qrph.svg',
    DonationPaymentMethod.card => 'assets/images/payment/card.svg',
    DonationPaymentMethod.bank => 'assets/images/payment/bank.svg',
  };

  /// The `DonationPaymentMethod` enum value on the server.
  String get wireValue => switch (this) {
    DonationPaymentMethod.gcash => 'GCASH',
    DonationPaymentMethod.qrph => 'QRPH',
    DonationPaymentMethod.card => 'CARD',
    DonationPaymentMethod.bank => 'BANK_TRANSFER',
  };

  /// Label for the payment reference row, matching the channel used.
  String get referenceLabel => switch (this) {
    DonationPaymentMethod.gcash => 'GCash Reference No.',
    DonationPaymentMethod.qrph => 'QR Ph Reference No.',
    _ => 'Payment Reference No.',
  };

  /// Whether the donor leaves the app to pay (browser / GCash) rather than
  /// scanning a code shown in-app.
  bool get opensExternally => this != DonationPaymentMethod.qrph;

  static DonationPaymentMethod fromWire(String value) =>
      DonationPaymentMethod.values.firstWhere(
        (m) => m.wireValue == value,
        orElse: () => throw ArgumentError('Unknown payment method: $value'),
      );

  static DonationPaymentMethod? tryFromWire(String? value) {
    if (value == null) return null;
    for (final method in DonationPaymentMethod.values) {
      if (method.wireValue == value) return method;
    }
    return null;
  }
}

/// One ladder for both kinds, walked at different speeds — the server's
/// `DonationStatus`. Goods: pledged → awaitingPickup → verifying → confirmed.
/// Money (already paid): pledged → verifying → confirmed. [declined] is the
/// director's off-ramp; [cancelled] is the donor's, only while still pledged.
enum DonationStatus {
  pledged,
  awaitingPickup,
  verifying,
  confirmed,
  declined,
  cancelled;

  String get label => switch (this) {
    DonationStatus.pledged => 'Pledged',
    DonationStatus.awaitingPickup => 'Waiting for Pickup',
    DonationStatus.verifying => 'Verifying',
    DonationStatus.confirmed => 'Confirmed',
    DonationStatus.declined => 'Declined',
    DonationStatus.cancelled => 'Cancelled',
  };

  String get upperLabel => label.toUpperCase();

  bool get isTerminal =>
      this == DonationStatus.confirmed ||
      this == DonationStatus.declined ||
      this == DonationStatus.cancelled;

  static DonationStatus fromWire(String? value) => switch (value) {
    'AWAITING_PICKUP' => DonationStatus.awaitingPickup,
    'VERIFYING' => DonationStatus.verifying,
    'CONFIRMED' => DonationStatus.confirmed,
    'DECLINED' => DonationStatus.declined,
    'CANCELLED' => DonationStatus.cancelled,
    _ => DonationStatus.pledged,
  };

  /// The forward path for a kind, in order.
  static List<DonationStatus> flowFor(DonationKind kind) => switch (kind) {
    DonationKind.goods => const [
      DonationStatus.pledged,
      DonationStatus.awaitingPickup,
      DonationStatus.verifying,
      DonationStatus.confirmed,
    ],
    DonationKind.money => const [
      DonationStatus.pledged,
      DonationStatus.verifying,
      DonationStatus.confirmed,
    ],
  };
}

/// One move on the donation's ladder, as the portal recorded it.
class DonationTrailEntry {
  const DonationTrailEntry({
    required this.id,
    required this.status,
    required this.note,
    required this.actorLabel,
    required this.createdAt,
  });

  factory DonationTrailEntry.fromJson(Map<String, dynamic> json) {
    return DonationTrailEntry(
      id: json['donation_trail_entry_id'] as String,
      status: DonationStatus.fromWire(json['status'] as String?),
      note: json['note'] as String?,
      actorLabel: json['actor_label'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '')?.toLocal() ??
          DateTime.now(),
    );
  }

  final String id;
  final DonationStatus status;
  final String? note;
  final String actorLabel;
  final DateTime createdAt;
}

/// A donation on the server's ledger — `GET /donations/me` row. Money rows are
/// opened by the gateway once the checkout is paid; goods rows when the donor
/// pledges. Either only counts once a director confirms it.
class Donation {
  const Donation({
    required this.id,
    required this.reference,
    required this.kind,
    required this.status,
    required this.eventId,
    required this.eventTitle,
    required this.amount,
    required this.trail,
    required this.createdAt,
    required this.updatedAt,
    this.paymentId,
    this.paymentMethod,
    this.paymentReference,
    this.goodsType,
    this.goodsItem,
    this.goodsQuantity,
    this.pickupAddress,
    this.pickupContact,
    this.pickupDate,
    this.pickupTimeMinutes,
    this.confirmedAt,
  });

  factory Donation.fromJson(Map<String, dynamic> json) {
    DateTime? date(String key) {
      final raw = json[key] as String?;
      return raw == null ? null : DateTime.tryParse(raw)?.toLocal();
    }

    final pickupRaw = json['pickup_date'] as String?;
    return Donation(
      id: json['donation_id'] as String,
      reference: json['reference'] as String? ?? '',
      kind: DonationKind.fromWire(json['kind'] as String? ?? 'MONEY'),
      status: DonationStatus.fromWire(json['status'] as String?),
      eventId: json['event_id'] as int,
      eventTitle: json['event_title'] as String? ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      paymentId: json['payment_id'] as String?,
      paymentMethod: DonationPaymentMethodMeta.tryFromWire(
        json['method'] as String?,
      ),
      paymentReference: json['payment_reference'] as String?,
      goodsType: json['goods_type'] as String?,
      goodsItem: json['goods_item'] as String?,
      goodsQuantity: (json['goods_quantity'] as num?)?.toInt(),
      pickupAddress: json['pickup_address'] as String?,
      pickupContact: json['pickup_contact'] as String?,
      // A calendar day, not an instant — parse it as local so it never shifts.
      pickupDate: pickupRaw == null ? null : DateTime.tryParse(pickupRaw),
      pickupTimeMinutes: (json['pickup_time_minutes'] as num?)?.toInt(),
      confirmedAt: date('confirmed_at'),
      trail: (json['trail'] as List<dynamic>? ?? const [])
          .map((e) => DonationTrailEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: date('created_at') ?? DateTime.now(),
      updatedAt: date('updated_at') ?? DateTime.now(),
    );
  }

  final String id;

  /// `DN-0007` — the tracking number the portal prints too.
  final String reference;
  final DonationKind kind;
  final DonationStatus status;
  final int eventId;
  final String eventTitle;

  /// Whole pesos: what was paid for money; the credited value of the goods.
  final int amount;
  final String? paymentId;
  final DonationPaymentMethod? paymentMethod;
  final String? paymentReference;
  final String? goodsType;
  final String? goodsItem;
  final int? goodsQuantity;
  final String? pickupAddress;
  final String? pickupContact;
  final DateTime? pickupDate;
  final int? pickupTimeMinutes;
  final DateTime? confirmedAt;
  final List<DonationTrailEntry> trail;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isMoney => kind == DonationKind.money;
  bool get isGoods => kind == DonationKind.goods;
  bool get isComplete => status == DonationStatus.confirmed;
  bool get isCancelled => status == DonationStatus.cancelled;
  bool get isDeclined => status == DonationStatus.declined;

  /// Edit and cancel are only allowed on goods still pledged.
  bool get canModify => isGoods && status == DonationStatus.pledged;

  String get statusLabel => status.label;

  /// `Food — 3 sacks of rice` / `Clothing` — what the goods row says.
  String get goodsLabel {
    final type = GoodsTypes.labelOf(goodsType);
    final item = goodsItem?.trim() ?? '';
    return item.isEmpty ? type : '$type — $item';
  }

  String get paymentReferenceLabel =>
      paymentMethod?.referenceLabel ?? 'Payment Reference No.';

  String? get pickupDateLabel =>
      pickupDate == null ? null : DonationFormat.dateOnly(pickupDate!);

  String? get pickupTimeLabel => pickupTimeMinutes == null
      ? null
      : DonationFormat.minutes(pickupTimeMinutes!);
}
