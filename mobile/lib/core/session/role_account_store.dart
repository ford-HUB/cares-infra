import 'package:flutter/material.dart';

import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';

/// Whether a role can be used right now or still has to be unlocked.
enum RoleAccountStatus { unlocked, locked }

/// What the person has to do before a locked role opens up.
enum RoleUnlockRequirement {
  /// Opens on tap — nothing extra to verify.
  none,

  /// Upload a valid ID and pass the face match against it.
  idAndFaceVerification,
}

/// One role on the signed-in person's account, with its own profile data.
///
/// Every role keeps a separate name, email and avatar so the Profile tab and
/// the role switcher never mix donor details into the volunteer side and vice
/// versa.
class RoleAccount {
  const RoleAccount({
    required this.roleType,
    required this.displayName,
    required this.email,
    required this.avatarColor,
    required this.status,
    required this.requirement,
    required this.memberSince,
    this.avatarAssetPath,
    this.avatarUrl,
    this.serverProfile,
  });

  /// Server-style role type (`VOLUNTEER`, `DONOR`, `BENEFICIARY`).
  final String roleType;

  final String displayName;

  final String email;

  final Color avatarColor;

  /// Optional local asset for this role's own profile picture.
  final String? avatarAssetPath;

  /// The server's avatar stream once a photo is on file. Carries a version
  /// query so the image cache drops the old bytes after an upload.
  final String? avatarUrl;

  final RoleAccountStatus status;

  final RoleUnlockRequirement requirement;

  final String memberSince;

  /// The role's record from `GET /profile/me/mobile`, once synced. Null until
  /// the first successful fetch (or on prototype paths with no token).
  final MobileProfile? serverProfile;

  bool get isLocked => status == RoleAccountStatus.locked;

  bool get isUnlocked => status == RoleAccountStatus.unlocked;

  String get roleLabel => RoleAccountStore.labelFor(roleType);

  String get initial =>
      displayName.trim().isNotEmpty ? displayName.trim()[0].toUpperCase() : '?';

  String get firstName => displayName.trim().split(' ').first;

  String get lastName {
    final parts = displayName.trim().split(' ');
    return parts.length > 1 ? parts.sublist(1).join(' ') : '';
  }

  /// Short line shown under the name in the switcher when the role is locked.
  String get unlockHint => switch (requirement) {
    RoleUnlockRequirement.none => 'Tap to activate',
    RoleUnlockRequirement.idAndFaceVerification =>
      'Verify your school ID and face to unlock',
  };

  RoleAccount copyWith({
    String? displayName,
    String? email,
    Color? avatarColor,
    String? avatarAssetPath,
    String? avatarUrl,
    RoleAccountStatus? status,
    RoleUnlockRequirement? requirement,
    String? memberSince,
    MobileProfile? serverProfile,
    bool clearAvatarUrl = false,
  }) {
    return RoleAccount(
      roleType: roleType,
      displayName: displayName ?? this.displayName,
      email: email ?? this.email,
      avatarColor: avatarColor ?? this.avatarColor,
      avatarAssetPath: avatarAssetPath ?? this.avatarAssetPath,
      avatarUrl: clearAvatarUrl ? null : (avatarUrl ?? this.avatarUrl),
      status: status ?? this.status,
      requirement: requirement ?? this.requirement,
      memberSince: memberSince ?? this.memberSince,
      serverProfile: serverProfile ?? this.serverProfile,
    );
  }
}

/// In-memory record of every role the signed-in person holds, which one is
/// active, and which ones are still locked.
///
/// The role used at registration / login is unlocked and becomes the primary
/// role. The other roles are seeded as locked; the switcher on the Profile tab
/// walks the person through the unlock requirement before letting them in.
/// Cleared on sign-out and when a different email signs in.
class RoleAccountStore extends ChangeNotifier {
  RoleAccountStore._();

  static final RoleAccountStore instance = RoleAccountStore._();

  static const volunteer = 'VOLUNTEER';
  static const donor = 'DONOR';
  static const beneficiary = 'BENEFICIARY';

  static const List<String> allRoleTypes = [volunteer, donor, beneficiary];

  static String normalize(String roleType) => roleType.trim().toUpperCase();

  static String labelFor(String roleType) => switch (normalize(roleType)) {
    donor => 'Donor',
    beneficiary => 'Beneficiary',
    _ => 'Volunteer',
  };

  /// Avatar colour per role so each side has its own look even before a
  /// picture is uploaded.
  static Color avatarColorFor(String roleType) => switch (normalize(roleType)) {
    donor => const Color(0xFFE65100),
    beneficiary => const Color(0xFF1565C0),
    _ => const Color(0xFF1F5F28),
  };

  /// Only volunteers register with an ID + face match, so unlocking that side
  /// repeats the check. Donor and beneficiary accounts are ID-less (the email
  /// OTP vouches for them), so activating those is instant.
  static RoleUnlockRequirement requirementFor(String roleType) =>
      switch (normalize(roleType)) {
        volunteer => RoleUnlockRequirement.idAndFaceVerification,
        _ => RoleUnlockRequirement.none,
      };

  final Map<String, RoleAccount> _accounts = {};

  String? _ownerEmail;

  String? _activeRoleType;

  String? _primaryRoleType;

  bool get isEmpty => _accounts.isEmpty;

