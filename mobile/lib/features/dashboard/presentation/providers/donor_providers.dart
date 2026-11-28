import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/donation_payment_service.dart';
import 'package:mobile/features/dashboard/data/donation_service.dart';
import 'package:mobile/features/dashboard/data/models/donation_campaign_models.dart';
import 'package:mobile/features/dashboard/data/models/donation_models.dart';
import 'package:mobile/features/dashboard/data/models/donation_payment_models.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/leaderboard_provider.dart';

final donationServiceProvider = Provider<DonationService>(
  (ref) => DonationService(),
);

final donationPaymentServiceProvider = Provider<DonationPaymentService>(
  (ref) => DonationPaymentService(),
);

/// Auto-disposed so re-entering the money flow asks again; a channel may be
/// switched off between donations.
final availablePaymentMethodsProvider =
    FutureProvider.autoDispose<PaymentMethodAvailability>(
      (ref) => ref.read(donationPaymentServiceProvider).fetchAvailableMethods(),
    );

/// One fetch for the home deck, category list and Campaigns tab; auto-disposed
/// so returning refetches.
final donationCampaignsProvider =
    FutureProvider.autoDispose<List<DonationCampaign>>(
      (ref) => ref.read(donationServiceProvider).fetchCampaigns(),
    );

/// Invalidate after a pledge, edit or cancel.
final myDonationsProvider = FutureProvider.autoDispose<List<Donation>>(
  (ref) => ref.read(donationServiceProvider).fetchMine(),
);

/// Null follows the portal's default.
final donorLeaderboardPeriodProvider = StateProvider<String?>((ref) => null);

/// The home hero watches it too, so one fetch serves both.
final donorLeaderboardProvider = FutureProvider.autoDispose<DonorLeaderboard>((
  ref,
) async {
  final period = ref.watch(donorLeaderboardPeriodProvider);
  return ref.read(rankingServiceProvider).fetchDonorLeaderboard(period: period);
});

class DonorSummary {
  const DonorSummary({
    required this.confirmedAmount,
    required this.donations,
    required this.campaigns,
  });

  factory DonorSummary.of(List<Donation> donations) {
    final live = donations.where((d) => !d.isCancelled && !d.isDeclined);
    return DonorSummary(
      confirmedAmount: donations
          .where((d) => d.isComplete)
          .fold(0, (sum, d) => sum + d.amount),
      donations: live.length,
      campaigns: live.map((d) => d.eventId).toSet().length,
    );
  }

  /// Director-confirmed pesos; what counts on the board.
  final int confirmedAmount;

  /// Still on the ladder or confirmed.
  final int donations;

  /// Distinct events those donations went to.
  final int campaigns;
}
