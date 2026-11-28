import 'package:mobile/core/constants/goods_types.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';

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

/// Each is a different Xendit product with its own hand-off: [gcash] approve in
/// GCash; [qrph] QR shown in-app; [card] hosted 3-D Secure page; [bank] hosted
/// bank page (BPI, UnionBank, RCBC, Chinabank).
enum DonationPaymentMethod { gcash, qrph, card, bank }

extension DonationPaymentMethodMeta on DonationPaymentMethod {
  String get label => switch (this) {
    DonationPaymentMethod.gcash => 'GCash',
    DonationPaymentMethod.qrph => 'QR Ph',
    DonationPaymentMethod.card => 'Credit/Debit Card',
    DonationPaymentMethod.bank => 'Bank Transfer',
  };

  String get description => switch (this) {
    DonationPaymentMethod.gcash => 'Approve the payment in your GCash app',
    DonationPaymentMethod.qrph =>
      'Scan a QR code with any bank or e-wallet app',
    DonationPaymentMethod.card =>
      'Visa, Mastercard or JCB — secured with 3-D Secure',
    DonationPaymentMethod.bank =>
      'BPI, UnionBank, RCBC or Chinabank online banking',
  };

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

  String get referenceLabel => switch (this) {
    DonationPaymentMethod.gcash => 'GCash Reference No.',
    DonationPaymentMethod.qrph => 'QR Ph Reference No.',
    _ => 'Payment Reference No.',
  };

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

/// The server's `DonationStatus`. Goods: pledged → awaitingPickup (drop-off at
/// the office) → verifying → confirmed. Money: pledged → verifying → confirmed.
/// [declined] is the director's exit; [cancelled] the donor's, while pledged.
enum DonationStatus {
  pledged,
  awaitingPickup,
  verifying,
  confirmed,
  declined,
  cancelled;

  String get label => switch (this) {
    DonationStatus.pledged => 'Pledged',
    DonationStatus.awaitingPickup => 'Awaiting Drop-off',
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

/// `GET /donations/me` row. Money rows open when the checkout is paid, goods
/// rows on pledge; either counts only once a director confirms.
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
    this.contactNumber,
    this.deliveryDate,
    this.confirmedAt,
  });

  factory Donation.fromJson(Map<String, dynamic> json) {
    DateTime? date(String key) {
      final raw = json[key] as String?;
      return raw == null ? null : DateTime.tryParse(raw)?.toLocal();
    }

    final deliveryRaw = json['delivery_date'] as String?;
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
      contactNumber: json['donor_contact'] as String?,
      // A calendar day, not an instant — parse it as local so it never shifts.
      deliveryDate: deliveryRaw == null ? null : DateTime.tryParse(deliveryRaw),
      confirmedAt: date('confirmed_at'),
      trail: (json['trail'] as List<dynamic>? ?? const [])
          .map((e) => DonationTrailEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: date('created_at') ?? DateTime.now(),
      updatedAt: date('updated_at') ?? DateTime.now(),
    );
  }

  final String id;

  /// `DN-0007`, as the portal prints it.
  final String reference;
  final DonationKind kind;
  final DonationStatus status;
  final int eventId;
  final String eventTitle;

  /// Whole pesos: the paid amount, or the goods' credited value.
  final int amount;
  final String? paymentId;
  final DonationPaymentMethod? paymentMethod;
  final String? paymentReference;
  final String? goodsType;
  final String? goodsItem;
  final int? goodsQuantity;

  /// Goods only: drop-off contact.
  final String? contactNumber;

  /// Goods only: planned hand-in day at the CARES Office.
  final DateTime? deliveryDate;
  final DateTime? confirmedAt;
  final List<DonationTrailEntry> trail;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isMoney => kind == DonationKind.money;
  bool get isGoods => kind == DonationKind.goods;
  bool get isComplete => status == DonationStatus.confirmed;
  bool get isCancelled => status == DonationStatus.cancelled;
  bool get isDeclined => status == DonationStatus.declined;

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

  String? get deliveryDateLabel =>
      deliveryDate == null ? null : DonationFormat.dateOnly(deliveryDate!);
}
