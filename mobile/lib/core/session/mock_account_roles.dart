import 'package:mobile/core/session/app_role.dart';

/// Prototype fixture; unlisted accounts may use every role so switching can be
/// demoed.
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

  /// Always includes the role the account signed in with.
  static Set<AppRole> rolesFor({
    required String email,
    required AppRole registeredRole,
  }) {
    final granted = _rolesByEmail[email.trim().toLowerCase()];
    final roles = <AppRole>{
      registeredRole,
      ...(granted ?? AppRole.values.toSet()),
    };

    return {
      for (final role in AppRole.values)
        if (roles.contains(role)) role,
    };
  }
}
