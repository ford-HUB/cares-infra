import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/models/user_request_models.dart';

enum RoleAccountStatus { unlocked, locked, pending }

enum RoleUnlockRequirement {
  none,

  idAndFaceVerification,
}

/// Each role keeps its own name, email and avatar so sides never mix.
class RoleAccount {
  const RoleAccount({
    required this.roleType,
    required this.displayName,
    required this.email,
    required this.status,
    required this.requirement,
    required this.memberSince,
    this.avatarAssetPath,
    this.avatarUrl,
    this.serverProfile,
  });

  final String roleType;

  final String displayName;

  final String email;

  /// A getter so accounts created under an older colour don't keep it.
  Color get avatarColor => AppColors.primary;

  final String? avatarAssetPath;

  /// Carries a version query so the image cache drops old bytes after an
  /// upload.
  final String? avatarUrl;

  final RoleAccountStatus status;

  final RoleUnlockRequirement requirement;

  final String memberSince;

  /// From `GET /profile/me/mobile`; null until the first sync.
  final MobileProfile? serverProfile;

  bool get isLocked => status == RoleAccountStatus.locked;

  bool get isUnlocked => status == RoleAccountStatus.unlocked;

  /// ID and face passed; awaiting administrator approval.
  bool get isPending => status == RoleAccountStatus.pending;

  String get roleLabel => RoleAccountStore.labelFor(roleType);

  String get initial =>
      displayName.trim().isNotEmpty ? displayName.trim()[0].toUpperCase() : '?';

  String get firstName => displayName.trim().split(' ').first;

  String get lastName {
    final parts = displayName.trim().split(' ');
    return parts.length > 1 ? parts.sublist(1).join(' ') : '';
  }

  String get unlockHint {
    if (isPending) return 'Waiting for administrator approval';
    return switch (requirement) {
      RoleUnlockRequirement.none => 'Tap to activate',
      RoleUnlockRequirement.idAndFaceVerification =>
        'Verify your valid ID and face to unlock',
    };
  }

  RoleAccount copyWith({
    String? displayName,
    String? email,
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
      avatarAssetPath: avatarAssetPath ?? this.avatarAssetPath,
      avatarUrl: clearAvatarUrl ? null : (avatarUrl ?? this.avatarUrl),
      status: status ?? this.status,
      requirement: requirement ?? this.requirement,
      memberSince: memberSince ?? this.memberSince,
      serverProfile: serverProfile ?? this.serverProfile,
    );
  }
}

/// The registration/login role is the unlocked primary; the rest start locked.
/// Cleared on sign-out and when a different email signs in.
class RoleAccountStore extends ChangeNotifier {
  RoleAccountStore._();

  static final RoleAccountStore instance = RoleAccountStore._();

  static const volunteer = 'VOLUNTEER';
  static const donor = 'DONOR';
  static const beneficiary = 'BENEFICIARY';

  static const List<String> allRoleTypes = [volunteer, donor, beneficiary];

  /// Portal staff only get the Volunteer side in the app.
  static const List<String> staffRoleTypes = ['DIRECTOR', 'COORDINATOR'];

  static bool isStaffRole(String roleType) =>
      staffRoleTypes.contains(roleType.trim().toUpperCase());

  static String normalize(String roleType) {
    final type = roleType.trim().toUpperCase();
    return staffRoleTypes.contains(type) ? volunteer : type;
  }

  static String labelFor(String roleType) => switch (normalize(roleType)) {
    donor => 'Donor',
    beneficiary => 'Beneficiary',
    _ => 'Volunteer',
  };

  /// Only volunteers register with ID + face, so unlocking that side repeats
  /// it; donor/beneficiary sides are OTP-only and instant.
  static RoleUnlockRequirement requirementFor(String roleType) =>
      switch (normalize(roleType)) {
        volunteer => RoleUnlockRequirement.idAndFaceVerification,
        _ => RoleUnlockRequirement.none,
      };

  final Map<String, RoleAccount> _accounts = {};

  String? _ownerEmail;

  String? _activeRoleType;

  String? _primaryRoleType;

  bool _staffAccount = false;

  /// Sides the server opened with the account itself (see [signIn]).
  final Set<String> _grantedWithAccount = {};

  bool get isEmpty => _accounts.isEmpty;

  List<RoleAccount> get accounts => [
    for (final type in allRoleTypes)
      if (_accounts[type] != null) _accounts[type]!,
  ];

  RoleAccount? get active =>
      _activeRoleType == null ? null : _accounts[_activeRoleType!];

  RoleAccount? get primary =>
      _primaryRoleType == null ? null : _accounts[_primaryRoleType!];

  RoleAccount? byType(String roleType) => _accounts[normalize(roleType)];

  List<RoleAccount> get switchable =>
      accounts.where((a) => a.roleType != _activeRoleType).toList();

  bool isUnlocked(String roleType) => byType(roleType)?.isUnlocked ?? false;

  /// Director/coordinator portal account: Volunteer side only, no school record
  /// or ID check.
  bool get isStaffAccount => _staffAccount;

  /// Partner-barangay volunteer, or a donor/beneficiary whose Volunteer side
  /// was approved. Inferred from the primary role until the server profile
  /// syncs.
  bool get volunteerFromOutsideSchool {
    final account = _accounts[volunteer];
    if (account == null || !account.isUnlocked) return false;
    final server = account.serverProfile?.volunteer;
    if (server != null) return server.outsideSchool;
    // A student beneficiary's Volunteer side came with their school ID.
    if (_grantedWithAccount.contains(volunteer)) return false;
    return _primaryRoleType != null && _primaryRoleType != volunteer;
  }

