enum AccountType { regularUser, beneficiary }

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
  UserRole? userRole;

  String firstName = '';
  String lastName = '';
  String email = '';
  String phoneNumber = '';
  String schoolIdNumber = '';

  String? department;
  String? course;
  String? yearLevel;

  String password = '';
  String confirmPassword = '';

  String? schoolIdImagePath;
  String? selfieImagePath;

  bool get isRegularUser => accountType == AccountType.regularUser;
  bool get isBeneficiary => accountType == AccountType.beneficiary;

  String get accountTypeLabel => switch (accountType) {
        AccountType.regularUser => 'Regular User',
        AccountType.beneficiary => 'Beneficiary',
        null => '—',
      };

  String get userRoleLabel => switch (userRole) {
        UserRole.student => 'Student',
        UserRole.staff => 'Staff',
        UserRole.faculty => 'Faculty',
        null => '—',
      };

  void resetCourseSelection() {
    course = null;
  }
}
