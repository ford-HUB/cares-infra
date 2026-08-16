import 'package:flutter/material.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/dashboard_shell_widgets.dart';
import 'tabs/student_activities_tab.dart';
import 'tabs/student_events_tab.dart';
import 'tabs/student_home_tab.dart';
import 'tabs/student_profile_tab.dart';
import 'tabs/student_ranks_tab.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key, required this.user});

  final StaticSessionUser user;

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  int _currentIndex = 0;

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

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: IndexedStack(index: _currentIndex, children: tabs),
      ),
      bottomNavigationBar: DashboardBottomNav(
        currentIndex: _currentIndex,
        isDonorMode: isDonorMode,
        onTap: (index) => setState(() => _currentIndex = index),
      ),
    );
  }
}
