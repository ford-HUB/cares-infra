import 'package:mobile/features/interests/domain/user_interest.dart';

/// `GET /v1/profile/me/mobile?role=` — the signed-in person's profile with
/// only the section matching the requested role populated (`volunteer`,
/// `donor` or `beneficiary`); the other two are null.
class MobileProfile {
  const MobileProfile({
    required this.userId,
    required this.roleType,
    required this.profilingRole,
    required this.firstName,
    required this.middleName,
    required this.lastName,
    required this.email,
    required this.phoneNumber,
    required this.gender,
    required this.age,
    required this.address,
    required this.householdSize,
    required this.residencyDocuments,
    required this.hasProfileImage,
    required this.signInProviders,
    required this.hasPassword,
    required this.memberSince,
    required this.completion,
    required this.volunteer,
    required this.donor,
    required this.beneficiary,
  });

  factory MobileProfile.fromJson(Map<String, dynamic> json) {
    final volunteer = json['volunteer'];
    final donor = json['donor'];
    final beneficiary = json['beneficiary'];

    return MobileProfile(
      userId: json['user_id'] as String? ?? '',
      roleType: json['role_type'] as String? ?? '',
      profilingRole:
          json['profiling_role'] as String? ?? json['role_type'] as String? ?? '',
      firstName: json['firstname'] as String? ?? '',
      middleName: json['middle_name'] as String?,
      lastName: json['lastname'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phoneNumber: json['phone_number'] as String? ?? '',
      gender: json['gender'] as String? ?? 'OTHER',
      age: (json['age'] as num?)?.toInt() ?? 0,
      address: ProfileAddress.fromJson(
        json['address'] as Map<String, dynamic>? ?? const {},
      ),
      householdSize: (json['household_size'] as num?)?.toInt(),
      residencyDocuments:
          (json['residency_documents'] as List<dynamic>? ?? const [])
              .whereType<Map<String, dynamic>>()
              .map(ResidencyDocument.fromJson)
              .toList(),
      hasProfileImage: json['has_profile_image'] as bool? ?? false,
      signInProviders: (json['sign_in_providers'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(),
      hasPassword: json['has_password'] as bool? ?? true,
      completion: ProfileCompletion.fromJson(
        json['profile_completion'] as Map<String, dynamic>? ?? const {},
      ),
      memberSince:
          DateTime.tryParse(json['member_since'] as String? ?? '') ??
          DateTime.now(),
      volunteer: volunteer is Map<String, dynamic>
          ? VolunteerServerProfile.fromJson(volunteer)
          : null,
      donor: donor is Map<String, dynamic>
          ? DonorServerProfile.fromJson(donor)
          : null,
      beneficiary: beneficiary is Map<String, dynamic>
          ? BeneficiaryServerProfile.fromJson(beneficiary)
          : null,
    );
  }

  final String userId;

  /// The role the account registered with.
  final String roleType;

  /// The role [completion] and the section are measured against — the side
  /// the app asked for. Differs from [roleType] when a person switched roles
  /// locally (a volunteer-registered account on its beneficiary dashboard).
  final String profilingRole;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String email;
  final String phoneNumber;
  final String gender;
  final int age;
  final ProfileAddress address;

  /// How many people the assistance has to cover; null until set. Top-level
  /// because the app can edit the beneficiary side of any mobile account.
  final int? householdSize;

  /// Proof-of-residency uploads, newest first.
  final List<ResidencyDocument> residencyDocuments;
  final bool hasProfileImage;

  /// `GOOGLE` / `FACEBOOK` identities attached to the account, for any role.
  final List<String> signInProviders;

  /// False for an account that only ever signed in through a provider. Defaults
  /// to true when the server omits it so an older payload never locks the
  /// email and password controls by mistake.
  final bool hasPassword;
  final DateTime memberSince;

  /// The identity lives with Google or Facebook, so the email and password
  /// cannot be changed from CARES — Account Security disables both controls.
  bool get usesSocialSignIn => !hasPassword && signInProviders.isNotEmpty;

  /// "Google", "Facebook", or "Google and Facebook" for the disabled hints.
  String get signInProviderLabel {
    final names = [
      for (final p in signInProviders)
        if (p.isNotEmpty)
          '${p[0].toUpperCase()}${p.substring(1).toLowerCase()}',
    ];
    if (names.isEmpty) return 'your sign-in provider';
    if (names.length == 1) return names.first;
    return '${names.sublist(0, names.length - 1).join(', ')} and ${names.last}';
  }

  /// Server-computed progress over the stored record.
  final ProfileCompletion completion;
  final VolunteerServerProfile? volunteer;
  final DonorServerProfile? donor;
  final BeneficiaryServerProfile? beneficiary;

  String get fullName => [
    firstName.trim(),
    if ((middleName ?? '').trim().isNotEmpty) middleName!.trim(),
    lastName.trim(),
  ].where((p) => p.isNotEmpty).join(' ');

  /// "June 2026" — matches the profile header's "Member since" line.
  String get memberSinceLabel {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${months[memberSince.month - 1]} ${memberSince.year}';
  }
}

/// Body of `PUT /profile/me/mobile` — every editable column, sent as
/// multipart fields so the avatar can travel with them. Email and password are
/// not here on purpose; they change through the account flows.
class MobileProfileUpdate {
  const MobileProfileUpdate({
    required this.firstName,
    required this.middleName,
    required this.lastName,
    required this.phoneNumber,
    required this.gender,
    required this.age,
    required this.address,
    this.householdSize,
  });

  /// Pre-fills the form from the record on file.
  factory MobileProfileUpdate.fromProfile(MobileProfile profile) {
    return MobileProfileUpdate(
      firstName: profile.firstName,
      middleName: profile.middleName ?? '',
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber,
      gender: profile.gender,
      age: profile.age,
      address: profile.address.display,
      householdSize: profile.householdSize,
    );
  }

  final String firstName;
  final String middleName;
  final String lastName;
  final String phoneNumber;
  final String gender;
  final int age;

  /// Free-text address — the shape registration captures. Null when the form
  /// locks the address (beneficiaries change it through a residency document),
  /// in which case the field is not sent and the server leaves it alone.
  final String? address;

  /// Sent as an empty string to clear it, since multipart has no null.
  final int? householdSize;

  Map<String, String> toFields() => {
    'firstname': firstName.trim(),
    'middle_name': middleName.trim(),
    'lastname': lastName.trim(),
    'phone_number': phoneNumber.trim(),
    'gender': gender,
    'age': '$age',
    if (address != null) 'current_address': address!.trim(),
    'household_size': householdSize == null ? '' : '$householdSize',
  };
}

/// `profile_completion` — how much of the record is actually on file. The
/// server measures this against its own columns, so the app never recomputes
/// it from local state.
class ProfileCompletion {
  const ProfileCompletion({
    required this.percent,
    required this.complete,
    required this.completedSteps,
    required this.totalSteps,
    required this.missing,
  });

  factory ProfileCompletion.fromJson(Map<String, dynamic> json) {
    final missing = (json['missing'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .toList();
    return ProfileCompletion(
      percent: (json['percent'] as num?)?.toInt() ?? 0,
      complete: json['complete'] as bool? ?? false,
      completedSteps: (json['completed_steps'] as num?)?.toInt() ?? 0,
      totalSteps: (json['total_steps'] as num?)?.toInt() ?? 0,
      missing: missing,
    );
  }

  final int percent;
  final bool complete;
  final int completedSteps;
  final int totalSteps;
  final List<String> missing;

  /// Human label for a `missing` key, for the "what's left" hint.
  static String labelFor(String key) => switch (key) {
    'personal_details' => 'Personal details',
    'school_record' => 'School information',
    'id_verification' => 'ID verification',
    'interests' => 'Interests',
    'sign_in_method' => 'Sign-in method',
    'household_size' => 'Household size',
    _ => key,
  };
}

class ProfileAddress {
  const ProfileAddress({
    required this.street,
    required this.barangay,
    required this.city,
    required this.province,
    required this.full,
  });

  factory ProfileAddress.fromJson(Map<String, dynamic> json) {
    return ProfileAddress(
      street: json['street'] as String?,
      barangay: json['barangay'] as String?,
      city: json['city'] as String?,
      province: json['province'] as String?,
      full: json['full'] as String? ?? '',
    );
  }

  final String? street;
  final String? barangay;
  final String? city;
  final String? province;
  final String full;

  /// Split fields when they exist, otherwise the free-text address captured
  /// at registration.
  String get display {
    final parts = [
      street,
      barangay,
      city,
      province,
    ].whereType<String>().map((p) => p.trim()).where((p) => p.isNotEmpty);
    final joined = parts.join(', ');
    return joined.isNotEmpty ? joined : full.trim();
  }
}

class VolunteerSchoolInfo {
  const VolunteerSchoolInfo({
    required this.idNumber,
    required this.department,
    required this.major,
    required this.yearLevel,
    required this.graduationYear,
  });

  factory VolunteerSchoolInfo.fromJson(Map<String, dynamic> json) {
    return VolunteerSchoolInfo(
      idNumber: json['id_number'] as String? ?? '',
      department: json['department'] as String? ?? '',
      major: json['major'] as String? ?? '',
      yearLevel: json['year_level'] as String? ?? '',
      graduationYear: (json['graduation_year'] as num?)?.toInt() ?? 0,
    );
  }

  final String idNumber;
  final String department;
  final String major;
  final String yearLevel;
  final int graduationYear;
}

class VolunteerServerProfile {
  const VolunteerServerProfile({
    required this.school,
    required this.interests,
    required this.serviceHours,
    required this.activitiesCompleted,
    required this.activitiesRegistered,
  });

  factory VolunteerServerProfile.fromJson(Map<String, dynamic> json) {
    final school = json['school'];
    return VolunteerServerProfile(
      school: school is Map<String, dynamic>
          ? VolunteerSchoolInfo.fromJson(school)
          : null,
      interests: (json['interests'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .map(UserInterestX.fromApiValue)
          .whereType<UserInterest>()
          .toSet(),
      serviceHours: (json['service_hours'] as num?)?.toDouble() ?? 0,
      activitiesCompleted: (json['activities_completed'] as num?)?.toInt() ?? 0,
      activitiesRegistered:
          (json['activities_registered'] as num?)?.toInt() ?? 0,
    );
  }

  final VolunteerSchoolInfo? school;
  final Set<UserInterest> interests;
  final double serviceHours;
  final int activitiesCompleted;
  final int activitiesRegistered;
}

class DonorServerProfile {
  const DonorServerProfile({
    required this.signInProviders,
    required this.hasPassword,
  });

  factory DonorServerProfile.fromJson(Map<String, dynamic> json) {
    return DonorServerProfile(
      signInProviders: (json['sign_in_providers'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(),
      hasPassword: json['has_password'] as bool? ?? false,
    );
  }

  final List<String> signInProviders;
  final bool hasPassword;

  /// "Google · Email & password" for the account section.
  String get signInLabel {
    final parts = [
      for (final p in signInProviders)
        if (p.isNotEmpty)
          '${p[0].toUpperCase()}${p.substring(1).toLowerCase()}',
      if (hasPassword) 'Email & password',
    ];
    return parts.isEmpty ? 'Not set' : parts.join(' · ');
  }
}

/// Beneficiaries register ID-less, so their section carries no fields yet —
/// it exists so the app can tell which role the record belongs to.
class BeneficiaryServerProfile {
  const BeneficiaryServerProfile();

  factory BeneficiaryServerProfile.fromJson(Map<String, dynamic> _) =>
      const BeneficiaryServerProfile();
}

/// One proof-of-residency file on record — what
/// `POST /profile/me/mobile/residency` stored, and the address OCR read off it.
class ResidencyDocument {
  const ResidencyDocument({
    required this.id,
    required this.fileName,
    required this.mimeType,
    required this.sizeBytes,
    required this.extractedAddress,
    required this.uploadedAt,
  });

  factory ResidencyDocument.fromJson(Map<String, dynamic> json) {
    return ResidencyDocument(
      id: json['residency_document_id'] as String? ?? '',
      fileName: json['file_name'] as String? ?? 'document',
      mimeType: json['mime_type'] as String? ?? '',
      sizeBytes: (json['size_bytes'] as num?)?.toInt() ?? 0,
      extractedAddress: json['extracted_address'] as String? ?? '',
      uploadedAt:
          DateTime.tryParse(json['uploaded_at'] as String? ?? '')?.toLocal() ??
          DateTime.now(),
    );
  }

  final String id;
  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final String extractedAddress;
  final DateTime uploadedAt;

  bool get isPdf => mimeType == 'application/pdf';

  bool get isImage => mimeType.startsWith('image/');

  /// "1.2 MB" / "640 KB".
  String get sizeLabel {
    if (sizeBytes >= 1024 * 1024) {
      return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (sizeBytes >= 1024) return '${(sizeBytes / 1024).round()} KB';
    return '$sizeBytes B';
  }

  /// "12 Sep 2026".
  String get uploadedLabel {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${uploadedAt.day} ${months[uploadedAt.month - 1]} ${uploadedAt.year}';
  }
}
