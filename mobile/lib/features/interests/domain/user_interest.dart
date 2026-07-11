import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Volunteer interest categories shown in the post-login picker.
enum UserInterest {
  academicActivities,
  donationDrives,
  environment,
}

extension UserInterestX on UserInterest {
  String get apiValue => switch (this) {
        UserInterest.academicActivities => 'ACADEMIC_ACTIVITIES',
        UserInterest.donationDrives => 'DONATION_DRIVES',
        UserInterest.environment => 'ENVIRONMENT',
      };

  static UserInterest? fromApiValue(String value) {
    for (final interest in UserInterest.values) {
      if (interest.apiValue == value) {
        return interest;
      }
    }
    return null;
  }

  String get label => switch (this) {
        UserInterest.academicActivities => 'Academic activities',
        UserInterest.donationDrives => 'Donation drives',
        UserInterest.environment => 'Environment',
      };

  IconData get icon => switch (this) {
        UserInterest.academicActivities => Icons.menu_book_rounded,
        UserInterest.donationDrives => Icons.volunteer_activism_rounded,
        UserInterest.environment => Icons.eco_rounded,
      };

  Color get accentColor => switch (this) {
        UserInterest.academicActivities => const Color(0xFF7E57C2),
        UserInterest.donationDrives => AppColors.heart,
        UserInterest.environment => AppColors.primary,
      };
}
