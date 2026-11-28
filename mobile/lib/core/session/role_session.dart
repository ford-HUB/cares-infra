import 'package:flutter/foundation.dart';
import 'package:mobile/core/session/app_role.dart';
import 'package:mobile/core/session/mock_account_roles.dart';

/// Switching only changes [activeRole]; each role's stores are kept.
class RoleSession extends ChangeNotifier {
  RoleSession._();

  static final RoleSession instance = RoleSession._();

  AppRole _activeRole = AppRole.volunteer;
  Set<AppRole> _availableRoles = const {AppRole.volunteer};

  String _email = '';
  String _firstName = '';
  String _lastName = '';
  bool _profileComplete = false;
  bool _hasInterests = false;

  AppRole get activeRole => _activeRole;

  Set<AppRole> get availableRoles => _availableRoles;

  bool get canSwitchRole => _availableRoles.length > 1;

  bool hasRole(AppRole role) => _availableRoles.contains(role);

  String get email => _email;
  String get firstName => _firstName;
  String get lastName => _lastName;
  bool get profileComplete => _profileComplete;

  bool get hasInterests => _hasInterests;

  String get displayName {
    final parts = [
      _firstName.trim(),
      _lastName.trim(),
    ].where((part) => part.isNotEmpty);
    return parts.join(' ');
  }

  /// [availableRoles] defaults to the mock authorization fixture.
  void start({
    required AppRole activeRole,
    required String email,
    String firstName = '',
    String lastName = '',
    bool profileComplete = false,
    bool hasInterests = false,
    Set<AppRole>? availableRoles,
  }) {
    _email = email.trim();
    _firstName = firstName.trim();
    _lastName = lastName.trim();
    _profileComplete = profileComplete;
    _hasInterests = hasInterests;
    _availableRoles =
        availableRoles ??
        MockAccountRoles.rolesFor(email: _email, registeredRole: activeRole);
    _activeRole = _availableRoles.contains(activeRole)
        ? activeRole
        : _availableRoles.first;
    notifyListeners();
  }

  bool switchTo(AppRole role) {
    if (!_availableRoles.contains(role) || role == _activeRole) return false;
    _activeRole = role;
    notifyListeners();
    return true;
  }

  /// Mock authorization only.
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
    _hasInterests = false;
    notifyListeners();
  }
}
