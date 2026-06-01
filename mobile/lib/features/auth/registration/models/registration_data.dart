enum AccountType { regularUser, beneficiary }

enum BeneficiaryType { individual, organizationMember }

enum UserRole { student, staff, faculty }

enum RegistrationFlowStep {
  accountType,
  userRole,
  registrationForm,
  identityVerification,
  submission,
}

class RegistrationData {
  AccountType? accountType;
  BeneficiaryType? beneficiaryType;
  UserRole? userRole;

  String firstName = '';
  String middleName = '';
  String lastName = '';
  String email = '';
  String phoneNumber = '';
  String schoolIdNumber = '';
  String address = '';
  String? dateOfBirth;
  String? gender;
  String organizationName = '';

  String? department;
  String? course;
  String? yearLevel;

  String password = '';
  String confirmPassword = '';

  String? schoolIdImagePath;
  String? selfieImagePath;
  String? facePicturePath;

  bool get isRegularUser => accountType == AccountType.regularUser;
  bool get isBeneficiary => accountType == AccountType.beneficiary;
  bool get isOrganizationMember =>
      beneficiaryType == BeneficiaryType.organizationMember;

  String get accountTypeLabel => switch (accountType) {
        AccountType.regularUser => 'Regular User',
        AccountType.beneficiary => 'Beneficiary',
        null => '—',
      };

  String get beneficiaryTypeLabel => switch (beneficiaryType) {
        BeneficiaryType.individual => 'Individual',
        BeneficiaryType.organizationMember => 'Organization Member',
        null => '—',
      };

  String get userRoleLabel => switch (userRole) {
        UserRole.student => 'Student',
        UserRole.staff => 'Staff',
        UserRole.faculty => 'Faculty',
        null => '—',
      };

  String get fullName {
    final parts = [
      firstName,
      if (middleName.trim().isNotEmpty) middleName.trim(),
      lastName,
    ];
    return parts.where((p) => p.isNotEmpty).join(' ');
  }

  void resetCourseSelection() {
    course = null;
  }

  void clearBeneficiaryFields() {
    beneficiaryType = null;
    organizationName = '';
    middleName = '';
    address = '';
    dateOfBirth = null;
    gender = null;
    facePicturePath = null;
  }
}
