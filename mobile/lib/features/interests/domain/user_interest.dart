import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Volunteer interest categories shown in the post-login picker.
///
/// These mirror the event types staff can publish from the portal
/// (`site/src/constants/event.ts` → `EVENT_CATEGORIES`) and the server's
/// `InterestCode` enum, so a volunteer's picks line up with real events.
enum UserInterest {
  school,
  community,
  emergency,
  donationDrive,
  charity,
  reliefProgram,
  health,
  outreach,
  training,
  seminar,
  others,
}

extension UserInterestX on UserInterest {
  String get apiValue => switch (this) {
    UserInterest.school => 'SCHOOL',
    UserInterest.community => 'COMMUNITY',
    UserInterest.emergency => 'EMERGENCY',
    UserInterest.donationDrive => 'DONATION_DRIVE',
    UserInterest.charity => 'CHARITY',
    UserInterest.reliefProgram => 'RELIEF_PROGRAM',
    UserInterest.health => 'HEALTH',
    UserInterest.outreach => 'OUTREACH',
    UserInterest.training => 'TRAINING',
    UserInterest.seminar => 'SEMINAR',
    UserInterest.others => 'OTHERS',
  };

  /// Codes from the retired three-item catalog. Accounts that picked them
  /// before the event-type catalog landed still carry these values, so they
  /// are folded into the closest event type rather than dropped.
  static const Map<String, UserInterest> _legacyCodes = {
    'ACADEMIC_ACTIVITIES': UserInterest.school,
    'DONATION_DRIVES': UserInterest.donationDrive,
    'ENVIRONMENT': UserInterest.community,
  };

  static UserInterest? fromApiValue(String value) {
    for (final interest in UserInterest.values) {
      if (interest.apiValue == value) {
        return interest;
      }
    }
    return _legacyCodes[value];
  }

  /// Matches the portal's event category label exactly.
  String get label => switch (this) {
    UserInterest.school => 'School',
    UserInterest.community => 'Community',
    UserInterest.emergency => 'Emergency',
    UserInterest.donationDrive => 'Donation Drive',
    UserInterest.charity => 'Charity',
    UserInterest.reliefProgram => 'Relief Program',
    UserInterest.health => 'Health',
    UserInterest.outreach => 'Outreach',
    UserInterest.training => 'Training',
    UserInterest.seminar => 'Seminar',
    UserInterest.others => 'Others',
  };

  String get description => switch (this) {
    UserInterest.school => 'Academic activities and campus programs',
    UserInterest.community => 'Barangay and neighborhood initiatives',
    UserInterest.emergency => 'Rapid response when disaster strikes',
    UserInterest.donationDrive => 'Collecting goods, funds, and supplies',
    UserInterest.charity => 'Fundraisers and giving programs',
    UserInterest.reliefProgram => 'Distributing aid to affected families',
    UserInterest.health => 'Medical missions and wellness drives',
    UserInterest.outreach => 'Visiting and supporting communities in need',
    UserInterest.training => 'Workshops and skills development',
    UserInterest.seminar => 'Talks, lectures, and awareness sessions',
    UserInterest.others => 'Anything else CARES organizes',
  };

  IconData get icon => switch (this) {
    UserInterest.school => Icons.school_rounded,
    UserInterest.community => Icons.groups_rounded,
    UserInterest.emergency => Icons.emergency_rounded,
    UserInterest.donationDrive => Icons.volunteer_activism_rounded,
    UserInterest.charity => Icons.favorite_rounded,
    UserInterest.reliefProgram => Icons.inventory_2_rounded,
    UserInterest.health => Icons.medical_services_rounded,
    UserInterest.outreach => Icons.handshake_rounded,
    UserInterest.training => Icons.construction_rounded,
    UserInterest.seminar => Icons.record_voice_over_rounded,
    UserInterest.others => Icons.more_horiz_rounded,
  };

  /// Lottie animation shown on the picker card. Files live under
  /// `assets/lottie/interests/`; a missing file falls back to [icon].
  String get lottieAsset => switch (this) {
    UserInterest.school => 'assets/lottie/interests/school.json',
    UserInterest.community => 'assets/lottie/interests/community.json',
    UserInterest.emergency => 'assets/lottie/interests/emergency.json',
    UserInterest.donationDrive => 'assets/lottie/interests/donation_drive.json',
    UserInterest.charity => 'assets/lottie/interests/charity.json',
    UserInterest.reliefProgram => 'assets/lottie/interests/relief_program.json',
    UserInterest.health => 'assets/lottie/interests/health.json',
    UserInterest.outreach => 'assets/lottie/interests/outreach.json',
    UserInterest.training => 'assets/lottie/interests/training.json',
    UserInterest.seminar => 'assets/lottie/interests/seminar.json',
    UserInterest.others => 'assets/lottie/interests/others.json',
  };

  Color get accentColor => switch (this) {
    UserInterest.school => const Color(0xFF7E57C2),
    UserInterest.community => AppColors.primary,
    UserInterest.emergency => AppColors.error,
    UserInterest.donationDrive => AppColors.accentOrange,
    UserInterest.charity => AppColors.heart,
    UserInterest.reliefProgram => const Color(0xFF00897B),
    UserInterest.health => const Color(0xFF1E88E5),
    UserInterest.outreach => AppColors.accent,
    UserInterest.training => const Color(0xFF6D4C41),
    UserInterest.seminar => const Color(0xFF3949AB),
    UserInterest.others => AppColors.textSecondary,
  };
}
