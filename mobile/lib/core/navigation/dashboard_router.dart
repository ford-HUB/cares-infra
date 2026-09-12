import 'package:flutter/material.dart';
import '../../features/auth/registration/models/registration_data.dart';
import '../../features/dashboard/placeholder_dashboard_screen.dart';
import '../../features/dashboard/student/student_dashboard_screen.dart';
import '../session/app_role.dart';
import '../session/donor_session.dart';
<<<<<<< HEAD
import '../session/role_session.dart';
=======
import '../session/role_account_store.dart';
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
import '../session/static_user_session.dart';
import 'role_dashboard_shell.dart';

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
    bool hasInterests = false,
  }) {
<<<<<<< HEAD
    final role = AppRoleX.fromApiValue(roleType);

    switch (role) {
      case AppRole.beneficiary:
        // Keep the static beneficiary session in sync for role-based routing.
        StaticUserSession.instance.signInWithRole(
=======
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
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
          email: email,
          firstName: firstName,
          lastName: lastName,
          accountType: AccountType.beneficiary,
        );

      case AppRole.donor:
        // Seed the donor record so the donor dashboard has a name to greet.
        DonorSession.instance.register(
          DonorSession.instance.currentDonor ??
              DonorSessionUser(
                firstName: firstName,
                middleName: '',
                lastName: lastName,
                email: email,
              ),
        );

      case AppRole.volunteer:
        break;
    }

    _startRoleSession(
      role: role,
      email: email,
      firstName: firstName,
      lastName: lastName,
      profileComplete: profileComplete,
      hasInterests: hasInterests,
    );

    return const RoleDashboardShell();
  }

  static void _startRoleSession({
    required AppRole role,
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
    bool hasInterests = false,
  }) {
    RoleSession.instance.start(
      activeRole: role,
      email: email,
      firstName: firstName,
      lastName: lastName,
      profileComplete: profileComplete,
      hasInterests: hasInterests,
    );
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
