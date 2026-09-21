import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/dashboard/data/donation_service.dart';
import 'package:mobile/features/dashboard/data/models/donation_campaign_models.dart';
import 'package:mobile/features/dashboard/data/models/donation_models.dart';
import 'package:mobile/features/dashboard/data/models/ranking_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/leaderboard_provider.dart';

final donationServiceProvider = Provider<DonationService>(
  (ref) => DonationService(),
);

/// Open events accepting money or goods — the donor home deck, the category
/// list and the Campaigns tab all read this one fetch. Auto-disposed so a
/// return to the dashboard asks the server again.
final donationCampaignsProvider =
    FutureProvider.autoDispose<List<DonationCampaign>>(
      (ref) => ref.read(donationServiceProvider).fetchCampaigns(),
    );

/// The donor's own ledger, latest first — the Activity tab and the profile
/// stats. Invalidate after a pledge, edit or cancel so the list catches up.
final myDonationsProvider = FutureProvider.autoDispose<List<Donation>>(
  (ref) => ref.read(donationServiceProvider).fetchMine(),
);

/// Which window the donor Ranks tab shows. Null follows the portal's default.
final donorLeaderboardPeriodProvider = StateProvider<String?>((ref) => null);

/// The donor board for the selected period. The home hero watches this too
/// for the rank badge and avatar frame, so one fetch serves both.
final donorLeaderboardProvider = FutureProvider.autoDispose<DonorLeaderboard>((
  ref,
) async {
  final period = ref.watch(donorLeaderboardPeriodProvider);
  return ref.read(rankingServiceProvider).fetchDonorLeaderboard(period: period);
});

/// Figures the home stats row and the profile tile share, from the ledger.
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

  /// Pesos a director has confirmed — what counts on the board.
  final int confirmedAmount;

  /// Donations still on the ladder or confirmed.
  final int donations;

  /// Distinct events those donations went to.
  final int campaigns;
}
