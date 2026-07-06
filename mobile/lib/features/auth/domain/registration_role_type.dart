import 'package:flutter/material.dart';

/// Mobile registration paths — aligned with server [RoleType] (excluding ADMIN).
enum RegistrationRoleType {
  volunteer,
  donor,
  beneficiary,
}

extension RegistrationRoleTypeX on RegistrationRoleType {
  String get title => switch (this) {
        RegistrationRoleType.volunteer => 'Volunteer',
        RegistrationRoleType.donor => 'Donor',
        RegistrationRoleType.beneficiary => 'Beneficiary',
      };

  String get subtitle => switch (this) {
        RegistrationRoleType.volunteer =>
          'UC students & staff who join activities and log volunteer hours.',
        RegistrationRoleType.donor =>
          'Individuals or organizations who support CARES programs.',
        RegistrationRoleType.beneficiary =>
          'Community members who receive extension services.',
      };

  IconData get icon => switch (this) {
        RegistrationRoleType.volunteer => Icons.school_outlined,
        RegistrationRoleType.donor => Icons.volunteer_activism_outlined,
        RegistrationRoleType.beneficiary => Icons.groups_outlined,
      };

  /// API value sent on registration — matches server RoleType enum.
  String get apiValue => switch (this) {
        RegistrationRoleType.volunteer => 'VOLUNTEER',
        RegistrationRoleType.donor => 'DONOR',
        RegistrationRoleType.beneficiary => 'BENEFICIARY',
      };
}
