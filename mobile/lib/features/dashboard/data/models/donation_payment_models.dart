import 'package:mobile/features/dashboard/data/models/donation_models.dart';

/// Where a checkout stands, as the server mirrors it from Xendit. Only
/// [pending] is non-terminal.
enum DonationPaymentStatus {
  pending,
  paid,
  failed,
  expired;

  static DonationPaymentStatus fromWire(String value) => switch (value) {
    'PAID' => DonationPaymentStatus.paid,
    'FAILED' => DonationPaymentStatus.failed,
    'EXPIRED' => DonationPaymentStatus.expired,
    _ => DonationPaymentStatus.pending,
  };

  bool get isTerminal => this != DonationPaymentStatus.pending;
}

/// One checkout the server opened with Xendit — `POST /donations/payments`
/// and `GET /donations/payments/:id`.
class DonationPayment {
  const DonationPayment({
    required this.id,
    required this.campaignId,
    required this.campaignTitle,
    required this.amount,
    required this.method,
    required this.status,
    required this.gatewayReference,
    required this.createdAt,
    this.paymentReference,
    this.paymentChannel,
    this.checkoutUrl,
    this.qrString,
    this.expiresAt,
    this.paidAt,
    this.failureReason,
    this.donationId,
  });

  final String id;
  final String campaignId;
  final String campaignTitle;
  final int amount;
  final DonationPaymentMethod method;
  final DonationPaymentStatus status;

  /// Our reference on the gateway (`CARES-DON-…`), printed on statements.
  final String gatewayReference;

  /// Xendit's id for the settled payment; only set once [status] is paid.
  final String? paymentReference;
  final String? paymentChannel;

  /// GCash / card / bank: the page to open. Null for QR Ph.
  final String? checkoutUrl;

  /// QR Ph: the EMV string to render as a QR code.
  final String? qrString;
  final DateTime? expiresAt;
  final DateTime? paidAt;
  final String? failureReason;

  /// The ledger row the server opened once this settled as paid; null until
  /// the gateway's callback (or a reconcile) lands.
  final String? donationId;
  final DateTime createdAt;

  /// What the donor sees as their receipt number — the gateway's payment id
  /// once paid, our own reference until then.
  String get receiptReference => paymentReference ?? gatewayReference;

  factory DonationPayment.fromJson(Map<String, dynamic> json) {
    DateTime? date(String key) {
      final raw = json[key] as String?;
      return raw == null ? null : DateTime.tryParse(raw)?.toLocal();
    }

    return DonationPayment(
      id: json['donation_payment_id'] as String,
      campaignId: json['campaign_id'] as String,
      campaignTitle: json['campaign_title'] as String,
      amount: (json['amount'] as num).toInt(),
      method: DonationPaymentMethodMeta.fromWire(json['method'] as String),
      status: DonationPaymentStatus.fromWire(json['status'] as String),
      gatewayReference: json['gateway_reference'] as String,
      paymentReference: json['payment_reference'] as String?,
      paymentChannel: json['payment_channel'] as String?,
      checkoutUrl: json['checkout_url'] as String?,
      qrString: json['qr_string'] as String?,
      expiresAt: date('expires_at'),
      paidAt: date('paid_at'),
      failureReason: json['failure_reason'] as String?,
      donationId: json['donation_id'] as String?,
      createdAt: date('created_at') ?? DateTime.now(),
    );
  }
}

/// One channel the director has switched on in the portal's Payments module,
/// with the copy and limits they chose — `GET /payments/methods`.
class AvailablePaymentMethod {
  const AvailablePaymentMethod({
    required this.method,
    required this.label,
    required this.description,
    required this.minAmount,
    required this.maxAmount,
    this.accountName,
    this.accountNumber,
  });

  final DonationPaymentMethod method;

  /// What CARES calls this channel; falls back to the built-in name server-side.
  final String label;
  final String description;

  /// Whole pesos. The server refuses a checkout outside this range, so the flow
  /// greys the method out rather than letting the donor hit a 400.
  final int minAmount;
  final int maxAmount;

  /// Where the money lands, when CARES recorded it — shown on the review step so
  /// the donor can see who they are paying.
  final String? accountName;
  final String? accountNumber;

  bool accepts(int amount) => amount >= minAmount && amount <= maxAmount;

  factory AvailablePaymentMethod.fromJson(Map<String, dynamic> json) {
    return AvailablePaymentMethod(
      method: DonationPaymentMethodMeta.fromWire(json['method'] as String),
      label: json['label'] as String,
      description: json['description'] as String,
      minAmount: (json['min_amount'] as num).toInt(),
      maxAmount: (json['max_amount'] as num).toInt(),
      accountName: json['account_name'] as String?,
      accountNumber: json['account_number'] as String?,
    );
  }
}

/// What CARES can accept right now. [acceptingPayments] is false when the
/// director switched online donations off or has not entered a gateway key yet;
/// [methods] is then empty and the money flow says so instead of failing at the
/// checkout call.
class PaymentMethodAvailability {
  const PaymentMethodAvailability({
    required this.acceptingPayments,
    required this.methods,
    this.supportEmail,
    this.supportContact,
  });

  const PaymentMethodAvailability.unavailable()
    : acceptingPayments = false,
      methods = const [],
      supportEmail = null,
      supportContact = null;

  final bool acceptingPayments;
  final List<AvailablePaymentMethod> methods;
  final String? supportEmail;
  final String? supportContact;

  AvailablePaymentMethod? forMethod(DonationPaymentMethod method) {
    for (final entry in methods) {
      if (entry.method == method) return entry;
    }
    return null;
  }

  factory PaymentMethodAvailability.fromJson(Map<String, dynamic> json) {
    final items = (json['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(AvailablePaymentMethod.fromJson)
        .toList();

    return PaymentMethodAvailability(
      acceptingPayments: json['accepting_payments'] as bool? ?? false,
      methods: items,
      supportEmail: json['support_email'] as String?,
      supportContact: json['support_contact'] as String?,
    );
  }
}
