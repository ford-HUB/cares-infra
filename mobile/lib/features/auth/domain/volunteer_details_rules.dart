import 'package:mobile/core/constants/partner_barangays.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/volunteer_field_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';

/// Split by form section; [isComplete] gates Continue. Also used for a student
/// beneficiary's review step.
abstract final class VolunteerDetailsRules {
  /// Alumni: Certificate of Graduation; partner barangay: supporting document.
  static bool requiresDocument(VolunteerType? signUpType) =>
      signUpType == VolunteerType.alumni ||
      signUpType == VolunteerType.partnerBarangay;

  /// Middle name optional.
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

  /// Partner-barangay volunteers must also pick a gender.
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

  /// The form writes an address only once complete, so non-blank means
  /// complete.
  static bool homeAddressValid(RegisterOcrSample data) =>
      data.currentAddress.trim().isNotEmpty;

  static bool supportingDocumentValid(
    VolunteerType? signUpType, {
    required bool hasDocument,
  }) => !requiresDocument(signUpType) || hasDocument;

  static bool partnerBarangayValid(RegisterOcrSample data) =>
      PartnerBarangays.names.contains(data.partnerBarangay);

  /// Partner-barangay volunteers have no school record.
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

  /// [signUpType] is null for a student beneficiary.
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
