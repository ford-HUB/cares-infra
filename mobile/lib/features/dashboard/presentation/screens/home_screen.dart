import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_profile.dart';
import 'package:mobile/features/dashboard/presentation/screens/activity_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/programs_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/profile_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/ranks_tab_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/volunteer_home_tab.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';

/// Main authenticated shell — home landing, events, and bottom navigation.
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    this.email,
    this.firstName,
    this.displayName,
    this.points = 240,
  });

  final String? email;
  final String? firstName;
  final String? displayName;
  final int points;

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

  String get _displayName =>
      widget.displayName ??
      HomeScreen.greetingFirstName(widget.firstName);

  String get _firstName => HomeScreen.greetingFirstName(widget.firstName);

  Set<String> get _userInterests {
    final profile = MockProfiles.forUser(
      displayName: _displayName,
      email: widget.email,
      points: widget.points,
    );
    return profile.interests.toSet();
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
