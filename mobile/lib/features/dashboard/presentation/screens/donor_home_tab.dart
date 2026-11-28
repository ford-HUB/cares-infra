import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/features/dashboard/data/models/donation_campaign_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';
import 'package:mobile/features/dashboard/presentation/widgets/donor_campaign_cards.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_chips.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_category_filter_sheet.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_hero_particles.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_tab_states.dart';
import 'package:mobile/features/dashboard/presentation/widgets/popular_event_deck.dart';
import 'package:mobile/features/dashboard/presentation/widgets/volunteer_home_hero.dart';
import 'package:mobile/features/dashboard/screens/donation_details_screen.dart';
import 'package:mobile/shared/widgets/header_band.dart';

/// Both sections read [donationCampaignsProvider] (`GET /events/donations`):
/// the deck ranks by amount raised, the list groups by category. The hero's
/// rank is from the donor board. Remount (new key) to refetch.
class DonorHomeTab extends ConsumerStatefulWidget {
  const DonorHomeTab({
    super.key,
    required this.displayName,
    this.onSeeAllCampaigns,
    this.popularCount = 5,
  });

  final String displayName;

  /// The filter button stays here and drives the category list instead.
  final VoidCallback? onSeeAllCampaigns;

  /// The list shows every one.
  final int popularCount;

  @override
  ConsumerState<DonorHomeTab> createState() => _DonorHomeTabState();
}

class _DonorHomeTabState extends ConsumerState<DonorHomeTab> {
  static const _gutter = VolunteerHomeHero.gutter;

  static const _deckOverlap = DonorCampaignDeck.cardHeight * 0.36;

  String _category = 'All';

  @override
  void initState() {
    super.initState();
    // autoDispose keeps the last value alive across a quick remount; a mount
    // is always a request for fresh data here.
    Future.microtask(() {
      if (!mounted) return;
      ref.invalidate(donationCampaignsProvider);
      ref.invalidate(donorLeaderboardProvider);
    });
  }

  void _open(DonationCampaign campaign) =>
      DonationDetailsScreen.open(context, campaign);

  /// Shares [_category] with the chip row; no-op until campaigns load.
  Future<void> _pickCategory() async {
    final all = ref.read(donationCampaignsProvider).value;
    if (all == null || all.isEmpty) return;
    final chips = campaignCategories(all);
    final picked = await showHomeCategoryFilterSheet(
      context,
      categories: chips,
      selected: chips.contains(_category) ? _category : 'All',
    );
    if (!mounted || picked == null) return;
    setState(() => _category = picked);
  }

  @override
  Widget build(BuildContext context) {
    final seeAll = widget.onSeeAllCampaigns ?? () {};
    final campaigns = ref.watch(donationCampaignsProvider);
    final board = ref.watch(donorLeaderboardProvider).asData?.value;
    final rank = board?.me.rank;

    final inkHeight =
        VolunteerHomeHero.height(context) +
        HomeSectionTitle.height +
        (DonorCampaignDeck.cardHeight - _deckOverlap);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 8),
        child: Stack(
          children: [
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: inkHeight,
              child: const DeepGround(child: HomeHeroParticles()),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                VolunteerHomeHero(
                  displayName: widget.displayName,
                  roleType: RoleAccountStore.donor,
                  standing: (rank: rank, tier: board?.tierForRank(rank)),
                  onSearchTap: seeAll,
                  onFilterTap: _pickCategory,
                  filterActive: _category != 'All',
                ),
                HomeSectionTitle(
                  title: 'Popular Drives',
                  emoji: '🔥',
                  onDark: true,
                  onViewAll: seeAll,
                ),
                _PopularSlot(
                  campaigns: campaigns,
                  count: widget.popularCount,
                  onOpen: _open,
                ),
                const SizedBox(height: 8),
                HomeSectionTitle(
                  title: 'Choose By Category',
                  emoji: '✨',
                  onViewAll: seeAll,
                ),
                ..._categorySection(campaigns),
                const SizedBox(height: 12),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _categorySection(AsyncValue<List<DonationCampaign>> campaigns) {
    const inset = EdgeInsets.symmetric(horizontal: _gutter);

    return campaigns.when(
      loading: () => const [
        Padding(padding: inset, child: DonorCampaignListSkeleton()),
      ],
      error: (error, _) => [
        Padding(
          padding: inset,
          child: HomeStateCard.error(
            message: error is ApiException
                ? error.message
                : 'Could not load drives right now.',
            onRetry: () => ref.invalidate(donationCampaignsProvider),
          ),
        ),
      ],
      data: (all) {
        if (all.isEmpty) {
          return const [
            Padding(
              padding: inset,
              child: HomeStateCard(
                icon: Icons.volunteer_activism_outlined,
                title: 'No drives open right now',
                message:
                    'Events that accept money or goods donations will show up '
                    'here as soon as a director opens one.',
              ),
            ),
          ];
        }

        final chips = campaignCategories(all);
        // A chip picked before a refetch may no longer exist; fall back to
        // All rather than filtering everything out.
        final active = chips.contains(_category) ? _category : 'All';
        final filtered = all.where((c) => c.matchesCategory(active)).toList();

        return [
          HomeCategoryChips(
            categories: chips,
            selected: active,
            onSelected: (c) => setState(() => _category = c),
            gutter: _gutter,
          ),
          const SizedBox(height: 18),
          Padding(
            padding: inset,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < filtered.length; i++) ...[
                  if (i > 0) const SizedBox(height: 12),
                  DonorCampaignRow(
                    campaign: filtered[i],
                    onOpen: () => _open(filtered[i]),
                  ),
                ],
              ],
            ),
          ),
        ];
      },
    );
  }
}

/// The placeholder keeps something behind the hero's ink when empty.
class _PopularSlot extends StatelessWidget {
  const _PopularSlot({
    required this.campaigns,
    required this.count,
    required this.onOpen,
  });

  final AsyncValue<List<DonationCampaign>> campaigns;
  final int count;
  final ValueChanged<DonationCampaign> onOpen;

  /// Most given to first — the closest thing to "popular" a campaign has.
  List<DonationCampaign> _popular(List<DonationCampaign> all) {
    final sorted = [...all]
      ..sort(
        (a, b) => b.donationsCount.compareTo(a.donationsCount) != 0
            ? b.donationsCount.compareTo(a.donationsCount)
            : b.raisedAmount.compareTo(a.raisedAmount),
      );
    return sorted.take(count).toList();
  }

  @override
  Widget build(BuildContext context) {
    const gutter = VolunteerHomeHero.gutter;

    return campaigns.when(
      loading: () => const PopularEventDeckSkeleton(gutter: gutter),
      error: (_, _) => const HomeDeckPlaceholder(
        icon: Icons.wifi_off_rounded,
        title: 'Drives Unavailable',
        message:
            'We could not load drives right now. Pull down to try again.',
      ),
      data: (all) {
        final popular = _popular(all);
        if (popular.isEmpty) {
          return const HomeDeckPlaceholder(
            icon: Icons.volunteer_activism_outlined,
            title: 'No Open Drives Yet',
            message: 'No events are open for donations yet. Check back soon.',
          );
        }
        return DonorCampaignDeck(
          campaigns: popular,
          gutter: gutter,
          onOpen: onOpen,
        );
      },
    );
  }
}
