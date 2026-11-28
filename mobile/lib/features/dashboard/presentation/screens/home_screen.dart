import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/notification_sync.dart';
import 'package:mobile/features/dashboard/data/volunteer_profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/screens/activity_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/events_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/ranks_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/volunteer_home_tab.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';
import 'package:mobile/shared/widgets/dashboard_refresh_shell.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    this.email,
    this.firstName,
    this.displayName,
    this.points = 240,
    this.profileComplete = false,
    this.hasInterests = false,
  });

  final String? email;
  final String? firstName;
  final String? displayName;
  final int points;
  final bool profileComplete;

  /// When false, the interest picker pops once the dashboard appears.
  final bool hasInterests;

  static String greetingFirstName(String? firstName) {
    final trimmed = firstName?.trim() ?? '';
    if (trimmed.isNotEmpty) return trimmed;
    return 'Volunteer';
  }

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentTab = 0;
  // Bumped on pull-to-refresh; keying the tab stack on it remounts every tab.
  int _refreshVersion = 0;
  late bool _profileComplete = widget.profileComplete;
  late bool _hasInterests = widget.hasInterests;
  // Bumped when interests change so the home tab remounts and refetches.
  int _interestsVersion = 0;
  VolunteerProfile? _volunteerProfile;

  final VolunteerProfileService _profileService = VolunteerProfileService();

  String get _displayName =>
      widget.displayName ?? HomeScreen.greetingFirstName(widget.firstName);

  @override
  void initState() {
    super.initState();
    _loadVolunteerProfile().then((_) => _promptForInterests());
  }

  /// Blocks the dashboard until chosen; the dialog saves itself. Skipped
  /// without a session token (the next login prompts). Runs only after the
  /// profile fetch settles, since callers may pass a placeholder
  /// `hasInterests: false`; a failed fetch stays quiet.
  Future<void> _promptForInterests() async {
    if (!mounted || _hasInterests || !AuthSession.isSignedIn) return;
    if (_volunteerProfile == null) return;

    final selected = await showInterestSelectionDialog(context);
    if (!mounted || selected == null) return;

    setState(() {
      _hasInterests = true;
      _interestsVersion++;
      final profile = _volunteerProfile;
      if (profile != null) {
        _volunteerProfile = profile.copyWith(interests: selected);
      }
    });
  }

  Future<void> _loadVolunteerProfile() async {
    try {
      final profile = await _profileService.fetchProfile();
      if (!mounted) return;
      setState(() {
        _volunteerProfile = profile;
        _profileComplete = profile.profileComplete;
        // The server decides both ways: an outside volunteer whose only pick
        // was School is asked again.
        _hasInterests = profile.interests.isNotEmpty;
      });
    } on ApiException {
      // Profile stays as it was; the shell still renders.
    } catch (_) {
      // A failed fetch never blocks the dashboard.
    }
  }

  /// Refetch the shell's data, then remount all tabs, not just the pulled one.
  Future<void> _refreshAll() async {
    await Future.wait([
      _loadVolunteerProfile(),
      NotificationSync.instance.refresh(),
    ]);
    if (!mounted) return;
    setState(() => _refreshVersion++);
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
                    VolunteerHomeTab(
                      key: ValueKey('home-$_interestsVersion'),
                      displayName: _displayName,
                      onSeeAllEvents: () => setState(() => _currentTab = 1),
                      onInterestsChanged: () => setState(() {
                        _hasInterests = true;
                        _interestsVersion++;
                      }),
                    ),
                    const EventsTabScreen(),
                    const ActivityTabScreen(),
                    RanksTabScreen(displayName: _displayName),
                    ProfileTabScreen(
                      displayName: _displayName,
                      email: widget.email,
                      points: widget.points,
                      volunteerProfile: _volunteerProfile,
                      profileComplete: _profileComplete,
                    ),
                  ],
                ),
              ),
            ),
            DashboardBottomNav(
              currentIndex: _currentTab,
              onTap: (index) => setState(() => _currentTab = index),
            ),
          ],
        ),
      ),
    );
  }
}
