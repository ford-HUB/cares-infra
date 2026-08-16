import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/volunteer_profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/screens/activity_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/programs_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/ranks_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/volunteer_home_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/volunteer_profile_edit_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/volunteer_profile_setup_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_success_dialog.dart';

/// Main authenticated shell — home landing, events, and bottom navigation.
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    this.email,
    this.firstName,
    this.displayName,
    this.points = 240,
    this.profileComplete = false,
  });

  final String? email;
  final String? firstName;
  final String? displayName;
  final int points;
  final bool profileComplete;

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
  late bool _profileComplete = widget.profileComplete;
  VolunteerProfile? _volunteerProfile;
  bool _isLoadingProfile = true;

  final VolunteerProfileService _profileService = VolunteerProfileService();

  String get _displayName =>
      widget.displayName ?? HomeScreen.greetingFirstName(widget.firstName);

  String get _firstName => HomeScreen.greetingFirstName(widget.firstName);

  Set<String> get _userInterests =>
      _volunteerProfile?.interestLabels.toSet() ?? const {};

  @override
  void initState() {
    super.initState();
    _loadVolunteerProfile();
  }

  Future<void> _loadVolunteerProfile() async {
    setState(() => _isLoadingProfile = true);

    try {
      final profile = await _profileService.fetchProfile();
      if (!mounted) return;
      setState(() {
        _volunteerProfile = profile;
        _profileComplete = profile.profileComplete;
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

  Future<void> _openProfileEdit() async {
    final result = await Navigator.of(context).push<VolunteerProfileEditResult>(
      MaterialPageRoute(
        builder: (_) => VolunteerProfileEditScreen(
          initialProfile: _volunteerProfile,
          fallbackEmail: widget.email,
          fallbackFirstName: widget.firstName,
        ),
      ),
    );

    if (!mounted || result == null) return;

    setState(() {
      _volunteerProfile = result.profile;
      _profileComplete = result.profile.profileComplete;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Expanded(
            child: IndexedStack(
              index: _currentTab,
              children: [
                VolunteerHomeTab(
                  firstName: _firstName,
                  points: widget.points,
                  showProfileCompletionCard:
                      !_isLoadingProfile && !_profileComplete,
                  onCompleteProfile: _openProfileSetup,
                ),
                ProgramsTabScreen(userInterests: _userInterests),
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
                  onEditProfile: _openProfileEdit,
                ),
              ],
            ),
          ),
          DashboardBottomNav(
            currentIndex: _currentTab,
            onTap: (index) => setState(() => _currentTab = index),
          ),
        ],
      ),
    );
  }
}
