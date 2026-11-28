class LoginResponse {
  const LoginResponse({
    required this.userId,
    required this.roleType,
    required this.email,
    required this.firstName,
    required this.hasInterests,
    required this.accessToken,
    this.unlockedRoles = const [],
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      userId: json['user_id'] as String? ?? '',
      roleType: json['role_type'] as String? ?? '',
      email: json['email'] as String? ?? '',
      firstName: json['firstname'] as String? ?? '',
      hasInterests: json['has_interests'] as bool? ?? false,
      accessToken: json['access_token'] as String? ?? '',
      unlockedRoles: (json['unlocked_roles'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(),
    );
  }

  final String userId;
  final String roleType;
  final String email;
  final String firstName;
  final bool hasInterests;
  final String accessToken;

  /// Sides open from sign-up, e.g. a student beneficiary's `VOLUNTEER` side.
  final List<String> unlockedRoles;

  bool get isVolunteer => roleType == 'VOLUNTEER';
}
