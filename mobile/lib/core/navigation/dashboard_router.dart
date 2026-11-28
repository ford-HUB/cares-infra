import 'package:flutter/material.dart';
import '../../features/auth/registration/models/registration_data.dart';
import '../../features/dashboard/beneficiary/beneficiary_dashboard_screen.dart';
import '../../features/dashboard/placeholder_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/donor_dashboard_screen.dart';
import '../../features/dashboard/presentation/screens/home_screen.dart';
import '../../features/dashboard/presentation/widgets/notification_host.dart';
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

  static Widget screenForRoleType(
    String roleType, {
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
    bool hasInterests = false,
    List<String> unlockedRoles = const [],
  }) {
    // First role seen for an email is the unlocked primary; others start locked
    // unless in [unlockedRoles].
    RoleAccountStore.instance.signIn(
      roleType: roleType,
      email: email,
      firstName: firstName,
      lastName: lastName,
      unlockedRoles: unlockedRoles,
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
    // screenFor() notifies session stores, so it must run outside the route
    // builder.
    final screen = screenFor(user);
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => NotificationHost(child: screen)),
      (_) => false,
    );
  }

  static void navigateToRoleDashboard(
    BuildContext context, {
    required String roleType,
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
    bool hasInterests = false,
    List<String> unlockedRoles = const [],
  }) {
    // Resolved outside the route builder: screenForRoleType() notifies session
    // stores.
    final screen = screenForRoleType(
      roleType,
      email: email,
      firstName: firstName,
      lastName: lastName,
      profileComplete: profileComplete,
      hasInterests: hasInterests,
      unlockedRoles: unlockedRoles,
    );
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => NotificationHost(child: screen)),
      (_) => false,
    );
  }
}
