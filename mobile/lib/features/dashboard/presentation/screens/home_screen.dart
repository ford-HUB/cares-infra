import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/volunteer_profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/screens/activity_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/events_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/ranks_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/volunteer_home_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/volunteer_profile_setup_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_success_dialog.dart';
import 'package:mobile/features/interests/presentation/widgets/interest_selection_dialog.dart';
import 'package:mobile/shared/widgets/dashboard_refresh_shell.dart';

/// Main authenticated shell — home landing, events, and bottom navigation.
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

  /// Whether the volunteer has already picked event-type interests. When
  /// false the interest picker pops as soon as the dashboard appears.
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
  // Bumped when interests change so the home tab's recommendations refetch.
  int _interestsVersion = 0;
  VolunteerProfile? _volunteerProfile;
  bool _isLoadingProfile = true;

  final VolunteerProfileService _profileService = VolunteerProfileService();

  String get _displayName =>
      widget.displayName ?? HomeScreen.greetingFirstName(widget.firstName);

  String get _firstName => HomeScreen.greetingFirstName(widget.firstName);

  @override
  void initState() {
    super.initState();
    _loadVolunteerProfile().then((_) => _promptForInterests());
  }

  /// First-time volunteers have no interests on file, so the picker blocks
  /// the dashboard until they choose. The dialog saves to the server itself;
  /// it only returns once that succeeds. Skipped when there is no session
  /// token (e.g. straight after registration) because the save could never
  /// be accepted — the next real login carries `has_interests: false` and
  /// prompts then.
  ///
  /// Only runs after the profile fetch has settled: callers such as the role
  /// switcher land here with `hasInterests: false` as a placeholder, so the
  /// server's record — not the constructor flag — decides whether to prompt.
  /// If the fetch failed we have no record to trust and stay quiet rather
  /// than re-asking someone who may already have chosen.
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
    setState(() => _isLoadingProfile = true);

    try {
      final profile = await _profileService.fetchProfile();
      if (!mounted) return;
      setState(() {
        _volunteerProfile = profile;
        _profileComplete = profile.profileComplete;
        if (profile.interests.isNotEmpty) _hasInterests = true;
        _isLoadingProfile = false;
      });
    } on ApiException {
      if (!mounted) return;
      setState(() => _isLoadingProfile = false);
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingProfile = false);
    }
  }

  /// Pull-to-refresh: refetch the shell's own data, then remount all tabs so
  /// each one reloads from scratch, not just the page that was pulled.
  Future<void> _refreshAll() async {
    await _loadVolunteerProfile();
    if (!mounted) return;
    setState(() => _refreshVersion++);
  }

  Future<void> _openProfileSetup() async {
    final wasIncomplete = !_profileComplete;

    final saved = await Navigator.of(context).push<VolunteerProfile>(
      MaterialPageRoute(
        builder: (_) =>
            VolunteerProfileSetupScreen(initialProfile: _volunteerProfile),
      ),
    );

    if (!mounted || saved == null) return;

    setState(() {
      _volunteerProfile = saved;
      _profileComplete = saved.profileComplete;
    });

    if (wasIncomplete && saved.profileComplete) {
      await showProfileCompletionSuccessDialog(context);
    }
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
                      firstName: _firstName,
                      points: widget.points,
                      showProfileCompletionCard:
                          !_isLoadingProfile && !_profileComplete,
                      onCompleteProfile: _openProfileSetup,
                      onSeeAllEvents: () => setState(() => _currentTab = 1),
                      interestsVersion: _interestsVersion,
                      onInterestsChanged: () => setState(() {
                        _hasInterests = true;
                        _interestsVersion++;
                      }),
                    ),
                    const EventsTabScreen(),
                    const ActivityTabScreen(),
                    RanksTabScreen(
                      displayName: _displayName,
                      points: widget.points,
                    ),
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
