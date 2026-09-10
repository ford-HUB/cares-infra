import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_personal_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/domain/beneficiary_profile.dart';
import 'package:mobile/features/dashboard/beneficiary/screens/beneficiary_personal_info_screen.dart';
import 'package:mobile/features/dashboard/beneficiary/screens/beneficiary_profile_setup_screen.dart';
import 'package:mobile/features/dashboard/beneficiary/tabs/beneficiary_home_tab.dart';
import 'package:mobile/features/dashboard/beneficiary/tabs/beneficiary_requests_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/activity_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/events_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_success_dialog.dart';
import 'package:mobile/features/dashboard/screens/assistance_request_form_screen.dart';
import 'package:mobile/shared/widgets/dashboard_refresh_shell.dart';

/// Beneficiary shell — same structure, layout, and styling as the volunteer
/// [HomeScreen], with beneficiary navigation (Home, Events, Requests,
/// Activity, Profile) and beneficiary content on the home and profile tabs.
class BeneficiaryDashboardScreen extends StatefulWidget {
  const BeneficiaryDashboardScreen({
    super.key,
    this.email,
    this.firstName,
    this.displayName,
  });

  final String? email;
  final String? firstName;
  final String? displayName;

  static String greetingFirstName(String? firstName) {
    final trimmed = firstName?.trim() ?? '';
    if (trimmed.isNotEmpty) return trimmed;
    return 'Beneficiary';
  }

  @override
  State<BeneficiaryDashboardScreen> createState() =>
      _BeneficiaryDashboardScreenState();
}

class _BeneficiaryDashboardScreenState
    extends State<BeneficiaryDashboardScreen> {
  static const _requestTabIndex = 2;

  final _profileStore = BeneficiaryProfileStore.instance;
  final _personalStore = BeneficiaryPersonalProfileStore.instance;

  int _currentTab = 0;
  // Bumped on pull-to-refresh; keying the tab stack on it remounts every tab.
  int _refreshVersion = 0;

  BeneficiaryProfile get _profile => _profileStore.profile;

  /// Pull-to-refresh. Beneficiary data lives in in-memory stores today, so
  /// the reload is a remount of every tab; swap in real fetches here when the
  /// beneficiary endpoints land.
  Future<void> _refreshAll() async {
    if (!mounted) return;
    setState(() => _refreshVersion++);
  }

  bool get _profileComplete => _profile.profileComplete;

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

  Future<void> _openProfileSetup() async {
    final wasIncomplete = !_profileComplete;

    final saved = await BeneficiaryProfileSetupScreen.open(
      context,
      initialProfile: _profile,
    );

    if (!mounted || saved == null) return;
    setState(() {});

    if (wasIncomplete && saved.profileComplete) {
      await showProfileCompletionSuccessDialog(
        context,
        message:
            'Your beneficiary profile has been completed successfully. '
            'CARES can now match your household with the right assistance.',
      );
    }
  }

  /// Personal information is edited separately from assistance details.
  Future<void> _openPersonalInfo() async {
    await BeneficiaryPersonalInfoScreen.open(context);
    if (mounted) setState(() {});
  }

  String get _displayName {
    final personalName = _personalStore.profile.fullName.trim();
    if (personalName.isNotEmpty) return personalName;
    return widget.displayName ??
        BeneficiaryDashboardScreen.greetingFirstName(widget.firstName);
  }

  String get _firstName {
    final personalFirstName = _personalStore.profile.firstName.trim();
    if (personalFirstName.isNotEmpty) return personalFirstName;
    return BeneficiaryDashboardScreen.greetingFirstName(widget.firstName);
  }

  void _openRequestsTab() => setState(() => _currentTab = _requestTabIndex);

  Future<void> _requestAssistance() async {
    final request = await AssistanceRequestFormScreen.open(context);
    if (!mounted) return;
    if (request != null) _openRequestsTab();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                  BeneficiaryHomeTab(
                    firstName: _firstName,
                    onRequestAssistance: _requestAssistance,
                    onViewRequests: _openRequestsTab,
                    showProfileCompletionCard: !_profileComplete,
                    onCompleteProfile: _openProfileSetup,
                  ),
                  const EventsTabScreen(),
                  const ActivityTabScreen(),
                  const BeneficiaryRequestsTab(),
                  ProfileTabScreen(
                    displayName: _displayName,
                    email: widget.email,
                    points: 0,
                    profileComplete: _profileComplete,
                    completionPercent: _profile.completionPercent,
                    isBeneficiary: true,
                    onEditProfile: _openPersonalInfo,
                    onOpenRequests: _openRequestsTab,
                  ),
                ],
              ),
            ),
          ),
          DashboardBottomNav(
            currentIndex: _currentTab,
            items: DashboardNavItems.beneficiary,
            onTap: (index) => setState(() => _currentTab = index),
          ),
        ],
      ),
    );
  }
}
