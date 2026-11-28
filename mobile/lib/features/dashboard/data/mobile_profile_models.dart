import 'package:mobile/features/interests/domain/user_interest.dart';

/// `GET /v1/profile/me/mobile?role=`: only the requested role's section
/// (`volunteer`, `donor`, `beneficiary`) is populated.
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
    this.residencyReview,
    required this.hasProfileImage,
    required this.signInProviders,
    required this.hasPassword,
    required this.memberSince,
    this.unlockedRoles = const [],
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
          json['profiling_role'] as String? ??
          json['role_type'] as String? ??
          '',
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
      residencyReview: json['residency_review'] is Map<String, dynamic>
          ? ResidencyReview.fromJson(
              json['residency_review'] as Map<String, dynamic>,
            )
          : null,
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
      unlockedRoles: (json['unlocked_roles'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(),
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

  /// The side the app asked for; differs from [roleType] after a local role
  /// switch.
  final String profilingRole;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String email;
  final String phoneNumber;
  final String gender;
  final int age;
  final ProfileAddress address;

  /// Null until set. Top-level because any mobile account can edit its
  /// beneficiary side.
  final int? householdSize;

  /// Newest first.
  final List<ResidencyDocument> residencyDocuments;

  /// Null when none was uploaded from the profile.
  final ResidencyReview? residencyReview;
  final bool hasProfileImage;

  /// `GOOGLE` / `FACEBOOK` identities attached to the account, for any role.
  final List<String> signInProviders;

  /// False for provider-only accounts; defaults to true when omitted so older
  /// payloads never lock the controls.
  final bool hasPassword;
  final DateTime memberSince;

  /// Open without a role-access request, e.g. a student beneficiary's
  /// `VOLUNTEER` side.
  final List<String> unlockedRoles;

  /// Email and password live with the provider, so Account Security disables
  /// both.
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

  /// Server-computed.
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

/// Multipart so the avatar can travel along. Email and password change through
/// the account flows.
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

  /// Null when locked (beneficiaries change it via a residency document); it is
  /// then not sent.
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

/// Measured by the server against its own columns; never recomputed locally.
class ProfileCompletion {
  const ProfileCompletion({
    required this.percent,
    required this.complete,
    required this.completedSteps,
    required this.totalSteps,
    required this.missing,
    this.pendingReview = const [],
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
      pendingReview: (json['pending_review'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(),
    );
  }

  final int percent;
  final bool complete;
  final int completedSteps;
  final int totalSteps;
  final List<String> missing;

  /// Done by the person but awaiting an admin; also in [missing], so [complete]
  /// stays false.
  final List<String> pendingReview;

  /// Shown as "under review" instead of a percentage.
  bool get residencyUnderReview => pendingReview.contains(residencyDocumentStep);

  /// Nothing left for the person to fill in.
  bool get onlyAwaitingReview =>
      !complete &&
      pendingReview.isNotEmpty &&
      missing.every(pendingReview.contains);

  List<String> get actionable =>
      missing.where((m) => !pendingReview.contains(m)).toList();

  static const residencyDocumentStep = 'residency_document';

  static String labelFor(String key) => switch (key) {
    'personal_details' => 'Personal Details',
    'school_record' => 'School Information',
    'id_verification' => 'ID Verification',
    'interests' => 'Interests',
    'sign_in_method' => 'Sign-In Method',
    'household_size' => 'Household Size',
    'residency_document' => 'Proof of Residency',
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

  /// Split fields when present, else the registration free text.
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
    this.otherInterest,
    required this.accessGrantedByDirector,
    this.partnerBarangay,
    required this.serviceHours,
    required this.activitiesCompleted,
    required this.activitiesRegistered,
    required this.rankingPoints,
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
      otherInterest: switch (json['other_interest']) {
        final String text when text.trim().isNotEmpty => text.trim(),
        _ => null,
      },
      accessGrantedByDirector:
          json['access_granted_by_director'] as bool? ?? false,
      partnerBarangay: switch (json['partner_barangay']) {
        final String name when name.trim().isNotEmpty => name,
        _ => null,
      },
      serviceHours: (json['service_hours'] as num?)?.toDouble() ?? 0,
      activitiesCompleted: (json['activities_completed'] as num?)?.toInt() ?? 0,
      activitiesRegistered:
          (json['activities_registered'] as num?)?.toInt() ?? 0,
      rankingPoints: (json['ranking_points'] as num?)?.toInt() ?? 0,
    );
  }

  final VolunteerSchoolInfo? school;
  final Set<UserInterest> interests;

  /// Null unless "Others" is picked.
  final String? otherInterest;

  /// Opened by a director's role-access approval; no school record.
  final bool accessGrantedByDirector;

  /// Null for a school volunteer.
  final String? partnerBarangay;

  /// Not part of the school, so no school record.
  bool get isPartnerBarangay => partnerBarangay != null;

  final double serviceHours;
  final int activitiesCompleted;
  final int activitiesRegistered;

  /// Under the portal's scoring rule.
  final int rankingPoints;

  bool get outsideSchool => accessGrantedByDirector || isPartnerBarangay;

  /// [outsideSchool] volunteers lose the School interest, even if saved
  /// earlier.
  Set<UserInterest> get allowedInterests =>
      UserInterestX.allowed(interests, outsideSchool: outsideSchool);
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
      if (hasPassword) 'Email & Password',
    ];
    return parts.isEmpty ? 'Not Set' : parts.join(' · ');
  }
}

/// ID-less, so no fields yet; it marks which role the record belongs to.
class BeneficiaryServerProfile {
  const BeneficiaryServerProfile();

  factory BeneficiaryServerProfile.fromJson(Map<String, dynamic> _) =>
      const BeneficiaryServerProfile();
}

/// What `POST /profile/me/mobile/residency` stored, plus the OCR'd address.
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

/// The director's ruling on the latest residency upload.
class ResidencyReview {
  const ResidencyReview({
    required this.status,
    required this.submittedAt,
    this.rejectionReason,
    this.decidedAt,
  });

  factory ResidencyReview.fromJson(Map<String, dynamic> json) {
    return ResidencyReview(
      status: json['status'] as String? ?? '',
      rejectionReason: json['rejection_reason'] as String?,
      submittedAt:
          DateTime.tryParse(json['submitted_at'] as String? ?? '')?.toLocal() ??
          DateTime.now(),
      decidedAt: DateTime.tryParse(
        json['decided_at'] as String? ?? '',
      )?.toLocal(),
    );
  }

  /// `PENDING`, `ACCEPTED`, `REJECTED` or `DELETED`.
  final String status;
  final String? rejectionReason;
  final DateTime submittedAt;
  final DateTime? decidedAt;

  bool get isPending => status == 'PENDING';
  bool get isApproved => status == 'ACCEPTED';

  /// Rejected, or dropped from the queue — either way a new upload is needed.
  bool get needsNewUpload => status == 'REJECTED' || status == 'DELETED';
}