  String? get volunteerOtherInterest =>
      _accounts[volunteer]?.serverProfile?.volunteer?.otherInterest;

  /// First sign-in for an email makes [roleType] the unlocked primary and seeds
  /// the rest locked; later calls only activate it. [unlockedRoles] skip the
  /// unlock flow (e.g. a student beneficiary's Volunteer side).
  void signIn({
    required String roleType,
    required String email,
    String firstName = '',
    String lastName = '',
    Iterable<String> unlockedRoles = const [],
  }) {
    final type = normalize(roleType);
    final key = email.trim().toLowerCase();
    final name = [
      firstName.trim(),
      lastName.trim(),
    ].where((p) => p.isNotEmpty).join(' ');

    if (_ownerEmail != key) {
      _accounts.clear();
      _grantedWithAccount.clear();
      _ownerEmail = key;
      _primaryRoleType = type;
      _staffAccount = isStaffRole(roleType);
    }

    // Staff have no donor or beneficiary side to unlock.
    for (final other in _staffAccount ? const [volunteer] : allRoleTypes) {
      _accounts.putIfAbsent(
        other,
        () => RoleAccount(
          roleType: other,
          displayName: name,
          email: email.trim(),
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
    _openGrantedRoles(unlockedRoles);

    _activeRoleType = type;
    notifyListeners();
  }

  /// Never re-locks: a side opened another way stays open.
  void _openGrantedRoles(Iterable<String> roleTypes) {
    for (final roleType in roleTypes) {
      final type = normalize(roleType);
      final account = _accounts[type];
      if (account == null) continue;
      _grantedWithAccount.add(type);
      if (account.isUnlocked) continue;
      _accounts[type] = account.copyWith(status: RoleAccountStatus.unlocked);
    }
  }

  /// [displayName] / [email] store details captured for that role (e.g. the
  /// name from the ID).
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

  /// Unusable until an admin approves and [unlock] is called.
  void markPending(String roleType) {
    final type = normalize(roleType);
    final account = _accounts[type];
    if (account == null || account.isUnlocked) return;

    _accounts[type] = account.copyWith(status: RoleAccountStatus.pending);
    notifyListeners();
  }

  /// Open request → pending, accepted → unlocked, rejected → back to locked;
  /// roles without a request are untouched.
  void applyRequestStatuses(Iterable<UserRequestResponse> requests) {
    // An older rejection must not undo a newer request still under review.
    final stillOpen = {
      for (final request in requests)
        if (request.kind == UserRequestKind.roleAccess &&
            request.requestedRole != null &&
            request.status == UserRequestStatus.pending)
          normalize(request.requestedRole!),
    };

    var changed = false;
    for (final request in requests) {
      if (request.kind != UserRequestKind.roleAccess) continue;
      final role = request.requestedRole;
      if (role == null) continue;
      final type = normalize(role);
      final account = _accounts[type];
      if (account == null || account.isUnlocked) continue;

      switch (request.status) {
        case UserRequestStatus.accepted:
          _accounts[type] = account.copyWith(
            status: RoleAccountStatus.unlocked,
            memberSince: _memberSinceNow(),
          );
          changed = true;
        case UserRequestStatus.pending:
          if (!account.isPending) {
            _accounts[type] = account.copyWith(
              status: RoleAccountStatus.pending,
            );
            changed = true;
          }
        case UserRequestStatus.rejected:
          if (account.isPending && !stillOpen.contains(type)) {
            _accounts[type] = account.copyWith(
              status: RoleAccountStatus.locked,
            );
            changed = true;
          }
        case UserRequestStatus.deleted:
        case UserRequestStatus.unknown:
          break;
      }
    }
    if (changed) notifyListeners();
  }

  /// Ignores locked and pending roles.
  void activate(String roleType) {
    final type = normalize(roleType);
    if (!isUnlocked(type) || _activeRoleType == type) return;
    _activeRoleType = type;
    notifyListeners();
  }

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

  /// One `Account` row backs every role; the owner key follows so a later sync
  /// isn't taken for a new person.
  void updateEmailEverywhere(String email) {
    final trimmed = email.trim();
    if (trimmed.isEmpty) return;
    for (final entry in _accounts.entries) {
      _accounts[entry.key] = entry.value.copyWith(email: trimmed);
    }
    _ownerEmail = trimmed.toLowerCase();
    notifyListeners();
  }

  /// Applied to `profiling_role` (the side requested, may differ from the
  /// registered role), which is marked unlocked.
  void applyServerProfile(MobileProfile profile, {String? avatarUrl}) {
    final type = normalize(profile.profilingRole);
    final key = profile.email.trim().toLowerCase();

    if (_accounts.isEmpty || (_ownerEmail != null && _ownerEmail != key)) {
      // The registered role stays primary.
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
      // Photos are per role: clear one this side never had.
      avatarUrl: avatarUrl,
      clearAvatarUrl: avatarUrl == null,
      status: RoleAccountStatus.unlocked,
      serverProfile: profile,
    );
    _openGrantedRoles(profile.unlockedRoles);
    notifyListeners();
  }

  void clear() {
    _accounts.clear();
    _grantedWithAccount.clear();
    _ownerEmail = null;
    _activeRoleType = null;
    _primaryRoleType = null;
    _staffAccount = false;
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
