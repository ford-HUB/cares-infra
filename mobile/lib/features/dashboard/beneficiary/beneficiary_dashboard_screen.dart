import 'package:flutter/material.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_personal_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/tabs/beneficiary_activity_tab.dart';
import 'package:mobile/features/dashboard/beneficiary/tabs/beneficiary_home_tab.dart';
import 'package:mobile/features/dashboard/beneficiary/tabs/beneficiary_requests_tab.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/presentation/screens/events_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';
import 'package:mobile/shared/widgets/dashboard_refresh_shell.dart';

/// Beneficiary shell — same structure, layout, and styling as the volunteer
/// [HomeScreen], with the Request tab replacing Ranks and beneficiary content
/// on the home and profile tabs.
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
  static const _requestTabIndex = 3;

  final _profileService = ProfileService();
  final _roleAccounts = RoleAccountStore.instance;
  final _personalStore = BeneficiaryPersonalProfileStore.instance;

  int _currentTab = 0;
  // Bumped on pull-to-refresh; keying the tab stack on it remounts every tab.
  int _refreshVersion = 0;

  /// The server's read of the record, mirrored onto the beneficiary role
  /// account by [ProfileService]. Null until the first fetch lands (or on the
  /// signed-out prototype paths).
  MobileProfile? get _serverProfile =>
      _roleAccounts.byType(RoleAccountStore.beneficiary)?.serverProfile;

  /// Completion is the server's verdict — personal details plus household
  /// size — never something computed on the device.
  bool get _profileComplete => _serverProfile?.completion.complete ?? false;

  @override
  void initState() {
    super.initState();
    _roleAccounts.addListener(_onProfileChanged);
    _personalStore.addListener(_onProfileChanged);
    if (_serverProfile == null) _loadProfile();
  }

  @override
  void dispose() {
    _roleAccounts.removeListener(_onProfileChanged);
    _personalStore.removeListener(_onProfileChanged);
    super.dispose();
  }

  void _onProfileChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadProfile() async {
    if (!AuthSession.isSignedIn) return;
    try {
      await _profileService.syncRoleAccount(
        roleType: RoleAccountStore.beneficiary,
      );
    } on ApiException {
      // The Profile tab surfaces the error with a retry.
    } catch (_) {
      // Same as above.
    }
    if (mounted) setState(() {});
  }

  /// Pull-to-refresh: refetch the profile and the feed, then remount every
  /// tab.
  Future<void> _refreshAll() async {
    await Future.wait([_loadProfile(), NotificationSync.instance.refresh()]);
    if (!mounted) return;
    setState(() => _refreshVersion++);
  }

  /// Personal information is edited separately from assistance details.
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
                    BeneficiaryHomeTab(
                      firstName: _firstName,
                      onViewRequests: _openRequestsTab,
                    ),
                    const EventsTabScreen(forBeneficiary: true),
                    const BeneficiaryActivityTab(),
                    const BeneficiaryRequestsTab(),
                    ProfileTabScreen(
                      displayName: _displayName,
                      email: widget.email,
                      points: 0,
                      profileComplete: _profileComplete,
                      isBeneficiary: true,
                    ),
                  ],
                ),
              ),
            ),
            DashboardBottomNav(
              currentIndex: _currentTab,
              ranksTabLabel: 'Request',
              ranksTabIcon: Icons.request_page_outlined,
              onTap: (index) => setState(() => _currentTab = index),
            ),
          ],
        ),
      ),
    );
  }
}