  /// Roles in a stable order: volunteer, donor, beneficiary.
  List<RoleAccount> get accounts => [
    for (final type in allRoleTypes)
      if (_accounts[type] != null) _accounts[type]!,
  ];

  RoleAccount? get active =>
      _activeRoleType == null ? null : _accounts[_activeRoleType!];

  /// The role the person originally registered / signed in with.
  RoleAccount? get primary =>
      _primaryRoleType == null ? null : _accounts[_primaryRoleType!];

  RoleAccount? byType(String roleType) => _accounts[normalize(roleType)];

  /// Every role other than the active one — what the switcher lists.
  List<RoleAccount> get switchable =>
      accounts.where((a) => a.roleType != _activeRoleType).toList();

  bool isUnlocked(String roleType) => byType(roleType)?.isUnlocked ?? false;

  /// Called whenever a dashboard is opened for [roleType].
  ///
  /// First sign-in for this email: the role becomes the unlocked primary and
  /// the other roles are seeded as locked. Later calls with the same email
  /// only make [roleType] active (and unlock it if a server login says so).
  void signIn({
    required String roleType,
    required String email,
    String firstName = '',
    String lastName = '',
  }) {
    final type = normalize(roleType);
    final key = email.trim().toLowerCase();
    final name = [
      firstName.trim(),
      lastName.trim(),
    ].where((p) => p.isNotEmpty).join(' ');

    if (_ownerEmail != key) {
      _accounts.clear();
      _ownerEmail = key;
      _primaryRoleType = type;
    }

    for (final other in allRoleTypes) {
      _accounts.putIfAbsent(
        other,
        () => RoleAccount(
          roleType: other,
          displayName: name,
          email: email.trim(),
          avatarColor: avatarColorFor(other),
          status: RoleAccountStatus.locked,
          requirement: requirementFor(other),
          memberSince: _memberSinceNow(),
        ),
      );
    }

    final current = _accounts[type]!;
    _accounts[type] = current.copyWith(
      displayName: name.isNotEmpty ? name : null,
      email: email.trim().isNotEmpty ? email.trim() : null,
      status: RoleAccountStatus.unlocked,
    );

    _activeRoleType = type;
    notifyListeners();
  }

  /// Marks [roleType] usable. Optional [displayName] / [email] let the unlock
  /// flow store the details captured for that role (e.g. the name read off the
  /// ID) separately from the primary role.
  void unlock(String roleType, {String? displayName, String? email}) {
    final type = normalize(roleType);
    final account = _accounts[type];
    if (account == null) return;

    _accounts[type] = account.copyWith(
      displayName: displayName,
      email: email,
      status: RoleAccountStatus.unlocked,
      memberSince: _memberSinceNow(),
    );
    notifyListeners();
  }

  /// Switches the active role. Locked roles are ignored — go through
  /// [unlock] first.
  void activate(String roleType) {
    final type = normalize(roleType);
    if (!isUnlocked(type) || _activeRoleType == type) return;
    _activeRoleType = type;
    notifyListeners();
  }

  /// Updates the profile details of one role without touching the others.
  void updateAccount(
    String roleType, {
    String? displayName,
    String? email,
    String? avatarAssetPath,
  }) {
    final type = normalize(roleType);
    final account = _accounts[type];
    if (account == null) return;
    _accounts[type] = account.copyWith(
      displayName: displayName,
      email: email,
      avatarAssetPath: avatarAssetPath,
    );
    notifyListeners();
  }

  /// One `Account` row backs every role, so a sign-in email change lands on
  /// all of them at once; the owner key follows so a later sync is not
  /// mistaken for a different person signing in.
  void updateEmailEverywhere(String email) {
    final trimmed = email.trim();
    if (trimmed.isEmpty) return;
    for (final entry in _accounts.entries) {
      _accounts[entry.key] = entry.value.copyWith(email: trimmed);
    }
    _ownerEmail = trimmed.toLowerCase();
    notifyListeners();
  }

  /// Mirrors a server profile onto the role it was scoped to
  /// (`profiling_role` — the side the app asked for, which can differ from
  /// the registered role after a local switch): name, email, member-since and
  /// the role-specific section. That role is marked unlocked — the app only
  /// asks for a side the person has already opened.
  void applyServerProfile(MobileProfile profile, {String? avatarUrl}) {
    final type = normalize(profile.profilingRole);
    final key = profile.email.trim().toLowerCase();

    if (_accounts.isEmpty || (_ownerEmail != null && _ownerEmail != key)) {
      // The registered role stays the primary; the profiling role is filled
      // in below.
      signIn(
        roleType: profile.roleType,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      );
    }

    final account = _accounts[type];
    if (account == null) return;

    _accounts[type] = account.copyWith(
      displayName: profile.fullName.isNotEmpty ? profile.fullName : null,
      email: profile.email.trim().isNotEmpty ? profile.email.trim() : null,
      memberSince: profile.memberSinceLabel,
      // Photos are per role on the server, so a side with no picture on
      // file must not keep showing one it never had.
      avatarUrl: avatarUrl,
      clearAvatarUrl: avatarUrl == null,
      status: RoleAccountStatus.unlocked,
      serverProfile: profile,
    );
    notifyListeners();
  }

  void clear() {
    _accounts.clear();
    _ownerEmail = null;
    _activeRoleType = null;
    _primaryRoleType = null;
    notifyListeners();
  }

  static String _memberSinceNow() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    final now = DateTime.now();
    return '${months[now.month - 1]} ${now.year}';
  }
}
