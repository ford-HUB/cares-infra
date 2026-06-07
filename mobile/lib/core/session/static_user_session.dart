import '../../features/auth/registration/models/registration_data.dart';
import '../../features/prototype/models/prototype_user_data.dart';

/// In-memory user record for the static prototype phase.
class StaticSessionUser {
  StaticSessionUser({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.password,
    required this.accountType,
    this.userRole,
    this.beneficiaryType,
    Set<String>? interests,
    Set<String>? skills,
    Set<String>? causes,
    Set<String>? volunteerPreferences,
  })  : interests = interests ?? {},
        skills = skills ?? {},
        causes = causes ?? {},
        volunteerPreferences = volunteerPreferences ?? {};

  String firstName;
  String lastName;
  String email;
  String password;
  AccountType accountType;
  UserRole? userRole;
  BeneficiaryType? beneficiaryType;
  final Set<String> interests;
  final Set<String> skills;
  final Set<String> causes;
  final Set<String> volunteerPreferences;

  String get fullName {
    final parts = [firstName.trim(), lastName.trim()].where((p) => p.isNotEmpty);
    return parts.join(' ');
  }

  String get roleLabel {
    if (accountType == AccountType.beneficiary) {
      return beneficiaryType == BeneficiaryType.organizationMember
          ? 'Beneficiary (Organization)'
          : 'Beneficiary';
    }
    return userRole?.name ?? 'Regular User';
  }

  StaticSessionUser copyFromPrototype(PrototypeUserData data) {
    firstName = data.firstName;
    lastName = data.lastName;
    email = data.email;
    password = data.password;
    accountType = data.accountType ?? AccountType.regularUser;
    userRole = data.userRole;
    beneficiaryType = data.beneficiaryType;
    interests
      ..clear()
      ..addAll(data.interests);
    skills
      ..clear()
      ..addAll(data.skills);
    causes
      ..clear()
      ..addAll(data.causes);
    volunteerPreferences
      ..clear()
      ..addAll(data.volunteerPreferences);
    return this;
  }

  factory StaticSessionUser.fromPrototype(PrototypeUserData data) {
    return StaticSessionUser(
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      accountType: data.accountType ?? AccountType.regularUser,
      userRole: data.userRole,
      beneficiaryType: data.beneficiaryType,
      interests: Set<String>.from(data.interests),
      skills: Set<String>.from(data.skills),
      causes: Set<String>.from(data.causes),
      volunteerPreferences: Set<String>.from(data.volunteerPreferences),
    );
  }
}

/// Temporary in-memory session for static auth and role-based routing.
class StaticUserSession {
  StaticUserSession._();

  static final StaticUserSession instance = StaticUserSession._();

  final Map<String, StaticSessionUser> _usersByEmail = {};
  StaticSessionUser? currentUser;
  bool isDonorMode = false;

  void upsertUser(StaticSessionUser user) {
    _usersByEmail[user.email.trim().toLowerCase()] = user;
  }

  void upsertFromPrototype(PrototypeUserData data) {
    final key = data.email.trim().toLowerCase();
    final existing = _usersByEmail[key];
    if (existing != null) {
      existing.copyFromPrototype(data);
    } else {
      upsertUser(StaticSessionUser.fromPrototype(data));
    }
  }

  StaticSessionUser? signIn(String email, String password) {
    final user = _usersByEmail[email.trim().toLowerCase()];
    if (user == null || user.password != password) return null;
    currentUser = user;
    isDonorMode = false;
    return user;
  }

  void signOut() {
    currentUser = null;
    isDonorMode = false;
  }
}
