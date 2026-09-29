import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/presentation/providers/donor_providers.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_activity_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_campaigns_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_home_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_ranks_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';
import 'package:mobile/shared/widgets/dashboard_refresh_shell.dart';

/// Donor dashboard — mirrors the volunteer [HomeScreen] layout with campaigns
/// in place of events. Every tab reads the server: the campaign feed, the
/// donor's ledger and the donor board.
class DonorDashboardScreen extends ConsumerStatefulWidget {
  const DonorDashboardScreen({super.key, required this.donor});

  final DonorSessionUser donor;

  @override
  ConsumerState<DonorDashboardScreen> createState() =>
      _DonorDashboardScreenState();
}

class _DonorDashboardScreenState extends ConsumerState<DonorDashboardScreen> {
  static const _activityTabIndex = 2;

  int _currentTab = 0;
  // Bumped on pull-to-refresh; keying the tab stack on it remounts every tab.
  int _refreshVersion = 0;

  /// Pull-to-refresh: drop every cached fetch, then remount all tabs so each
  /// one reloads from scratch, not just the page that was pulled.
  Future<void> _refreshAll() async {
    ref.invalidate(donationCampaignsProvider);
    ref.invalidate(myDonationsProvider);
    ref.invalidate(donorLeaderboardProvider);
    if (!mounted) return;
    setState(() => _refreshVersion++);
  }

  void _openDonationsTab() => setState(() => _currentTab = _activityTabIndex);

  String get _firstName {
    final name = widget.donor.firstName.trim();
    return name.isEmpty ? 'Donor' : name;
  }

  String get _displayName {
    final full = widget.donor.fullName.trim();
    return full.isEmpty ? _firstName : full;
  }

  @override
  Widget build(BuildContext context) {
    // Back gesture on a secondary tab returns to Home before leaving the app.
    return PopScope(
      canPop: _currentTab == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _currentTab = 0);
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Column(
          children: [
            Expanded(
              child: DashboardRefreshShell(
                onRefresh: _refreshAll,
                child: IndexedStack(
                  key: ValueKey(_refreshVersion),
                  index: _currentTab,
                  children: [
                    DonorHomeTab(
                      displayName: _firstName,
                      onSeeAllCampaigns: () => setState(() => _currentTab = 1),
                    ),
                    const DonorCampaignsTab(),
                    const DonorActivityTab(),
                    DonorRanksTab(displayName: _displayName),
                    ProfileTabScreen(
                      displayName: _displayName,
                      email: widget.donor.email,
                      points: 0,
                      isDonor: true,
                      onOpenDonations: _openDonationsTab,
                    ),
                  ],
                ),
              ),
            ),
            DashboardBottomNav(
              currentIndex: _currentTab,
              onTap: (index) => setState(() => _currentTab = index),
              eventsTabLabel: 'Campaigns',
            ),
          ],
        ),
      ),
    );
  }
}
