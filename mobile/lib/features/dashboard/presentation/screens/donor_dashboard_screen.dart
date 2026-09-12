import 'package:flutter/material.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_activity_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_campaigns_tab.dart';
import 'package:mobile/features/dashboard/donor/data/donor_profile_store.dart';
import 'package:mobile/features/dashboard/donor/screens/donor_profile_setup_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_home_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_success_dialog.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_ranks_tab.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';
import 'package:mobile/shared/widgets/dashboard_refresh_shell.dart';

/// Donor dashboard — mirrors volunteer [HomeScreen] layout with campaign focus.
class DonorDashboardScreen extends StatefulWidget {
  const DonorDashboardScreen({super.key, required this.donor});

  final DonorSessionUser donor;

  @override
  State<DonorDashboardScreen> createState() => _DonorDashboardScreenState();
}

class _DonorDashboardScreenState extends State<DonorDashboardScreen> {
  static const _activityTabIndex = 2;

  final _profileStore = DonorProfileStore.instance;
  final _personalStore = DonorPersonalProfileStore.instance;

  int _currentTab = 0;
  // Bumped on pull-to-refresh; keying the tab stack on it remounts every tab.
  int _refreshVersion = 0;

  bool get _profileComplete => _profileStore.profile.profileComplete;

  /// Pull-to-refresh. Donor data lives in in-memory stores today, so the
  /// reload is a remount of every tab; swap in real fetches here when the
  /// donor endpoints land.
  Future<void> _refreshAll() async {
    if (!mounted) return;
    setState(() => _refreshVersion++);
  }

  @override
  void initState() {
    super.initState();
    _profileStore.addListener(_onProfileChanged);
    _personalStore.addListener(_onProfileChanged);
  }

  @override
  void dispose() {
    _profileStore.removeListener(_onProfileChanged);
    _personalStore.removeListener(_onProfileChanged);
    super.dispose();
  }

  void _onProfileChanged() {
    if (mounted) setState(() {});
  }

  void _openDonationsTab() => setState(() => _currentTab = _activityTabIndex);

  /// Donor interest profiling — same flow as the volunteer setup.
  Future<void> _openProfileSetup() async {
    final wasIncomplete = !_profileComplete;

    final saved = await DonorProfileSetupScreen.open(
      context,
      initialProfile: _profileStore.profile,
    );

    if (!mounted || saved == null) return;
    setState(() {});

    if (wasIncomplete && saved.profileComplete) {
      await showProfileCompletionSuccessDialog(
        context,
        message:
            'Your donor profile has been completed successfully. CARES can '
            'now match you with campaigns that fit your interests.',
      );
    }
  }

  /// Personal information is edited separately from giving preferences.
  String get _firstName {
    final name = widget.donor.firstName.trim();
    return name.isEmpty ? 'Donor' : name;
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
                      firstName: _firstName,
                      email: widget.donor.email,
                      showProfileCompletionCard: !_profileComplete,
                      onCompleteProfile: _openProfileSetup,
                    ),
                    DonorCampaignsTab(email: widget.donor.email),
                    DonorActivityTab(email: widget.donor.email),
                    DonorRanksTab(
                      displayName: widget.donor.fullName,
                      email: widget.donor.email,
                    ),
                    ProfileTabScreen(
                      displayName:
                          _personalStore.profile.fullName.trim().isEmpty
                          ? widget.donor.fullName
                          : _personalStore.profile.fullName,
                      email: widget.donor.email,
                      points: 0,
                      profileComplete: _profileComplete,
                      completionPercent:
                          _profileStore.profile.completionPercent,
                      isDonor: true,
                      onOpenDonations: _openDonationsTab,
                    ),
                  ],
                ),
              ),
            ),
<<<<<<< HEAD
          ),
          DashboardBottomNav(
            currentIndex: _currentTab,
            items: DashboardNavItems.donor,
            onTap: (index) => setState(() => _currentTab = index),
          ),
        ],
=======
            DashboardBottomNav(
              currentIndex: _currentTab,
              onTap: (index) => setState(() => _currentTab = index),
              eventsTabLabel: 'Campaigns',
            ),
          ],
        ),
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
      ),
    );
  }
}
