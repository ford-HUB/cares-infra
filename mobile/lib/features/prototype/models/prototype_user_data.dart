import '../../auth/registration/models/registration_data.dart';

class PrototypeUserData {
  String firstName = '';
  String lastName = '';
  String email = '';
  String password = '';

  AccountType? accountType;
  UserRole? userRole;
  BeneficiaryType? beneficiaryType;
  String? department;
  String? course;
  String phoneNumber = '';
  String schoolIdNumber = '';

  final Set<String> interests = {};
  final Set<String> skills = {};
  final Set<String> causes = {};
  final Set<String> volunteerPreferences = {};

  String get fullName {
    final parts = [
      firstName.trim(),
      lastName.trim(),
    ].where((p) => p.isNotEmpty);
    return parts.join(' ');
  }
}
