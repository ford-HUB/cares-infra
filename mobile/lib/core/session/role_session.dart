import 'package:flutter/foundation.dart';
import 'package:mobile/core/session/app_role.dart';
import 'package:mobile/core/session/mock_account_roles.dart';

/// Holds the roles of the signed-in account and which one is active.
///
/// One account, many roles: switching only changes [activeRole] — no data is
/// cleared, so each role's stores (volunteer profile, beneficiary requests,
/// donor donations) stay exactly as the user left them.
class RoleSession extends ChangeNotifier {
  RoleSession._();

  static final RoleSession instance = RoleSession._();

  AppRole _activeRole = AppRole.volunteer;
  Set<AppRole> _availableRoles = const {AppRole.volunteer};

  String _email = '';
  String _firstName = '';
  String _lastName = '';
  bool _profileComplete = false;

  AppRole get activeRole => _activeRole;

  /// Roles this account is registered or authorized for, in a stable order.
  Set<AppRole> get availableRoles => _availableRoles;

  bool get canSwitchRole => _availableRoles.length > 1;

  bool hasRole(AppRole role) => _availableRoles.contains(role);

  String get email => _email;
  String get firstName => _firstName;
  String get lastName => _lastName;
  bool get profileComplete => _profileComplete;

  String get displayName {
    final parts = [
      _firstName.trim(),
      _lastName.trim(),
    ].where((part) => part.isNotEmpty);
    return parts.join(' ');
  }

  /// Starts a session for a signed-in account. [availableRoles] defaults to the
  /// mock authorization fixture for the account's email.
  void start({
    required AppRole activeRole,
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
    Set<AppRole>? availableRoles,
  }) {
    _email = email.trim();
    _firstName = firstName.trim();
    _lastName = lastName.trim();
    _profileComplete = profileComplete;
    _availableRoles =
        availableRoles ??
        MockAccountRoles.rolesFor(email: _email, registeredRole: activeRole);
    _activeRole = _availableRoles.contains(activeRole)
        ? activeRole
        : _availableRoles.first;
    notifyListeners();
  }

  /// Switches the active role. Ignored when the account is not authorized for
  /// [role] or it is already active.
  bool switchTo(AppRole role) {
    if (!_availableRoles.contains(role) || role == _activeRole) return false;
    _activeRole = role;
    notifyListeners();
    return true;
  }

  /// Grants an extra role to the current account (mock authorization).
  void grantRole(AppRole role) {
    if (_availableRoles.contains(role)) return;
    _availableRoles = {
      for (final value in AppRole.values)
        if (value == role || _availableRoles.contains(value)) value,
    };
    notifyListeners();
  }

  void clear() {
    _activeRole = AppRole.volunteer;
    _availableRoles = const {AppRole.volunteer};
    _email = '';
    _firstName = '';
    _lastName = '';
    _profileComplete = false;
    notifyListeners();
  }
}
