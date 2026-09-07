import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';

/// Beneficiary counterpart of [VolunteerProfile] — what the household tells
/// CARES so requests can be matched and assessed.
class BeneficiaryProfile {
  const BeneficiaryProfile({
    required this.assistanceNeeds,
    required this.householdSituation,
    required this.visitAvailability,
    this.visitTimes = const {},
    this.householdSize,
    required this.profileComplete,
  });

  factory BeneficiaryProfile.empty() {
    return const BeneficiaryProfile(
      assistanceNeeds: {},
      householdSituation: {},
      visitAvailability: {},
      profileComplete: false,
    );
  }

  final Set<String> assistanceNeeds;
  final Set<String> householdSituation;
  final Set<String> visitAvailability;

  /// Preferred times of day for a needs assessment visit.
  final Set<String> visitTimes;
  final int? householdSize;
  final bool profileComplete;

  /// Progress across account registration plus the profile sections.
  int get completionPercent =>
      BeneficiaryProfileCompletion.calculate(profile: this);

  String get availabilityLabel {
    if (visitAvailability.isEmpty && visitTimes.isEmpty) return 'Not set';
    final days = VolunteerProfileOptions.sortAvailabilityDays(
      visitAvailability.toList(),
    );
    final times = BeneficiaryProfileOptions.sortVisitTimes(visitTimes.toList());
    final parts = [
      if (days.isNotEmpty) days.join(' · '),
      if (times.isNotEmpty) times.join(' · '),
    ];
    return parts.join('  |  ');
  }

  String get householdSizeLabel =>
      householdSize == null ? 'Not set' : '$householdSize members';

  List<String> get assistanceNeedLabels => assistanceNeeds.toList()..sort();

  List<String> get householdSituationLabels =>
      householdSituation.toList()..sort();

  BeneficiaryProfile copyWith({
    Set<String>? assistanceNeeds,
    Set<String>? householdSituation,
    Set<String>? visitAvailability,
    Set<String>? visitTimes,
    int? householdSize,
    bool? profileComplete,
  }) {
    return BeneficiaryProfile(
      assistanceNeeds: assistanceNeeds ?? this.assistanceNeeds,
      householdSituation: householdSituation ?? this.householdSituation,
      visitAvailability: visitAvailability ?? this.visitAvailability,
      visitTimes: visitTimes ?? this.visitTimes,
      householdSize: householdSize ?? this.householdSize,
      profileComplete: profileComplete ?? this.profileComplete,
    );
  }
}

abstract final class BeneficiaryProfileOptions {
  static const assistanceNeeds = [
    ProfileSelectableOption(
      label: 'Food & Nutrition',
      icon: Icons.restaurant_rounded,
      accentColor: Color(0xFF66BB6A),
    ),
    ProfileSelectableOption(
      label: 'Medical',
      icon: Icons.medical_services_outlined,
      accentColor: Color(0xFFEF5350),
    ),
    ProfileSelectableOption(
      label: 'Education',
      icon: Icons.school_rounded,
      accentColor: Color(0xFFFF7043),
    ),
    ProfileSelectableOption(
      label: 'Shelter & Repair',
      icon: Icons.home_work_outlined,
      accentColor: Color(0xFF7E57C2),
    ),
    ProfileSelectableOption(
      label: 'Livelihood',
      icon: Icons.storefront_outlined,
      accentColor: Color(0xFF26A69A),
    ),
    ProfileSelectableOption(
      label: 'Disaster Relief',
      icon: Icons.volunteer_activism_rounded,
      accentColor: Color(0xFF42A5F5),
    ),
  ];

  static const householdSituation = [
    ProfileSelectableOption(
      label: 'Senior member',
      icon: Icons.elderly_rounded,
      accentColor: Color(0xFF8D6E63),
    ),
    ProfileSelectableOption(
      label: 'Person with disability',
      icon: Icons.accessible_rounded,
      accentColor: Color(0xFF5C6BC0),
    ),
    ProfileSelectableOption(
      label: 'Solo parent',
      icon: Icons.family_restroom_rounded,
      accentColor: Color(0xFFEC407A),
    ),
    ProfileSelectableOption(
      label: 'Students in family',
      icon: Icons.menu_book_rounded,
      accentColor: Color(0xFFFFA726),
    ),
    ProfileSelectableOption(
      label: 'No regular income',
      icon: Icons.work_off_outlined,
      accentColor: Color(0xFF78909C),
    ),
    ProfileSelectableOption(
      label: 'Affected by calamity',
      icon: Icons.cyclone_rounded,
      accentColor: Color(0xFF29B6F6),
    ),
  ];

  /// Days the household can receive a needs assessment visit.
  static const visitDays = VolunteerProfileOptions.availability;

  /// Preferred times of day for that visit.
  static const visitTimes = [
    'Morning (8AM-12PM)',
    'Afternoon (1PM-5PM)',
    'Evening (5PM-8PM)',
  ];

  static List<String> sortVisitTimes(List<String> times) {
    final sorted = List<String>.from(times);
    sorted.sort((a, b) {
      final aIndex = visitTimes.indexOf(a);
      final bIndex = visitTimes.indexOf(b);
      if (aIndex == -1 && bIndex == -1) return a.compareTo(b);
      if (aIndex == -1) return 1;
      if (bIndex == -1) return -1;
      return aIndex.compareTo(bIndex);
    });
    return sorted;
  }

  static const householdSizes = [1, 2, 3, 4, 5, 6];
}

abstract final class BeneficiaryProfileCompletion {
  static const totalSteps = 4;

  static int calculate({
    bool accountRegistered = true,
    BeneficiaryProfile? profile,
  }) {
    var filled = 0;
    if (accountRegistered) filled++;
    if (profile != null) {
      if (profile.assistanceNeeds.isNotEmpty) filled++;
      if (profile.householdSituation.isNotEmpty) filled++;
      if (profile.visitAvailability.isNotEmpty) filled++;
    }
    return ((filled / totalSteps) * 100).round();
  }
}
