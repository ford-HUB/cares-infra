import 'package:flutter/material.dart';
import '../../features/auth/registration/models/registration_data.dart';
import '../../features/dashboard/beneficiary/beneficiary_dashboard_screen.dart';
import '../../features/dashboard/placeholder_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/donor_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/home_screen.dart';
import '../../features/dashboard/student/student_dashboard_screen.dart';
import '../session/donor_session.dart';
import '../session/static_user_session.dart';

class DashboardRouter {
  DashboardRouter._();

  static Widget screenFor(StaticSessionUser user) {
    if (user.accountType == AccountType.beneficiary) {
      return BeneficiaryDashboardScreen(
        email: user.email,
        firstName: user.firstName,
        displayName: user.fullName.trim().isEmpty ? null : user.fullName,
      );
    }

    if (user.usesMainDashboard) {
      return StudentDashboardScreen(user: user);
    }

    return PlaceholderDashboardScreen(user: user);
  }

  /// Resolves the dashboard for a server role (`VOLUNTEER`, `DONOR`,
  /// `BENEFICIARY`) so registration and login always land on the dashboard
  /// that matches the account's registered role.
  static Widget screenForRoleType(
    String roleType, {
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
  }) {
    switch (roleType.trim().toUpperCase()) {
      case 'BENEFICIARY':
        final user = StaticUserSession.instance.signInWithRole(
          email: email,
          firstName: firstName,
          lastName: lastName,
          accountType: AccountType.beneficiary,
        );
        return BeneficiaryDashboardScreen(
          email: user.email,
          firstName: user.firstName,
          displayName: user.fullName.trim().isEmpty ? null : user.fullName,
        );

      case 'DONOR':
        final donor =
            DonorSession.instance.currentDonor ??
            DonorSessionUser(
              firstName: firstName,
              middleName: '',
              lastName: lastName,
              email: email,
            );
        DonorSession.instance.register(donor);
        return DonorDashboardScreen(donor: donor);

      default:
        return HomeScreen(
          email: email,
          firstName: firstName,
          profileComplete: profileComplete,
        );
    }
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
