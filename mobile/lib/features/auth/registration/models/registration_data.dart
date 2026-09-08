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
  String? organizationType;
  String organizationRole = '';
  String organizationAddress = '';

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

  /// Everything the beneficiary form asks for, filled in.
  bool get beneficiaryBasicsComplete {
    if (firstName.trim().isEmpty || lastName.trim().isEmpty) return false;
    if (beneficiaryType == null) return false;
    if (isOrganizationMember && !organizationDetailsComplete) return false;
    if (!email.contains('@')) return false;
    if (password.length < 8) return false;
    return password == confirmPassword;
  }

  bool get organizationDetailsComplete =>
      organizationName.trim().isNotEmpty &&
      (organizationType?.isNotEmpty ?? false) &&
      organizationRole.trim().isNotEmpty &&
      organizationAddress.trim().isNotEmpty;

  void clearOrganizationFields() {
    organizationName = '';
    organizationType = null;
    organizationRole = '';
    organizationAddress = '';
  }

  void resetCourseSelection() {
    course = null;
  }

  void clearBeneficiaryFields() {
    beneficiaryType = null;
    clearOrganizationFields();
    middleName = '';
    address = '';
    dateOfBirth = null;
    gender = null;
    facePicturePath = null;
  }
}
