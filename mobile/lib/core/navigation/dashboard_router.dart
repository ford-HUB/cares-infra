import 'package:flutter/material.dart';
import '../../features/auth/registration/models/registration_data.dart';
import '../../features/dashboard/placeholder_dashboard_screen.dart';
import '../../features/dashboard/student/student_dashboard_screen.dart';
import '../session/app_role.dart';
import '../session/donor_session.dart';
import '../session/role_session.dart';
import '../session/static_user_session.dart';
import 'role_dashboard_shell.dart';

class DashboardRouter {
  DashboardRouter._();

  static Widget screenFor(StaticSessionUser user) {
    if (user.accountType == AccountType.beneficiary) {
      _startRoleSession(
        role: AppRole.beneficiary,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      );
      return const RoleDashboardShell();
    }

    if (user.usesMainDashboard) {
      return StudentDashboardScreen(user: user);
    }

    return PlaceholderDashboardScreen(user: user);
  }

  /// Resolves the dashboard for a server role (`VOLUNTEER`, `DONOR`,
  /// `BENEFICIARY`) so registration and login always land on the dashboard
  /// that matches the account's registered role. The account keeps every role
  /// it is authorized for — see Profile → Account → Switch Role.
  static Widget screenForRoleType(
    String roleType, {
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
  }) {
    final role = AppRoleX.fromApiValue(roleType);

    if (role == AppRole.donor) {
      // Seed the donor record so the donor dashboard has a name to greet.
      DonorSession.instance.register(
        DonorSession.instance.currentDonor ??
            DonorSessionUser(
              firstName: firstName,
              middleName: '',
              lastName: lastName,
              email: email,
              password: '',
            ),
      );
    }

    _startRoleSession(
      role: role,
      email: email,
      firstName: firstName,
      lastName: lastName,
      profileComplete: profileComplete,
    );

    return const RoleDashboardShell();
  }

  static void _startRoleSession({
    required AppRole role,
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
  }) {
    RoleSession.instance.start(
      activeRole: role,
      email: email,
      firstName: firstName,
      lastName: lastName,
      profileComplete: profileComplete,
    );
  }

  static void navigateAfterLogin(BuildContext context, StaticSessionUser user) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => screenFor(user)),
      (_) => false,
    );
  }

  /// Clears the navigation stack and lands on the role's dashboard. Used after
  /// API login and after the API registration flow completes.
  static void navigateToRoleDashboard(
    BuildContext context, {
    required String roleType,
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
  }) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(
        builder: (_) => screenForRoleType(
          roleType,
          email: email,
          firstName: firstName,
          lastName: lastName,
          profileComplete: profileComplete,
        ),
      ),
      (_) => false,
    );
  }
}
