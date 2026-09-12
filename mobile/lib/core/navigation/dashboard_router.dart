import 'package:flutter/material.dart';
import '../../features/auth/registration/models/registration_data.dart';
import '../../features/dashboard/beneficiary/beneficiary_dashboard_screen.dart';
import '../../features/dashboard/placeholder_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/donor_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/home_screen.dart';
import '../../features/dashboard/student/student_dashboard_screen.dart';
import '../session/donor_session.dart';
import '../session/role_account_store.dart';
import '../session/static_user_session.dart';

class DashboardRouter {
  DashboardRouter._();

  static Widget screenFor(StaticSessionUser user) {
    RoleAccountStore.instance.signIn(
      roleType: user.accountType == AccountType.beneficiary
          ? RoleAccountStore.beneficiary
          : RoleAccountStore.volunteer,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    );

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
    bool hasInterests = false,
  }) {
    // Record the role on the person's account list: the first role seen for
    // this email is the unlocked primary, the rest start locked.
    RoleAccountStore.instance.signIn(
      roleType: roleType,
      email: email,
      firstName: firstName,
      lastName: lastName,
    );

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
          hasInterests: hasInterests,
        );
    }
  }

  static void navigateAfterLogin(BuildContext context, StaticSessionUser user) {
    // Resolve the screen before pushing: screenFor() writes to the session
    // stores (notifyListeners), which must not run inside a route builder.
    final screen = screenFor(user);
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => screen),
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
    bool hasInterests = false,
  }) {
    // Resolve the screen before pushing: screenForRoleType() writes to the
    // session stores (notifyListeners), which must not run inside a route
    // builder — that throws "setState() called during build" and re-runs the
    // sign-in side effects on every rebuild of the route.
    final screen = screenForRoleType(
      roleType,
      email: email,
      firstName: firstName,
      lastName: lastName,
      profileComplete: profileComplete,
      hasInterests: hasInterests,
    );
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => screen),
      (_) => false,
    );
  }
}
