import 'package:flutter/material.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_personal_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/tabs/beneficiary_home_tab.dart';
import 'package:mobile/features/dashboard/beneficiary/tabs/beneficiary_requests_tab.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/presentation/screens/activity_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/events_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/mobile_profile_edit_screen.dart';
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

  final _profileService = ProfileService();
  final _roleAccounts = RoleAccountStore.instance;
  final _personalStore = BeneficiaryPersonalProfileStore.instance;

  int _currentTab = 0;
  // Bumped on pull-to-refresh; keying the tab stack on it remounts every tab.
  int _refreshVersion = 0;
  bool _isLoadingProfile = false;

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
    setState(() => _isLoadingProfile = true);
    try {
      await _profileService.syncRoleAccount(
        roleType: RoleAccountStore.beneficiary,
      );
    } on ApiException {
      // The Profile tab surfaces the error with a retry; the home card just
      // stays hidden until a read succeeds.
    } catch (_) {
      // Same as above.
    } finally {
      if (mounted) setState(() => _isLoadingProfile = false);
    }
  }

  /// Pull-to-refresh: refetch the profile, then remount every tab.
  Future<void> _refreshAll() async {
    await _loadProfile();
    if (!mounted) return;
    setState(() => _refreshVersion++);
  }

  /// "Complete your profile" opens the same server-backed edit form the
  /// Profile tab uses; the server re-reads completion on save.
  Future<void> _openProfileSetup() async {
    final wasIncomplete = !_profileComplete;

    final saved = await MobileProfileEditScreen.open(
      context,
      RoleAccountStore.beneficiary,
    );

    if (!mounted || saved == null) return;
    setState(() {});

    if (wasIncomplete && saved.completion.complete) {
      await showProfileCompletionSuccessDialog(
        context,
        message:
            'Your beneficiary profile has been completed successfully. '
            'CARES can now match your household with the right assistance.',
      );
    }
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

  Future<void> _requestAssistance() async {
    final request = await AssistanceRequestFormScreen.open(context);
    if (!mounted) return;
    if (request != null) _openRequestsTab();
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
                    BeneficiaryHomeTab(
                      firstName: _firstName,
                      onRequestAssistance: _requestAssistance,
                      onViewRequests: _openRequestsTab,
                      // Hidden until the server has answered so the card never
                      // flashes on a profile that is actually complete.
                      showProfileCompletionCard:
                          !_isLoadingProfile &&
                          _serverProfile != null &&
                          !_profileComplete,
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
                      isBeneficiary: true,
                    ),
                  ],
                ),
              ),
            ),
<<<<<<< HEAD
          ),
          DashboardBottomNav(
            currentIndex: _currentTab,
            items: DashboardNavItems.beneficiary,
            onTap: (index) => setState(() => _currentTab = index),
          ),
        ],
=======
            DashboardBottomNav(
              currentIndex: _currentTab,
              ranksTabLabel: 'Request',
              ranksTabIcon: Icons.request_page_outlined,
              onTap: (index) => setState(() => _currentTab = index),
            ),
          ],
        ),
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
      ),
    );
  }
}
