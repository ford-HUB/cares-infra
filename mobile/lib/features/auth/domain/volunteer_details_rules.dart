import 'package:mobile/core/constants/partner_barangays.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/volunteer_field_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';

/// When the volunteer details step (and a student beneficiary's review step)
/// may continue, split by the form's sections so each can be checked on its
/// own. [isComplete] is what the registration flow gates Continue on.
abstract final class VolunteerDetailsRules {
  /// Alumni close their details with a Certificate of Graduation and
  /// partner-barangay volunteers with a supporting document.
  static bool requiresDocument(VolunteerType? signUpType) =>
      signUpType == VolunteerType.alumni ||
      signUpType == VolunteerType.partnerBarangay;

  /// First and last name are required; the middle name is optional. Each one
  /// that is filled in must pass [VolunteerFieldRules.nameError].
  static bool namesValid(RegisterOcrSample data) =>
      VolunteerFieldRules.nameError(data.firstname, label: 'First name') ==
          null &&
      VolunteerFieldRules.nameError(data.lastname, label: 'Last name') ==
          null &&
      VolunteerFieldRules.nameError(
            data.middleName,
            label: 'Middle name',
            isRequired: false,
          ) ==
          null;

  /// Name and age; a partner-barangay volunteer must also pick a gender.
  static bool personalInfoValid(
    RegisterOcrSample data,
    VolunteerType? signUpType,
  ) =>
      namesValid(data) &&
      VolunteerFieldRules.isValidAge(data.age) &&
      (signUpType != VolunteerType.partnerBarangay ||
          data.gender.trim().isNotEmpty);

  static bool contactInfoValid(RegisterOcrSample data) =>
      isValidPhilippinePhone(data.phoneNumber);

  /// The form only writes an address once the street, barangay and city are
  /// complete (`PhAddress.formatted`), so a non-blank one is a complete one.
  static bool homeAddressValid(RegisterOcrSample data) =>
      data.currentAddress.trim().isNotEmpty;

  static bool supportingDocumentValid(
    VolunteerType? signUpType, {
    required bool hasDocument,
  }) => !requiresDocument(signUpType) || hasDocument;

  /// Only the barangays CARES has partnered with are accepted.
  static bool partnerBarangayValid(RegisterOcrSample data) =>
      PartnerBarangays.names.contains(data.partnerBarangay);

  /// ID number, department and the per-type course / year checks. Partner
  /// barangay volunteers have no school record, so they never need one.
  static bool schoolInfoValid(
    RegisterOcrSample data,
    VolunteerType? signUpType,
  ) {
    if (signUpType == VolunteerType.partnerBarangay) return true;

    final hasRecord =
        data.idNumber.trim().isNotEmpty &&
        data.departmentName.trim().isNotEmpty;
    if (!hasRecord) return false;

    final hasMajor = data.majorName.trim().isNotEmpty;
    final type =
        VolunteerTypeX.fromApiValue(data.volunteerType) ??
        signUpType ??
        VolunteerType.student;

    // Non-teaching personnel have no year level or graduation year to check.
    if (UclmDepartments.isNonTeaching(data.departmentName)) {
      return type == VolunteerType.staff || hasMajor;
    }

    return switch (type) {
      VolunteerType.student =>
        hasMajor &&
            data.yearLevelName.trim().isNotEmpty &&
            VolunteerFieldRules.isValidGraduationYear(
              data.graduationYear,
              VolunteerType.student,
            ),
      VolunteerType.staff || VolunteerType.partnerBarangay => true,
      VolunteerType.alumni =>
        hasMajor &&
            VolunteerFieldRules.isValidGraduationYear(
              data.graduationYear,
              VolunteerType.alumni,
            ),
    };
  }

  /// Every section of the details step for a [signUpType] volunteer (null for
  /// a student beneficiary, whose ID is read like a student's).
  static bool isComplete(
    RegisterOcrSample data, {
    required VolunteerType? signUpType,
    required bool hasDocument,
  }) {
    final common =
        supportingDocumentValid(signUpType, hasDocument: hasDocument) &&
        personalInfoValid(data, signUpType) &&
        contactInfoValid(data) &&
        homeAddressValid(data);
    if (!common) return false;

    if (signUpType == VolunteerType.partnerBarangay) {
      return partnerBarangayValid(data);
    }
    return schoolInfoValid(data, signUpType);
  }
}
