class VolunteerAccountProfile {
  const VolunteerAccountProfile({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phoneNumber,
    this.idNumber,
    this.department,
    this.course,
  });

  factory VolunteerAccountProfile.fromJson(Map<String, dynamic> json) {
    return VolunteerAccountProfile(
      firstName: json['firstname'] as String? ?? '',
      lastName: json['lastname'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phoneNumber: json['phone_number'] as String? ?? '',
      idNumber: json['id_number'] as String?,
      department: json['department'] as String?,
      course: json['course'] as String?,
    );
  }

  final String firstName;
  final String lastName;
  final String email;
  final String phoneNumber;
  final String? idNumber;
  final String? department;
  final String? course;

  String get fullName {
    final parts = [firstName.trim(), lastName.trim()].where((part) => part.isNotEmpty);
    return parts.join(' ');
  }

  Map<String, dynamic> toRequestBody({
    String? department,
    String? course,
  }) {
    return {
      'firstname': firstName.trim(),
      'lastname': lastName.trim(),
      'phone_number': phoneNumber.trim(),
      if (department != null && department.trim().isNotEmpty)
        'department': department.trim(),
      if (course != null && course.trim().isNotEmpty) 'course': course.trim(),
    };
  }

  VolunteerAccountProfile copyWith({
    String? firstName,
    String? lastName,
    String? email,
    String? phoneNumber,
    String? idNumber,
    String? department,
    String? course,
  }) {
    return VolunteerAccountProfile(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      idNumber: idNumber ?? this.idNumber,
      department: department ?? this.department,
      course: course ?? this.course,
    );
  }
}
