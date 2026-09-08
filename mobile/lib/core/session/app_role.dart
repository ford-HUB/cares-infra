import 'package:flutter/material.dart';

/// The roles a single CARES account can hold. One account can be authorized
/// for any combination of these — the active role decides which dashboard,
/// navigation, and features are shown.
enum AppRole { volunteer, beneficiary, donor }

extension AppRoleX on AppRole {
  String get label => switch (this) {
    AppRole.volunteer => 'Volunteer',
    AppRole.beneficiary => 'Beneficiary',
    AppRole.donor => 'Donor',
  };

  String get description => switch (this) {
    AppRole.volunteer =>
      'Join events, log service hours, and track your volunteer ranks.',
    AppRole.beneficiary =>
      'File assistance requests and follow their status.',
    AppRole.donor =>
      'Give to campaigns and follow the impact of your donations.',
  };

  IconData get icon => switch (this) {
    AppRole.volunteer => Icons.volunteer_activism_outlined,
    AppRole.beneficiary => Icons.handshake_outlined,
    AppRole.donor => Icons.card_giftcard_rounded,
  };

  Color get accentColor => switch (this) {
    AppRole.volunteer => const Color(0xFF2D7634),
    AppRole.beneficiary => const Color(0xFF1565C0),
    AppRole.donor => const Color(0xFFE65100),
  };

  /// Server role type used by the auth/registration APIs.
  String get apiValue => switch (this) {
    AppRole.volunteer => 'VOLUNTEER',
    AppRole.beneficiary => 'BENEFICIARY',
    AppRole.donor => 'DONOR',
  };

  static AppRole fromApiValue(String? value) {
    return switch (value?.trim().toUpperCase()) {
      'BENEFICIARY' => AppRole.beneficiary,
      'DONOR' => AppRole.donor,
      _ => AppRole.volunteer,
    };
  }
}
