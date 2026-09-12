import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';

/// Option catalogs for the beneficiary side.
///
/// Assistance needs and household situation are no longer part of profile
/// completion — they are captured on each assistance request instead, so
/// only the pickers live here. Profile completion itself is the server's
/// verdict (`profile_completion` on `GET /profile/me/mobile`): personal
/// details plus household size.
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

  static const householdSizes = [1, 2, 3, 4, 5, 6];
}
