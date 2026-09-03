import 'package:flutter/foundation.dart';

/// Whether the donor is giving money or physical goods.
enum DonationType { money, goods }

extension DonationTypeMeta on DonationType {
  String get label => switch (this) {
    DonationType.money => 'Money',
    DonationType.goods => 'Goods',
  };
}

/// Payment channels offered in the money flow. UI-only for the prototype —
/// there is no real payment integration behind these.
enum DonationPaymentMethod { gcash, maya, card, bank }

extension DonationPaymentMethodMeta on DonationPaymentMethod {
  String get label => switch (this) {
    DonationPaymentMethod.gcash => 'GCash',
    DonationPaymentMethod.maya => 'Maya',
    DonationPaymentMethod.card => 'Credit/Debit Card',
    DonationPaymentMethod.bank => 'Bank Transfer',
  };
}

/// Lifecycle of a goods donation. The forward path must progress in order and
/// never skip: pledged → waitingForPickup → verifying → confirmed. The only
/// branch is pledged → cancelled.
enum GoodsDonationStatus {
  pledged,
  waitingForPickup,
  verifying,
  confirmed,
  cancelled,
}

extension GoodsDonationStatusMeta on GoodsDonationStatus {
  String get label => switch (this) {
    GoodsDonationStatus.pledged => 'Pledged',
    GoodsDonationStatus.waitingForPickup => 'Waiting for Pickup',
    GoodsDonationStatus.verifying => 'Verifying',
    GoodsDonationStatus.confirmed => 'Confirmed',
    GoodsDonationStatus.cancelled => 'Cancelled',
  };

  String get upperLabel => label.toUpperCase();

  /// Next status on the forward path, or null if terminal.
  GoodsDonationStatus? get next => switch (this) {
    GoodsDonationStatus.pledged => GoodsDonationStatus.waitingForPickup,
    GoodsDonationStatus.waitingForPickup => GoodsDonationStatus.verifying,
    GoodsDonationStatus.verifying => GoodsDonationStatus.confirmed,
    GoodsDonationStatus.confirmed => null,
    GoodsDonationStatus.cancelled => null,
  };

  /// Edit and cancel are only allowed while still pledged.
  bool get isEditable => this == GoodsDonationStatus.pledged;
}

/// A donation record.
///
/// Money donations are created only after the simulated payment succeeds and
/// are immediately complete. Goods donations are created when the user pledges
/// and then advance through [goodsStatus] via the simulated pickup/verification
/// steps — they are only "confirmed" at the end.
class UserDonation {
  UserDonation({
    required this.donationId,
    required this.campaignId,
    required this.campaignTitle,
    required this.type,
    required this.donorEmail,
    required this.donatedAt,
    this.amount = 0,
    this.paymentMethod,
    this.goodsItem,
    this.goodsQuantity = 0,
    this.goodsUnit,
    this.pickupAddress,
    this.pickupContact,
    this.pickupDate,
    this.pickupTimeMinutes,
    this.goodsStatus = GoodsDonationStatus.pledged,
  });

  final String donationId;
  final String campaignId;
  final String campaignTitle;
  final DonationType type;

  /// Peso amount for money donations; 0 for goods.
  final int amount;
  final DonationPaymentMethod? paymentMethod;

  // Goods donation details — mutable so a pledged donation can be edited.
  String? goodsItem;
  int goodsQuantity;
  String? goodsUnit;
  String? pickupAddress;
  String? pickupContact;
  DateTime? pickupDate;

  /// Minutes since midnight for the preferred pickup time.
  int? pickupTimeMinutes;

  /// Mutable so the simulated pickup/verification steps and cancellation can
  /// change it.
  GoodsDonationStatus goodsStatus;

  final String donorEmail;
  final DateTime donatedAt;

  String get quantityLabel =>
      goodsUnit == null ? '$goodsQuantity' : '$goodsQuantity $goodsUnit';

  String? get pickupDateLabel =>
      pickupDate == null ? null : DonationStore.formatDateOnly(pickupDate!);

  String? get pickupTimeLabel => pickupTimeMinutes == null
      ? null
      : DonationStore.formatMinutes(pickupTimeMinutes!);

  String get statusLabel =>
      type == DonationType.money ? 'Completed' : goodsStatus.label;

  bool get isComplete =>
      type == DonationType.money ||
      goodsStatus == GoodsDonationStatus.confirmed;

  bool get isCancelled => goodsStatus == GoodsDonationStatus.cancelled;

  /// Whether the donor can still edit or cancel this donation.
  bool get canModify => type == DonationType.goods && goodsStatus.isEditable;
}

/// In-memory donation store for the static prototype phase.
class DonationStore extends ChangeNotifier {
  DonationStore._();

  static final DonationStore instance = DonationStore._();

  static const demoTotalDonated = 1250;
  static const demoDonationsCount = 3;

  final List<UserDonation> _donations = [];
  int _sequence = 0;

  List<UserDonation> donationsForEmail(String email) {
    final normalized = email.trim().toLowerCase();
    return _donations
        .where((d) => d.donorEmail.trim().toLowerCase() == normalized)
        .toList();
  }

  int totalDonatedForEmail(String email) {
    return donationsForEmail(
      email,
    ).fold<int>(0, (sum, donation) => sum + donation.amount);
  }

