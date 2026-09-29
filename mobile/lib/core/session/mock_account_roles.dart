import 'package:mobile/core/session/app_role.dart';

/// Mock role authorization — which roles each account is allowed to switch to.
///
/// Static prototype data only: in the real system this comes from the account's
/// registered roles. Accounts that are not listed are treated as authorized for
/// every role so the switching flow can be demoed with any test login.
abstract final class MockAccountRoles {
  static const Map<String, Set<AppRole>> _rolesByEmail = {
    'volunteer.only@cares.local': {AppRole.volunteer},
    'beneficiary.only@cares.local': {AppRole.beneficiary},
    'donor.only@cares.local': {AppRole.donor},
    'multi.role@cares.local': {
      AppRole.volunteer,
      AppRole.beneficiary,
      AppRole.donor,
    },
  };

  /// Roles [email] may use. The role the account signed in with is always
  /// included, even when the fixture does not list it.
  static Set<AppRole> rolesFor({
    required String email,
    required AppRole registeredRole,
  }) {
    final granted = _rolesByEmail[email.trim().toLowerCase()];
    final roles = <AppRole>{
      registeredRole,
      ...(granted ?? AppRole.values.toSet()),
    };

    // Keep a stable order for the switcher list.
    return {
      for (final role in AppRole.values)
        if (roles.contains(role)) role,
    };
  }
}
