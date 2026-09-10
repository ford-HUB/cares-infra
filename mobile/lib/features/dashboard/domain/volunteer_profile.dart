import 'package:flutter/material.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

class ProfileSelectableOption {
  const ProfileSelectableOption({
    required this.label,
    required this.icon,
    required this.accentColor,
  });

  final String label;
  final IconData icon;
  final Color accentColor;
}

class VolunteerProfile {
  const VolunteerProfile({
    required this.interests,
    required this.skills,
    required this.availability,
    this.hoursPerWeek,
    required this.profileComplete,
  });

  factory VolunteerProfile.empty() {
    return const VolunteerProfile(
      interests: {},
      skills: {},
      availability: {},
      profileComplete: false,
    );
  }

  factory VolunteerProfile.fromJson(Map<String, dynamic> json) {
    final interestCodes = (json['interests'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .map(UserInterestX.fromApiValue)
        .whereType<UserInterest>()
        .toSet();
    final skills = (json['skills'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .toSet();
    final availability = (json['availability'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .toSet();

    return VolunteerProfile(
      interests: interestCodes,
      skills: skills,
      availability: availability,
      hoursPerWeek: (json['hours_per_week'] as num?)?.toInt(),
      profileComplete: json['profile_complete'] as bool? ?? false,
    );
  }

  final Set<UserInterest> interests;
  final Set<String> skills;
  final Set<String> availability;
  final int? hoursPerWeek;
  final bool profileComplete;

  /// Progress across account registration plus volunteer profile sections.
  int get completionPercent =>
      VolunteerProfileCompletion.calculate(profile: this);

  String get availabilityLabel {
    if (availability.isEmpty) return 'Not set';
    final parts = VolunteerProfileOptions.sortAvailabilityDays(
      availability.toList(),
    );
    final hours = hoursPerWeek;
    if (hours != null) {
      return '${parts.join(' · ')} · $hours hrs/week';
    }
    return parts.join(' · ');
  }

  List<String> get interestLabels =>
      interests.map((interest) => interest.label).toList()..sort();

  Map<String, dynamic> toRequestBody() {
    return {
      'interests': interests.map((interest) => interest.apiValue).toList(),
      'skills': skills.toList(),
      'availability': availability.toList(),
      if (hoursPerWeek != null) 'hours_per_week': hoursPerWeek,
    };
  }
}

abstract final class VolunteerProfileOptions {
  static const skills = [
    ProfileSelectableOption(
      label: 'Leadership',
      icon: Icons.groups_rounded,
      accentColor: Color(0xFF7E57C2),
    ),
    ProfileSelectableOption(
      label: 'Communication',
      icon: Icons.chat_bubble_outline_rounded,
      accentColor: Color(0xFF42A5F5),
    ),
    ProfileSelectableOption(
      label: 'Teaching',
      icon: Icons.school_rounded,
      accentColor: Color(0xFFFF7043),
    ),
    ProfileSelectableOption(
      label: 'Programming',
      icon: Icons.code_rounded,
      accentColor: Color(0xFF26A69A),
    ),
    ProfileSelectableOption(
      label: 'Graphic Design',
      icon: Icons.palette_rounded,
      accentColor: Color(0xFFEC407A),
    ),
    ProfileSelectableOption(
      label: 'First Aid',
      icon: Icons.medical_services_outlined,
      accentColor: Color(0xFFEF5350),
    ),
    ProfileSelectableOption(
      label: 'Event coordination',
      icon: Icons.event_available_rounded,
      accentColor: Color(0xFF66BB6A),
    ),
    ProfileSelectableOption(
      label: 'Public speaking',
      icon: Icons.record_voice_over_rounded,
      accentColor: Color(0xFF5C6BC0),
    ),
  ];

  static List<String> get skillLabels =>
      skills.map((skill) => skill.label).toList();

  static const availability = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  static List<String> sortAvailabilityDays(List<String> days) {
    final sorted = List<String>.from(days);
    sorted.sort((a, b) {
      final aIndex = availability.indexOf(a);
      final bIndex = availability.indexOf(b);
      if (aIndex == -1 && bIndex == -1) return a.compareTo(b);
      if (aIndex == -1) return 1;
      if (bIndex == -1) return -1;
      return aIndex.compareTo(bIndex);
    });
    return sorted;
  }

  static const hoursPerWeek = [2, 4, 6, 8, 10];
}

abstract final class VolunteerProfileCompletion {
  static const totalSteps = 4;

  static int calculate({
    bool accountRegistered = true,
    VolunteerProfile? profile,
  }) {
    var filled = 0;
    if (accountRegistered) filled++;
    if (profile != null) {
      if (profile.interests.isNotEmpty) filled++;
      if (profile.skills.isNotEmpty) filled++;
      if (profile.availability.isNotEmpty) filled++;
    }
    return ((filled / totalSteps) * 100).round();
  }
}
