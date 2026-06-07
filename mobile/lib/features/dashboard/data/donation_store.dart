import 'package:flutter/foundation.dart';

class UserDonation {
  UserDonation({
    required this.donationId,
    required this.campaignTitle,
    required this.amount,
    required this.donorEmail,
    required this.donatedAt,
  });

  final String donationId;
  final String campaignTitle;
  final int amount;
  final String donorEmail;
  final DateTime donatedAt;
}

/// In-memory donation store for the static prototype phase.
class DonationStore extends ChangeNotifier {
  DonationStore._();

  static final DonationStore instance = DonationStore._();

  static const demoTotalDonated = 1250;
  static const demoDonationsCount = 3;

  final List<UserDonation> _donations = [];

  List<UserDonation> donationsForEmail(String email) {
    final normalized = email.trim().toLowerCase();
    return _donations
        .where((d) => d.donorEmail.trim().toLowerCase() == normalized)
        .toList();
  }

  int totalDonatedForEmail(String email) {
    return donationsForEmail(email)
        .fold<int>(0, (sum, donation) => sum + donation.amount);
  }

  int donationsCountForEmail(String email) {
    final count = donationsForEmail(email).length;
    return count > 0 ? count : demoDonationsCount;
  }

  int totalDonatedDisplayForEmail(String email) {
    final total = totalDonatedForEmail(email);
    return total > 0 ? total : demoTotalDonated;
  }

  void recordDonation({
    required String donationId,
    required String campaignTitle,
    required int amount,
    required String donorEmail,
  }) {
    _donations.add(
      UserDonation(
        donationId: donationId,
        campaignTitle: campaignTitle,
        amount: amount,
        donorEmail: donorEmail.trim().toLowerCase(),
        donatedAt: DateTime.now(),
      ),
    );
    notifyListeners();
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
