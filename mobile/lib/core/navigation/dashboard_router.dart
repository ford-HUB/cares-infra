import 'package:flutter/material.dart';
import '../../features/auth/registration/models/registration_data.dart';
import '../../features/dashboard/placeholder_dashboard_screen.dart';
import '../../features/dashboard/student/student_dashboard_screen.dart';
import '../session/static_user_session.dart';

class DashboardRouter {
  DashboardRouter._();

  static Widget screenFor(StaticSessionUser user) {
    if (user.accountType == AccountType.regularUser &&
        user.userRole == UserRole.student) {
      return StudentDashboardScreen(user: user);
    }

    return PlaceholderDashboardScreen(user: user);
  }

  static void navigateAfterLogin(BuildContext context, StaticSessionUser user) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => screenFor(user)),
      (_) => false,
    );
  }
}
