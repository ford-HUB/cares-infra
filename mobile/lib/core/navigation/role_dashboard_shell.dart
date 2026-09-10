import 'package:flutter/material.dart';
import 'package:mobile/core/session/app_role.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/session/role_session.dart';
import 'package:mobile/features/dashboard/beneficiary/beneficiary_dashboard_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_dashboard_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/home_screen.dart';

/// Root shell for a signed-in account. It rebuilds whenever the active role
/// changes, so switching roles swaps the dashboard, navigation, and features
/// in place — same account, no new login.
class RoleDashboardShell extends StatelessWidget {
  const RoleDashboardShell({super.key});

  @override
  Widget build(BuildContext context) {
    final session = RoleSession.instance;

    return AnimatedBuilder(
      animation: session,
      builder: (context, _) {
        // Keyed per role so each dashboard keeps its own tab state and is not
        // rebuilt into a different role's layout.
        return KeyedSubtree(
          key: ValueKey(session.activeRole),
          child: _dashboardFor(session),
        );
      },
    );
  }

  Widget _dashboardFor(RoleSession session) {
    final displayName = session.displayName.trim();

    switch (session.activeRole) {
      case AppRole.beneficiary:
        return BeneficiaryDashboardScreen(
          email: session.email,
          firstName: session.firstName,
          displayName: displayName.isEmpty ? null : displayName,
        );

      case AppRole.donor:
        final donor =
            DonorSession.instance.currentDonor ??
            DonorSessionUser(
              firstName: session.firstName,
              middleName: '',
              lastName: session.lastName,
              email: session.email,
            );
        // Keep the donor record on the same account when switching in.
        DonorSession.instance.register(donor);
        return DonorDashboardScreen(donor: donor);

      case AppRole.volunteer:
        return HomeScreen(
          email: session.email,
          firstName: session.firstName,
          displayName: displayName.isEmpty ? null : displayName,
          profileComplete: session.profileComplete,
        );
    }
  }
}
