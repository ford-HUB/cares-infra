import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// Donor counterpart of [VolunteerProfile] — the donor interest profiling
/// mirrors the volunteer one: interests, what they give, how often, and how
/// much they plan to give.
class DonorProfile {
  const DonorProfile({
    required this.interests,
    required this.donationTypes,
    required this.givingFrequency,
    this.monthlyBudget,
    required this.profileComplete,
  });

  factory DonorProfile.empty() {
    return const DonorProfile(
      interests: {},
      donationTypes: {},
      givingFrequency: {},
      profileComplete: false,
    );
  }

  /// Same interest catalog the volunteer profiling uses.
  final Set<UserInterest> interests;
  final Set<String> donationTypes;
  final Set<String> givingFrequency;
  final int? monthlyBudget;
  final bool profileComplete;

  int get completionPercent => DonorProfileCompletion.calculate(profile: this);

  List<String> get interestLabels =>
      interests.map((interest) => interest.label).toList()..sort();

  List<String> get donationTypeLabels => donationTypes.toList()..sort();

  String get givingLabel {
    if (givingFrequency.isEmpty && monthlyBudget == null) return 'Not set';
    final frequency = DonorProfileOptions.sortFrequencies(
      givingFrequency.toList(),
    );
    final parts = [
      if (frequency.isNotEmpty) frequency.join(' · '),
      if (monthlyBudget != null)
        '${DonorProfileOptions.pesoLabel(monthlyBudget!)} / month',
    ];
    return parts.join('  |  ');
  }

  DonorProfile copyWith({
    Set<UserInterest>? interests,
    Set<String>? donationTypes,
    Set<String>? givingFrequency,
    int? monthlyBudget,
    bool? profileComplete,
  }) {
    return DonorProfile(
      interests: interests ?? this.interests,
      donationTypes: donationTypes ?? this.donationTypes,
      givingFrequency: givingFrequency ?? this.givingFrequency,
      monthlyBudget: monthlyBudget ?? this.monthlyBudget,
      profileComplete: profileComplete ?? this.profileComplete,
    );
  }
}

abstract final class DonorProfileOptions {
  /// Interest options built from the shared catalog, exactly like the
  /// volunteer interest profiling.
  static List<ProfileSelectableOption> get interests => UserInterest.values
      .map(
        (interest) => ProfileSelectableOption(
          label: interest.label,
          icon: interest.icon,
          accentColor: interest.accentColor,
        ),
      )
      .toList();

  static UserInterest? interestForLabel(String label) {
    for (final interest in UserInterest.values) {
      if (interest.label == label) return interest;
    }
    return null;
  }

  static const donationTypes = [
    ProfileSelectableOption(
      label: 'Cash donations',
      icon: Icons.payments_outlined,
      accentColor: Color(0xFF26A69A),
    ),
    ProfileSelectableOption(
      label: 'Food & groceries',
      icon: Icons.restaurant_rounded,
      accentColor: Color(0xFF66BB6A),
    ),
    ProfileSelectableOption(
      label: 'School supplies',
      icon: Icons.menu_book_rounded,
      accentColor: Color(0xFFFFA726),
    ),
    ProfileSelectableOption(
      label: 'Medical supplies',
      icon: Icons.medical_services_outlined,
      accentColor: Color(0xFFEF5350),
    ),
    ProfileSelectableOption(
      label: 'Clothing',
      icon: Icons.checkroom_rounded,
      accentColor: Color(0xFF7E57C2),
    ),
    ProfileSelectableOption(
      label: 'Relief goods',
      icon: Icons.inventory_2_outlined,
      accentColor: Color(0xFF42A5F5),
    ),
  ];

  static const givingFrequency = [
    'One-time',
    'Monthly',
    'Quarterly',
    'Yearly',
    'During calamities',
  ];

  static List<String> sortFrequencies(List<String> values) {
    final sorted = List<String>.from(values);
    sorted.sort((a, b) {
      final aIndex = givingFrequency.indexOf(a);
      final bIndex = givingFrequency.indexOf(b);
      if (aIndex == -1 && bIndex == -1) return a.compareTo(b);
      if (aIndex == -1) return 1;
      if (bIndex == -1) return -1;
      return aIndex.compareTo(bIndex);
    });
    return sorted;
  }

  static const monthlyBudgets = [500, 1000, 2500, 5000, 10000];

  static String pesoLabel(int amount) {
    final text = amount.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < text.length; i++) {
      if (i > 0 && (text.length - i) % 3 == 0) buffer.write(',');
      buffer.write(text[i]);
    }
    return '₱$buffer';
  }
}

abstract final class DonorProfileCompletion {
  static const totalSteps = 4;

  static int calculate({bool accountRegistered = true, DonorProfile? profile}) {
    var filled = 0;
    if (accountRegistered) filled++;
    if (profile != null) {
      if (profile.interests.isNotEmpty) filled++;
      if (profile.donationTypes.isNotEmpty) filled++;
      if (profile.givingFrequency.isNotEmpty) filled++;
    }
    return ((filled / totalSteps) * 100).round();
  }
}
