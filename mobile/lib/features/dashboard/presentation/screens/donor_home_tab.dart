import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
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

/// Donor home — the volunteer home's layout with campaigns in place of
/// events: a dark hero (welcome, rank, search) that runs on down behind the
/// top of the "Popular Campaigns" deck, then the category chip row and the
/// list it filters.
///
/// Both sections read `GET /events/donations` through
/// [donationCampaignsProvider] — every open event a director enabled money
/// or goods donations on. The deck ranks them by what has been raised; the
/// list groups them by event category. The hero's rank comes from the donor
/// board, not the volunteer one. Remount the widget (new key) to refetch.
class DonorHomeTab extends ConsumerStatefulWidget {
  const DonorHomeTab({
    super.key,
    required this.displayName,
    this.onSeeAllCampaigns,
    this.popularCount = 5,
  });

  final String displayName;

  /// Opens the campaigns tab from search and "View all". The filter button
  /// stays on this tab and drives the category list instead.
  final VoidCallback? onSeeAllCampaigns;

  /// How many campaigns the popular deck shows; the list shows every one.
  final int popularCount;

  @override
  ConsumerState<DonorHomeTab> createState() => _DonorHomeTabState();
}

class _DonorHomeTabState extends ConsumerState<DonorHomeTab> {
  static const _gutter = VolunteerHomeHero.gutter;

  /// How far the popular deck hangs down out of the dark ground.
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

  /// Filter button: pick a category from a sheet. Shares [_category] with
  /// the chip row so both reflect the same choice. Does nothing until the
  /// campaigns (and therefore the categories) have loaded.
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
              child: const DecoratedBox(
                decoration: BoxDecoration(color: VolunteerHomeHero.ink),
                child: HomeHeroParticles(),
              ),
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
                  title: 'Popular Campaigns',
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

  /// Chips + list, or the one state card that explains why there is none.
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
                : 'Could not load campaigns right now.',
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
                title: 'No campaigns open right now',
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

/// The deck, its skeleton, or a dark-ground placeholder so the hero's ink
/// still has something to hang behind when there is nothing to show.
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
      error: (_, _) => const _DeckPlaceholder(
        icon: Icons.wifi_off_rounded,
        message: 'Campaigns are unavailable right now',
      ),
      data: (all) {
        final popular = _popular(all);
        if (popular.isEmpty) {
          return const _DeckPlaceholder(
            icon: Icons.volunteer_activism_outlined,
            message: 'No events are open for donations yet',
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

class _DeckPlaceholder extends StatelessWidget {
  const _DeckPlaceholder({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: VolunteerHomeHero.gutter),
      child: Container(
        height: DonorCampaignDeck.cardHeight,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 36, color: AppColors.textMuted),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
