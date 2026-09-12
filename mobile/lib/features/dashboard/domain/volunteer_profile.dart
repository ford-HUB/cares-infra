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
    required this.profileComplete,
  });

  factory VolunteerProfile.empty() {
    return const VolunteerProfile(interests: {}, profileComplete: false);
  }

  final Set<UserInterest> interests;
  final bool profileComplete;

  VolunteerProfile copyWith({
    Set<UserInterest>? interests,
    bool? profileComplete,
  }) {
    return VolunteerProfile(
      interests: interests ?? this.interests,
      profileComplete: profileComplete ?? this.profileComplete,
    );
  }

  /// Progress across account registration plus volunteer profile sections.
  int get completionPercent =>
      VolunteerProfileCompletion.calculate(profile: this);

  List<String> get interestLabels =>
      interests.map((interest) => interest.label).toList()..sort();
}

abstract final class VolunteerProfileOptions {
  /// Weekday list shared with the beneficiary visit-day picker.
  static const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  static List<String> sortWeekdays(List<String> days) {
    final sorted = List<String>.from(days);
    sorted.sort((a, b) {
      final aIndex = weekdays.indexOf(a);
      final bIndex = weekdays.indexOf(b);
      if (aIndex == -1 && bIndex == -1) return a.compareTo(b);
      if (aIndex == -1) return 1;
      if (bIndex == -1) return -1;
      return aIndex.compareTo(bIndex);
    });
    return sorted;
  }
}

abstract final class VolunteerProfileCompletion {
  static const totalSteps = 2;

  static int calculate({
    bool accountRegistered = true,
    VolunteerProfile? profile,
  }) {
    var filled = 0;
    if (accountRegistered) filled++;
    if (profile != null) {
      if (profile.interests.isNotEmpty) filled++;
    }
    return ((filled / totalSteps) * 100).round();
  }
}