  int donationsCountForEmail(String email) {
    final count = donationsForEmail(email).length;
    return count > 0 ? count : demoDonationsCount;
  }

  int totalDonatedDisplayForEmail(String email) {
    final total = totalDonatedForEmail(email);
    return total > 0 ? total : demoTotalDonated;
  }

  UserDonation? donationById(String donationId) {
    for (final donation in _donations) {
      if (donation.donationId == donationId) return donation;
    }
    return null;
  }

  /// Records a completed money donation. Call this ONLY after the simulated
  /// payment succeeds. Returns the created record, including its generated ID.
  UserDonation recordMoneyDonation({
    required String campaignId,
    required String campaignTitle,
    required String donorEmail,
    required int amount,
    required DonationPaymentMethod paymentMethod,
  }) {
    return _add(
      UserDonation(
        donationId: _nextId(),
        campaignId: campaignId,
        campaignTitle: campaignTitle,
        type: DonationType.money,
        amount: amount,
        paymentMethod: paymentMethod,
        donorEmail: donorEmail.trim().toLowerCase(),
        donatedAt: DateTime.now(),
      ),
    );
  }

  /// Records a goods donation at the moment the user pledges. The donation
  /// starts at [GoodsDonationStatus.pledged] and is NOT yet confirmed — it must
  /// advance through pickup and verification via [advanceGoodsStatus].
  UserDonation recordGoodsPledge({
    required String campaignId,
    required String campaignTitle,
    required String donorEmail,
    required String goodsItem,
    required int goodsQuantity,
    required String goodsUnit,
    required String pickupAddress,
    required String pickupContact,
    required DateTime pickupDate,
    required int pickupTimeMinutes,
  }) {
    return _add(
      UserDonation(
        donationId: _nextId(),
        campaignId: campaignId,
        campaignTitle: campaignTitle,
        type: DonationType.goods,
        goodsItem: goodsItem,
        goodsQuantity: goodsQuantity,
        goodsUnit: goodsUnit,
        pickupAddress: pickupAddress,
        pickupContact: pickupContact,
        pickupDate: pickupDate,
        pickupTimeMinutes: pickupTimeMinutes,
        donorEmail: donorEmail.trim().toLowerCase(),
        donatedAt: DateTime.now(),
      ),
    );
  }

  /// Applies edited details to a goods donation. Only permitted while the
  /// donation is still pledged.
  void updateGoodsDonation({
    required String donationId,
    required String goodsItem,
    required int goodsQuantity,
    required String goodsUnit,
    required String pickupAddress,
    required String pickupContact,
    required DateTime pickupDate,
    required int pickupTimeMinutes,
  }) {
    final donation = donationById(donationId);
    if (donation == null || !donation.canModify) return;
    donation
      ..goodsItem = goodsItem
      ..goodsQuantity = goodsQuantity
      ..goodsUnit = goodsUnit
      ..pickupAddress = pickupAddress
      ..pickupContact = pickupContact
      ..pickupDate = pickupDate
      ..pickupTimeMinutes = pickupTimeMinutes;
    notifyListeners();
  }

  /// Cancels a goods donation. Only possible from the pledged status. The
  /// record is kept (marked cancelled), never deleted.
  void cancelGoodsDonation(String donationId) {
    final donation = donationById(donationId);
    if (donation == null || !donation.canModify) return;
    donation.goodsStatus = GoodsDonationStatus.cancelled;
    notifyListeners();
  }

  /// Moves a goods donation to the next status in the lifecycle. Used by the
  /// prototype's "Simulate Pickup" / "Simulate Verification" buttons.
  void advanceGoodsStatus(String donationId) {
    final donation = donationById(donationId);
    final next = donation?.goodsStatus.next;
    if (donation == null || next == null) return;
    donation.goodsStatus = next;
    notifyListeners();
  }

  UserDonation _add(UserDonation donation) {
    _donations.add(donation);
    notifyListeners();
    return donation;
  }

  String _nextId() {
    _sequence += 1;
    return formatDonationId(_sequence);
  }

  static String formatDonationId(int sequence) =>
      'DN-${sequence.toString().padLeft(4, '0')}';

  static String formatDateOnly(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  static String formatMinutes(int minutesSinceMidnight) {
    final hour = minutesSinceMidnight ~/ 60;
    final minute = minutesSinceMidnight % 60;
    final hour12 = hour % 12 == 0 ? 12 : hour % 12;
    final period = hour < 12 ? 'AM' : 'PM';
    return '$hour12:${minute.toString().padLeft(2, '0')} $period';
  }

  static String formatDate(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final hour12 = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final minute = date.minute.toString().padLeft(2, '0');
    final period = date.hour < 12 ? 'AM' : 'PM';
    return '${months[date.month - 1]} ${date.day}, ${date.year} · '
        '$hour12:$minute $period';
  }

  static String formatPeso(int amount) {
    if (amount >= 1000) {
      final thousands = amount / 1000;
      final formatted = thousands >= 10
          ? thousands.toStringAsFixed(0)
          : thousands.toStringAsFixed(1);
      return '₱${formatted}k';
    }
    return '₱$amount';
  }

  static String formatPesoFull(int amount) {
    final formatted = amount.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (match) => '${match[1]},',
    );
    return '₱$formatted';
  }
}
