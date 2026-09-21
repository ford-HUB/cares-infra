import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/models/donation_campaign_models.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';
import 'package:mobile/features/dashboard/presentation/widgets/donor_campaign_cards.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_tab_states.dart';
import 'package:mobile/features/dashboard/screens/donation_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/donations_page_widgets.dart';

/// Browse and search every open event accepting donations — the same
/// `GET /events/donations` feed the home tab shows, with search and a
/// category filter over it.
class DonorCampaignsTab extends ConsumerStatefulWidget {
  const DonorCampaignsTab({super.key});

  @override
  ConsumerState<DonorCampaignsTab> createState() => _DonorCampaignsTabState();
}

class _DonorCampaignsTabState extends ConsumerState<DonorCampaignsTab> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  String _query = '';
  String _selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  List<DonationCampaign> _filtered(List<DonationCampaign> all) => all
      .where(
        (c) => c.matchesCategory(_selectedCategory) && c.matchesQuery(_query),
      )
      .toList();

  bool get _hasActiveFilters =>
      _query.trim().isNotEmpty || _selectedCategory != 'All';

  String _subtitle(int count) {
    if (_query.trim().isNotEmpty) {
      return '$count result${count == 1 ? '' : 's'} found';
    }
    return '$count event${count == 1 ? '' : 's'} accepting donations';
  }

  void _applySuggestion(String suggestion) {
    _searchController.text = suggestion;
    _searchController.selection = TextSelection.collapsed(
      offset: suggestion.length,
    );
    setState(() => _query = suggestion);
    _searchFocusNode.unfocus();
  }

  void _clearSearch() {
    _searchController.clear();
    setState(() => _query = '');
  }

  void _clearFilters() {
    _clearSearch();
    setState(() => _selectedCategory = 'All');
  }

  @override
  Widget build(BuildContext context) {
    final page = ref.watch(donationCampaignsProvider);
    final all = page.asData?.value ?? const <DonationCampaign>[];
    final campaigns = _filtered(all);
    final categories = campaignCategories(all);
    final suggestions = campaignSearchSuggestions(all, _query);
    final showSuggestions = _searchFocusNode.hasFocus && suggestions.isNotEmpty;

    return GestureDetector(
      onTap: () => _searchFocusNode.unfocus(),
      child: ColoredBox(
        color: AppColors.background,
        child: SafeArea(
          bottom: false,
          child: CustomScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            slivers: [
              SliverToBoxAdapter(
                child: DonationsPageHeader(
                  title: 'Campaigns',
                  subtitle: page.isLoading
                      ? 'Loading events accepting donations…'
                      : _subtitle(campaigns.length),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: DonationSmartSearchBar(
                    controller: _searchController,
                    focusNode: _searchFocusNode,
                    query: _query,
                    onQueryChanged: (value) => setState(() => _query = value),
                    onSuggestionTap: _applySuggestion,
                    onClear: _clearSearch,
                    showSuggestions: showSuggestions,
                    suggestions: suggestions,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: DonationCategoryFilters(
                    categories: categories,
                    selected: categories.contains(_selectedCategory)
                        ? _selectedCategory
                        : 'All',
                    onSelected: (category) {
                      setState(() => _selectedCategory = category);
                      _searchFocusNode.unfocus();
                    },
                  ),
                ),
              ),
              ...page.when(
                loading: () => const [
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(20, 8, 20, 24),
                    sliver: SliverToBoxAdapter(
                      child: DonorCampaignListSkeleton(),
                    ),
                  ),
                ],
                error: (error, _) => [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    sliver: SliverToBoxAdapter(
                      child: HomeStateCard.error(
                        message: error is ApiException
                            ? error.message
                            : 'Could not load campaigns right now.',
                        onRetry: () =>
                            ref.invalidate(donationCampaignsProvider),
                      ),
                    ),
                  ),
                ],
                data: (_) => [
                  if (campaigns.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: DonationsEmptyState(
                        query: _query,
                        hasActiveFilters: _hasActiveFilters,
                        onClearFilters: _clearFilters,
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final campaign = campaigns[index];
                          return DonationCatalogCard(
                            donation: campaign,
                            onTap: () =>
                                DonationDetailsScreen.open(context, campaign),
                          );
                        }, childCount: campaigns.length),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
