import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/mock_donations.dart';
import 'package:mobile/features/dashboard/screens/donation_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/donations_page_widgets.dart';

/// Browse and search all donation campaigns — mirrors Programs tab layout.
class DonorCampaignsTab extends StatefulWidget {
  const DonorCampaignsTab({super.key, required this.email});

  final String email;

  @override
  State<DonorCampaignsTab> createState() => _DonorCampaignsTabState();
}

class _DonorCampaignsTabState extends State<DonorCampaignsTab> {
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

  List<CaresDonation> get _filteredDonations {
    return kMockAllDonations
        .where(
          (donation) =>
              donation.matchesCategory(_selectedCategory) &&
              donation.matchesQuery(_query),
        )
        .toList();
  }

  List<String> get _suggestions => donationSearchSuggestionsFor(_query);

  bool get _hasActiveFilters =>
      _query.trim().isNotEmpty || _selectedCategory != 'All';

  String get _subtitle {
    final count = _filteredDonations.length;
    if (_query.trim().isNotEmpty) {
      return '$count result${count == 1 ? '' : 's'} found';
    }
    return '$count campaigns available';
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
    final donations = _filteredDonations;
    final showSuggestions =
        _searchFocusNode.hasFocus && _suggestions.isNotEmpty;

    return GestureDetector(
      onTap: () => _searchFocusNode.unfocus(),
      child: ColoredBox(
        color: AppColors.background,
        child: CustomScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            SliverToBoxAdapter(child: DonationsPageHeader(subtitle: _subtitle)),
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
                  suggestions: _suggestions,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: DonationCategoryFilters(
                  selected: _selectedCategory,
                  onSelected: (category) {
                    setState(() => _selectedCategory = category);
                    _searchFocusNode.unfocus();
                  },
                ),
              ),
            ),
            if (donations.isEmpty)
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
                    final donation = donations[index];
                    return DonationCatalogCard(
                      donation: donation,
                      onTap: () => DonationDetailsScreen.open(
                        context,
                        donation,
                        donorEmail: widget.email,
                      ),
                    );
                  }, childCount: donations.length),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
