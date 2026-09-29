class MockVolunteerProfile {
  const MockVolunteerProfile({
    required this.displayName,
    required this.email,
    required this.roleLabel,
    required this.memberSince,
    required this.points,
    required this.serviceHours,
    required this.activitiesCompleted,
    required this.interests,
    required this.profileCompletionPercent,
  });

  final String displayName;
  final String email;
  final String roleLabel;
  final String memberSince;
  final int points;
  final int serviceHours;
  final int activitiesCompleted;
  final List<String> interests;
  final int profileCompletionPercent;
}

abstract final class MockProfiles {
  static MockVolunteerProfile forUser({
    required String displayName,
    String? email,
    int points = 240,
  }) {
    return MockVolunteerProfile(
      displayName: displayName,
      email: email ?? '$displayName@uclm.edu.ph',
      roleLabel: 'Volunteer',
      memberSince: 'June 2026',
      points: points,
      serviceHours: 6,
      activitiesCompleted: 2,
      interests: const [
        'Environment',
        'Academic activities',
        'Community outreach',
      ],
      profileCompletionPercent: 62,
    );
  }
}
