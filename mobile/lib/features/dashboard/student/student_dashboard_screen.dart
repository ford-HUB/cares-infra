import 'package:flutter/material.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/dashboard_shell_widgets.dart';
import 'tabs/student_activities_tab.dart';
import 'tabs/student_events_tab.dart';
import 'tabs/student_home_tab.dart';
import 'tabs/student_profile_tab.dart';
import 'tabs/student_ranks_tab.dart';
import 'package:mobile/shared/widgets/dashboard_refresh_shell.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key, required this.user});

  final StaticSessionUser user;

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  int _currentIndex = 0;
  // Bumped on pull-to-refresh; keying the tab stack on it remounts every tab.
  int _refreshVersion = 0;

  /// Pull-to-refresh: remount every tab so each reloads from scratch.
  Future<void> _refreshAll() async {
    if (!mounted) return;
    setState(() => _refreshVersion++);
  }

  void _toggleVolunteerDonor() {
    setState(() {
      StaticUserSession.instance.isDonorMode =
          !StaticUserSession.instance.isDonorMode;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDonorMode = StaticUserSession.instance.isDonorMode;

    final tabs = [
      StudentHomeTab(
        user: widget.user,
        isDonorMode: isDonorMode,
        onModeToggle: _toggleVolunteerDonor,
      ),
      StudentEventsTab(isDonorMode: isDonorMode),
      const StudentActivitiesTab(),
      const StudentRanksTab(),
      StudentProfileTab(
        user: widget.user,
        onNavigateToTab: (index) => setState(() => _currentIndex = index),
      ),
    ];

    // Back gesture on a secondary tab returns to Home before leaving the app.
    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _currentIndex = 0);
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: DashboardRefreshShell(
            onRefresh: _refreshAll,
            edgeOffset: 0,
            child: IndexedStack(
              key: ValueKey(_refreshVersion),
              index: _currentIndex,
              children: tabs,
            ),
          ),
        ),
        bottomNavigationBar: DashboardBottomNav(
          currentIndex: _currentIndex,
          isDonorMode: isDonorMode,
          onTap: (index) => setState(() => _currentIndex = index),
        ),
      ),
    );
  }
}
