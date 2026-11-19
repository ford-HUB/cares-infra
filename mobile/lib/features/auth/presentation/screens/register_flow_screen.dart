import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constants/partner_barangays.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/domain/volunteer_field_rules.dart';
import 'package:mobile/features/auth/domain/beneficiary_profile.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/domain/id_extraction_review.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/presentation/widgets/cares_terms_dialog.dart';
import 'package:mobile/features/auth/presentation/providers/password_policy_provider.dart';
import 'package:mobile/features/auth/presentation/providers/register_flow_provider.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/presentation/widgets/account_exists_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_account_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_beneficiary_details_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_face_scan_step.dart';
import 'package:mobile/features/auth/presentation/screens/email_verification_screen.dart';
import 'package:mobile/features/auth/presentation/screens/registration_success_screen.dart';
import 'package:mobile/features/auth/presentation/screens/registration_under_review_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_id_upload_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_ocr_review_step.dart';
import 'package:mobile/shared/widgets/gradient_button.dart';
import 'package:mobile/shared/widgets/header_band.dart';

/// Registration steps. Beneficiaries do not present an ID and are not face
/// scanned, so their flow omits [_RegisterStep.idUpload] and
/// [_RegisterStep.faceScan] and types the details in instead of reading them
/// off an ID with OCR. Alumni upload an alumni ID (not a student ID) and are face
/// scanned against it, then type their details in (no OCR), and a director
/// reviews the sign-up before the account opens. Partner-barangay volunteers
/// upload the front and back of a valid ID with no photo check and no face
/// scan, type their details in, pick their partner barangay (no ID number),
/// verify their email, and wait for a director's approval.
///
/// Volunteers (student, staff, alumni, partner barangay) whose ID photo the
/// app cannot properly recognize may switch to manual registration: the ID
/// skips the automatic checks, the face scan is dropped, the details are typed
/// in, and a director approves the resulting MANUAL_REGISTRATION request in the
/// Request module.
///
/// An individual beneficiary who picks Student on [_RegisterStep.details]
/// continues like a student volunteer — [_RegisterStep.idUpload],
/// [_RegisterStep.faceScan], then the details read off the school ID on
/// [_RegisterStep.review] — and needs no director approval.
enum _RegisterStep { idUpload, faceScan, details, review, account }

class RegisterFlowScreen extends ConsumerStatefulWidget {
  const RegisterFlowScreen({
    super.key,
    required this.roleType,
    this.volunteerType,
  }) : assert(
         roleType != RegistrationRoleType.volunteer || volunteerType != null,
         'volunteerType is required for volunteer registration',
       );

  final RegistrationRoleType roleType;
  final VolunteerType? volunteerType;

  @override
  ConsumerState<RegisterFlowScreen> createState() => _RegisterFlowScreenState();
}

class _RegisterFlowScreenState extends ConsumerState<RegisterFlowScreen> {
  int _stepIndex = 0;
  XFile? _idFrontImage;
  XFile? _idBackImage;

  /// What on-device OCR read off each side during pre-validation, used to
  /// fill and cross-check the server's extraction.
  String _idFrontText = '';
  String _idBackText = '';
  List<IdFieldFlag> _extractionFlags = const [];
  String? _registrationId;
  FaceCaptureSet _faceCaptures = const FaceCaptureSet();
  bool _ocrExtracting = false;
  bool _ocrExtractFailed = false;
  bool _ocrExtractSucceeded = false;
  String? _ocrExtractError;
  bool _isSubmitting = false;
  bool _startingSession = false;

  /// Set when a volunteer registrant picks Manual Registration after the app
  /// could not recognize their ID.
  bool _manualRegistration = false;
  String? _sessionError;

  /// ID sides kept although the photo check said they are not clear (Continue
  /// Anyway): the details read off them are open for correction.
  final Set<IdCardSide> _unclearSides = {};

  /// The ID-less session a beneficiary starts on entry. A student beneficiary's
  /// ID upload opens a new session; switching back to Regular returns here.
  String? _beneficiarySessionId;

  late RegisterOcrSample _ocrData;
  BeneficiaryProfile _beneficiaryProfile = const BeneficiaryProfile();

  /// The document a director reviews with the sign-up — a beneficiary's
  /// or partner-barangay volunteer's supporting document, an alumnus's
  /// Certificate of Graduation — and the copy
  /// already attached to the registration session, re-uploaded only when the
  /// pick changes.
  PlatformFile? _supportingDocument;
  PlatformFile? _uploadedDocument;
  String _email = '';
  String _password = '';
  String _confirmPassword = '';
  bool _acceptedTerms = false;

  /// Set when the server rejected a unique field (phone, ID number, email); the
  /// flow jumps back to that step and the input shows the message until edited.
  RegistrationConflict? _conflict;

  bool get _isBeneficiary =>
      widget.roleType == RegistrationRoleType.beneficiary;

  /// Alumni present an alumni ID: their face is matched against it, but it is
  /// not read by OCR — a director reviews it with the typed-in details.
  bool get _isAlumni => widget.volunteerType == VolunteerType.alumni;

  /// Partner-barangay volunteers present a valid ID that only a director
  /// reviews — no photo check or face scan — and have no school record or ID
  /// number.
  bool get _isPartnerBarangay =>
      widget.volunteerType == VolunteerType.partnerBarangay;

  /// Volunteer sign-ups can fall back to manual registration when the ID can't
  /// be recognized. A partner-barangay ID is never checked, so there is
  /// nothing to fall back from.
  bool get _supportsManualRegistration =>
      widget.volunteerType != null && !_isPartnerBarangay;

  /// An individual beneficiary registering as a UC student — the ID + face
  /// scan path, with no director approval.
  bool get _isStudentBeneficiary =>
      _isBeneficiary && _beneficiaryProfile.isStudent;

  /// A beneficiary who types everything in and waits for a director.
  bool get _isRegularBeneficiary => _isBeneficiary && !_isStudentBeneficiary;

  /// The volunteer type the school ID is read as — a student beneficiary's
  /// is read like a student volunteer's.
  VolunteerType? get _schoolVolunteerType =>
      widget.volunteerType ??
      (_isStudentBeneficiary ? VolunteerType.student : null);

  /// The step where the details read off the ID are checked.
  _RegisterStep get _detailsStep =>
      _isStudentBeneficiary ? _RegisterStep.review : _RegisterStep.details;

  /// Volunteer sign-ups whose ID a director reviews instead of it being face
  /// matched and read by OCR: the details are typed in. A manual registration
  /// is reviewed the same way.
  bool get _isDirectorReviewed =>
      _manualRegistration ||
      (widget.volunteerType?.isDirectorReviewed ?? false);

  /// Alumni close their details with a Certificate of Graduation and
  /// partner-barangay volunteers with a supporting document.
  bool get _collectsDocument => _isAlumni || _isPartnerBarangay;

  /// Accounts that stay shut until a director approves the sign-up.
  bool get _requiresApproval => _isRegularBeneficiary || _isDirectorReviewed;

  /// Partner-barangay and manual sign-ups have no face scan. Alumni are
  /// director reviewed but still face scanned against their alumni ID.
  bool get _skipsFaceScan => _manualRegistration || _isPartnerBarangay;

  List<_RegisterStep> get _steps => _isStudentBeneficiary
      ? const [
          _RegisterStep.details,
          _RegisterStep.idUpload,
          _RegisterStep.faceScan,
          _RegisterStep.review,
          _RegisterStep.account,
        ]
      : _isBeneficiary
      ? const [_RegisterStep.details, _RegisterStep.account]
      : _skipsFaceScan
      ? const [
          _RegisterStep.idUpload,
          _RegisterStep.details,
          _RegisterStep.account,
        ]
      : const [
          _RegisterStep.idUpload,
          _RegisterStep.faceScan,
          _RegisterStep.details,
          _RegisterStep.account,
        ];

  _RegisterStep get _currentStep => _steps[_stepIndex];

  List<String> get _stepLabels => [for (final step in _steps) _labelFor(step)];

  int _indexOf(_RegisterStep step) => _steps.indexOf(step);

  String _labelFor(_RegisterStep step) => switch (step) {
    _RegisterStep.idUpload =>
      _isAlumni
          ? 'Upload Your Alumni ID'
          : _isStudentBeneficiary
          ? 'Upload Your School ID'
          : 'Upload Your ID',
    _RegisterStep.faceScan => 'Face Scan',
    _RegisterStep.details =>
      _isStudentBeneficiary ? 'About You' : 'Your Details',
    _RegisterStep.review => 'Your Details',
    _RegisterStep.account => 'Create Account',
  };

  @override
  void initState() {
    super.initState();
    _ocrData = RegisterOcrSample.empty(
      volunteerType: widget.volunteerType?.apiValue ?? '',
    );
    if (_isBeneficiary) {
      unawaited(_startBeneficiarySession());
    }
  }

  /// Beneficiaries have no ID upload to open their registration session, so the
  /// session is created up front, before their details are typed in.
  Future<void> _startBeneficiarySession() async {
    setState(() {
      _startingSession = true;
      _sessionError = null;
    });

    try {
      final service = ref.read(authRegistrationServiceProvider);
      final response = await service.startSession(
        roleType: widget.roleType.apiValue,
      );
      if (!mounted) return;

      setState(() {
        _beneficiarySessionId = response.registrationId;
        // A student may have uploaded their ID while this was in flight.
        if (!_isStudentBeneficiary || _registrationId == null) {
          _registrationId = response.registrationId;
        }
        _startingSession = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _startingSession = false;
        _sessionError = e is ApiException
            ? e.message
            : 'Failed to start registration. Check your connection and try again.';
      });
    }
  }

  bool get _ocrDataValid {
    if (_isRegularBeneficiary) {
      // Beneficiaries register without an ID, so no ID number or school
      // information is collected on their details form.
      return _ocrData.firstname.trim().isNotEmpty &&
          _ocrData.lastname.trim().isNotEmpty &&
          _beneficiaryProfile.isComplete &&
          _ocrData.gender.trim().isNotEmpty &&
          _ocrData.age >= 12 &&
          _ocrData.age <= 80 &&
          // Barangay + city picked from the directory and a real street.
          _beneficiaryProfile.address.isComplete &&
          _ocrData.currentAddress.trim().isNotEmpty &&
          isValidPhilippinePhone(_ocrData.phoneNumber) &&
          _supportingDocument != null;
    }

    // A partner-barangay volunteer has no school ID or school record: the
    // director checks the uploaded ID, the barangay they picked and the
    // supporting document that ties them to it.
    if (_isPartnerBarangay) {
      return _supportingDocument != null &&
          _ocrData.firstname.trim().isNotEmpty &&
          _ocrData.lastname.trim().isNotEmpty &&
          _ocrData.gender.trim().isNotEmpty &&
          VolunteerFieldRules.isValidAge(_ocrData.age) &&
          _ocrData.currentAddress.trim().isNotEmpty &&
          isValidPhilippinePhone(_ocrData.phoneNumber) &&
          PartnerBarangays.names.contains(_ocrData.partnerBarangay);
    }

    // An alumni sign-up is filed with the Certificate of Graduation the director
    // reviews, so it cannot continue without one.
    if (_isAlumni && _supportingDocument == null) return false;

    final baseValid =
        _ocrData.firstname.trim().isNotEmpty &&
        _ocrData.lastname.trim().isNotEmpty &&
        VolunteerFieldRules.isValidAge(_ocrData.age) &&
        _ocrData.currentAddress.trim().isNotEmpty &&
        isValidPhilippinePhone(_ocrData.phoneNumber) &&
        _ocrData.idNumber.trim().isNotEmpty &&
        _ocrData.departmentName.trim().isNotEmpty;

    final volunteerType =
        VolunteerTypeX.fromApiValue(_ocrData.volunteerType) ??
        _schoolVolunteerType!;

    // Non-teaching personnel have no year level or graduation year to check.
    if (UclmDepartments.isNonTeaching(_ocrData.departmentName)) {
      return switch (volunteerType) {
        VolunteerType.staff => baseValid,
        _ => baseValid && _ocrData.majorName.trim().isNotEmpty,
      };
    }

    return switch (volunteerType) {
      VolunteerType.student =>
        baseValid &&
            _ocrData.majorName.trim().isNotEmpty &&
            _ocrData.yearLevelName.trim().isNotEmpty &&
            VolunteerFieldRules.isValidGraduationYear(
              _ocrData.graduationYear,
              VolunteerType.student,
            ),
      VolunteerType.staff || VolunteerType.partnerBarangay => baseValid,
      VolunteerType.alumni =>
        baseValid &&
            _ocrData.majorName.trim().isNotEmpty &&
            VolunteerFieldRules.isValidGraduationYear(
              _ocrData.graduationYear,
              VolunteerType.alumni,
            ),
    };
  }

  /// Beneficiary, alumni and partner-barangay details are typed in, so there is
  /// no extraction to wait for.
  bool get _detailsReady =>
      _isRegularBeneficiary || _isDirectorReviewed || _extractionReady;

  bool get _extractionReady =>
      !_ocrExtracting && !_ocrExtractFailed && _ocrExtractSucceeded;

  bool get _accountValid {
    final emailOk = _email.contains('@') && _email.contains('.');
    // The administrator's rules, so Continue unlocks on exactly what the chips under
    // the field are still asking for.
    final passwordOk = ref
        .watch(currentPasswordPolicyProvider)
        .isSatisfiedBy(_password);
    final matchOk =
        _password == _confirmPassword && _confirmPassword.isNotEmpty;
    return emailOk && passwordOk && matchOk && _acceptedTerms;
  }

  bool get _canContinue {
    if (_isSubmitting) return false;

    return switch (_currentStep) {
      _RegisterStep.idUpload => _idFrontImage != null && _idBackImage != null,
      _RegisterStep.faceScan => false,
      // A student beneficiary only picks their path here; their details are
      // read off the school ID on the review step.
      _RegisterStep.details =>
        _isStudentBeneficiary
            ? _beneficiaryProfile.isComplete
            : _detailsReady && _ocrDataValid,
      _RegisterStep.review => _extractionReady && _ocrDataValid,
      _RegisterStep.account => _accountValid,
    };
  }

  String get _continueLabel {
    if (_isSubmitting) return 'Please wait…';

    return switch (_currentStep) {
      _RegisterStep.idUpload => 'Upload and continue',
      _RegisterStep.details =>
        _isStudentBeneficiary ? 'Continue to school ID' : 'Continue to account',
      _RegisterStep.review => 'Continue to account',
      _RegisterStep.account => 'Continue to verification',
      _RegisterStep.faceScan => 'Continue',
    };
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _returnToConflict(RegistrationConflict conflict) async {
    if (!mounted) return;
    final step = switch (conflict.field) {
      RegistrationConflictField.email => _RegisterStep.account,
      RegistrationConflictField.phoneNumber ||
      RegistrationConflictField.idNumber => _detailsStep,
    };
    setState(() {
      _conflict = conflict;
      _stepIndex = _indexOf(step);
    });
    // A taken email is a dead end for this sign-up, so it gets a modal rather
    // than a passing snackbar; the other fields are just corrected in place.
    if (conflict.field == RegistrationConflictField.email) {
      await showAccountExistsDialog(context, email: _email.trim());
      return;
    }
    _showError(conflict.message);
  }

  /// Drops the inline conflict once its own field is edited — the next attempt
  /// re-validates on the server anyway.
  void _clearConflict(RegistrationConflictField field) {
    if (_conflict?.field == field) _conflict = null;
  }

  void _clearConflictsChangedBy(RegisterOcrSample next) {
    if (next.phoneNumber.trim() != _ocrData.phoneNumber.trim()) {
      _clearConflict(RegistrationConflictField.phoneNumber);
    }
    if (next.idNumber.trim() != _ocrData.idNumber.trim()) {
      _clearConflict(RegistrationConflictField.idNumber);
    }
  }

  String? _conflictMessageFor(RegistrationConflictField field) =>
      _conflict?.field == field ? _conflict!.message : null;

  Future<void> _next() async {
    switch (_currentStep) {
      case _RegisterStep.idUpload:
        await _uploadIdAndContinue();
      case _RegisterStep.faceScan:
        return;
      case _RegisterStep.details when _isStudentBeneficiary:
        setState(() => _stepIndex = _indexOf(_RegisterStep.idUpload));
      case _RegisterStep.review:
        setState(() => _stepIndex = _indexOf(_RegisterStep.account));
      case _RegisterStep.details:
        // Only flows that collect a document have one to attach; each of
        // them requires it before Continue unlocks.
        if (_requiresApproval &&
            _supportingDocument != null &&
            !await _attachSupportingDocument()) {
          return;
        }
        if (!mounted) return;
        setState(() => _stepIndex = _indexOf(_RegisterStep.account));
      case _RegisterStep.account:
        await _sendVerificationCode();
    }
  }

  /// Puts the picked document on the registration session, so the
  /// director's review request is filed with it at sign-up. Skipped when that
  /// same file is already attached. Returns false when the upload failed.
  Future<bool> _attachSupportingDocument() async {
    final document = _supportingDocument;
    final registrationId = _registrationId;
    if (document == null || document.path == null) return false;
    if (identical(document, _uploadedDocument)) return true;
    if (registrationId == null) {
      _showError('Registration session expired. Please restart registration.');
      return false;
    }

    setState(() => _isSubmitting = true);
    try {
      await ref
          .read(authRegistrationServiceProvider)
          .uploadRegistrationDocument(
            registrationId: registrationId,
            path: document.path!,
            name: document.name,
          );
      if (!mounted) return false;
      setState(() {
        _uploadedDocument = document;
        _isSubmitting = false;
      });
      return true;
    } catch (e) {
      if (!mounted) return false;
      setState(() => _isSubmitting = false);
      _showError(
        e is ApiException
            ? e.message
            : _isAlumni
            ? 'Could not upload your Certificate of Graduation. Please try again.'
            : 'Could not upload your supporting document. Please try again.',
      );
      return false;
    }
  }

  Future<void> _sendVerificationCode() async {
    final registrationId = _registrationId;
    if (registrationId == null) {
      _showError('Registration session expired. Please restart registration.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final service = ref.read(authRegistrationServiceProvider);
      // Phone / ID number go along so a clash is caught here, before any code
      // is mailed, and the user is sent back to that input.
      final sendResult = await service.sendVerificationCode(
        email: _email.trim(),
        phoneNumber: _ocrData.phoneNumber,
        idNumber: _isRegularBeneficiary || _isPartnerBarangay
            ? null
            : (_isAlumni ? _ocrData.registrationIdNumber : _ocrData.idNumber),
      );
      if (!mounted) return;

      setState(() => _isSubmitting = false);

      if (!sendResult.sent && sendResult.reused) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              sendResult.verified
                  ? 'Your email is already verified. Enter the same code to continue.'
                  : 'Your verification code is still active. Check your email and enter it below.',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }

      final email = _email.trim();
      final ocrData = _ocrData;
      final password = _password;
      final studentBeneficiary = _isStudentBeneficiary;

      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => EmailVerificationScreen(
            email: email,
            initialExpiresInSeconds: sendResult.expiresInSeconds,
            emailAlreadyVerified: sendResult.verified,
            codeReused: sendResult.reused,
            // A duplicate email / phone / ID number pops the OTP screen and
            // lands on that input; the verified email stays valid so the same
            // code finishes registration once it is fixed.
            onConflict: _returnToConflict,
            onVerified: (otpContext) async {
              final result = await service.registerFromSession(
                registrationId: registrationId,
                ocrData: ocrData,
                roleType: widget.roleType.apiValue,
                email: email,
                password: password,
                studentBeneficiary: studentBeneficiary,
              );
              if (!otpContext.mounted) return;

              // A new beneficiary, alumni or partner-barangay account waits for a
              // director's approval, so the flow ends on the review screen
              // rather than the sign-in confirmation.
              if (_requiresApproval || result['requires_approval'] == true) {
                Navigator.of(otpContext).pushAndRemoveUntil(
                  MaterialPageRoute<void>(
                    builder: (_) => RegistrationUnderReviewScreen(email: email),
                  ),
                  (route) => route.isFirst,
                );
                return;
              }

              // Sign-up does not sign the person in: confirm the account was
              // created, then send them back to the sign-in screen.
              Navigator.of(otpContext).pushAndRemoveUntil(
                MaterialPageRoute<void>(
                  builder: (_) => RegistrationSuccessScreen(email: email),
                ),
                (route) => route.isFirst,
              );
            },
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      final conflict = RegistrationConflict.fromException(e);
      if (conflict != null) {
        unawaited(_returnToConflict(conflict));
        return;
      }
      _showError(
        e is ApiException ? e.message : 'Failed to send verification code.',
      );
    }
  }

  Future<void> _uploadIdAndContinue() async {
    final front = _idFrontImage;
    final back = _idBackImage;
    if (front == null || back == null) return;

    setState(() => _isSubmitting = true);

    try {
      final service = ref.read(authRegistrationServiceProvider);
      // A manual registration, an alumni ID or a partner-barangay ID skips the
      // student-ID check and OCR. Alumni then do the face scan; a manual or
      // partner-barangay registration goes straight to typing the details in.
      final response = _manualRegistration
          ? await service.uploadManualId(
              front: front,
              back: back,
              volunteerType: widget.volunteerType!.apiValue,
            )
          : _isAlumni
          ? await service.uploadAlumniId(front: front, back: back)
          : _isPartnerBarangay
          ? await service.uploadPartnerBarangayId(front: front, back: back)
          : await service.uploadId(
              front: front,
              back: back,
              roleType: widget.roleType.apiValue,
            );
      if (!mounted) return;

      setState(() {
        _registrationId = response.registrationId;
        _stepIndex = _indexOf(
          _skipsFaceScan ? _RegisterStep.details : _RegisterStep.faceScan,
        );
        _isSubmitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      // The server's ID check could not recognize a staff ID (alumni IDs never
      // go through it): offer the same fallback as the on-device check,
      // rather than a dead end.
      if (_supportsManualRegistration &&
          !_isDirectorReviewed &&
          e is ApiException &&
          (e.statusCode == 400 || e.statusCode == 422)) {
        await _offerManualRegistration(e.message);
        return;
      }
      _showError(
        e is ApiException ? e.message : 'Failed to upload ID images: $e',
      );
    }
  }

  /// Turns on manual registration: the face scan step drops out, and the ID
  /// goes up without the automatic checks for a director to review.
  void _startManualRegistration() {
    setState(() {
      _manualRegistration = true;
      _faceCaptures = const FaceCaptureSet();
      _stepIndex = _indexOf(_RegisterStep.idUpload);
    });
  }

  /// The face scan could not match the selfie to an unclear ID: the same ID
  /// photos go up again as a manual registration for a director to review,
  /// and the flow moves on to typing the details in.
  Future<void> _switchToManualFromFaceScan() async {
    _startManualRegistration();
    await _uploadIdAndContinue();
  }

  /// Shown when the server rejects an ID the registrant chose to proceed with.
  /// They can retake the photos, or switch to manual registration and submit
  /// these ones for a director to review.
  Future<void> _offerManualRegistration(String reason) async {
    final manual = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(
          Icons.report_gmailerrorred_rounded,
          color: AppColors.accentOrange,
          size: 32,
        ),
        title: const Text('We couldn\'t verify your ID'),
        content: Text(
          '$reason\n\nRetake clearer photos of your ID, or continue with '
          'Manual Registration — there is no face scan, you type your details '
          'in, and a CARES director reviews your ID before your account opens.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Retake photos'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Manual Registration'),
          ),
        ],
      ),
    );
    if (!mounted || manual != true) return;
    _startManualRegistration();
    await _uploadIdAndContinue();
  }

  Future<void> _onFaceVerified(
    FaceCaptureSet captures,
    double similarity,
  ) async {
    setState(() {
      _faceCaptures = captures;
      _stepIndex = _indexOf(_detailsStep);
    });
    // An alumni ID is not read by OCR: the details are typed in and a director
    // checks them against the ID.
    if (_isDirectorReviewed) return;

    setState(() {
      _ocrExtracting = true;
      _ocrExtractFailed = false;
      _ocrExtractSucceeded = false;
      _ocrExtractError = null;
    });
    await _runOcrExtract();
  }

  Future<void> _runOcrExtract() async {
    final registrationId = _registrationId;
    if (registrationId == null) {
      if (!mounted) return;
      setState(() {
        _ocrExtracting = false;
        _ocrExtractFailed = true;
        _ocrExtractError =
            'Registration session expired. Please restart registration.';
      });
      return;
    }

    setState(() {
      _ocrExtracting = true;
      _ocrExtractFailed = false;
      _ocrExtractSucceeded = false;
      _ocrExtractError = null;
    });

    try {
      final service = ref.read(authRegistrationServiceProvider);
      final volunteerType = _schoolVolunteerType;
      final response = await service.extractId(
        registrationId: registrationId,
        staffId: volunteerType == VolunteerType.staff,
      );
      if (!mounted) return;

      var ocrData = response.ocrData;
      if (volunteerType != null) {
        ocrData = ocrData.copyWith(volunteerType: volunteerType.apiValue);
      } else if (_isBeneficiary) {
        // Never let the extractor's default volunteer type stick to a
        // beneficiary registration.
        ocrData = ocrData.copyWith(volunteerType: '');
      }
      // After the volunteer type is set, so a staff ID's raw text is read in
      // the staff layout.
      ocrData = ocrData.enrichFromRawText();
      final review = IdExtractionReview.of(
        ocrData,
        deviceFrontText: _idFrontText,
        deviceBackText: _idBackText,
        volunteerType: volunteerType,
      );

      setState(() {
        _ocrExtracting = false;
        _ocrExtractSucceeded = true;
        _ocrData = review.data;
        _extractionFlags = review.flags;
      });
    } catch (e) {
      if (!mounted) return;
      final message = e is ApiException
          ? e.message
          : 'Failed to extract ID details.';
      setState(() {
        _ocrExtracting = false;
        _ocrExtractFailed = true;
        _ocrExtractError = message;
      });
    }
  }

  void _back() {
    if (_isSubmitting) return;

    if (_stepIndex == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _stepIndex--;
      if (_currentStep == _RegisterStep.faceScan) {
        _faceCaptures = const FaceCaptureSet();
      }
      if (_currentStep != _RegisterStep.details &&
          _currentStep != _RegisterStep.review &&
          _currentStep != _RegisterStep.account) {
        _ocrExtracting = false;
        _ocrExtractFailed = false;
        _ocrExtractSucceeded = false;
        _ocrExtractError = null;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final registrationId = _registrationId;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        // White page ground: the flow header carries the brand green so the step
        // content can sit on white cards.
        backgroundColor: Colors.white,
        body: Column(
          children: [
            _FlowHeader(
              stepLabel: _stepLabels[_stepIndex],
              stepIndex: _stepIndex,
              stepCount: _stepLabels.length,
              onBack: _isSubmitting ? null : _back,
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 350),
                  child: _buildStep(registrationId),
                ),
              ),
            ),
            if (_currentStep != _RegisterStep.faceScan)
              Container(
                padding: EdgeInsets.fromLTRB(
                  20,
                  12,
                  20,
                  12 + MediaQuery.paddingOf(context).bottom,
                ),
                child: GradientButton(
                  label: _continueLabel,
                  onPressed: _canContinue ? () => unawaited(_next()) : null,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(String? registrationId) {
    switch (_currentStep) {
      case _RegisterStep.idUpload:
        return RegisterIdUploadStep(
          key: const ValueKey('id'),
          roleType: widget.roleType,
          alumniId: _isAlumni,
          partnerBarangayId: _isPartnerBarangay,
          staffId: widget.volunteerType == VolunteerType.staff,
          // A partner-barangay ID is taken as uploaded, like a manual one:
          // no on-device photo check, a director reviews it.
          skipPhotoCheck: _isPartnerBarangay,
          manualRegistration: _manualRegistration,
          onManualRegistration: _supportsManualRegistration
              ? _startManualRegistration
              : null,
          frontImage: _idFrontImage,
          backImage: _idBackImage,
          onFrontPicked: (file) => setState(() => _idFrontImage = file),
          onBackPicked: (file) => setState(() => _idBackImage = file),
          onAcceptedUnclear: (side) => setState(() => _unclearSides.add(side)),
          onSideValidated: (result) {
            // A fresh photo of this side; [onAcceptedUnclear] follows when it
            // was kept although unclear.
            _unclearSides.remove(result.side);
            if (result.side == IdCardSide.front) {
              _idFrontText = result.recognizedText;
            } else {
              _idBackText = result.recognizedText;
            }
          },
        );
      case _RegisterStep.faceScan:
        if (registrationId == null) {
          return _buildMissingSession();
        }

        final service = ref.read(authRegistrationServiceProvider);
        return RegisterFaceScanStep(
          key: const ValueKey('face'),
          registrationId: registrationId,
          captures: _faceCaptures,
          onCapturesChanged: (captures) =>
              setState(() => _faceCaptures = captures),
          verifySelfie: (selfie) => service.verifyFace(
            registrationId: registrationId,
            selfie: selfie,
          ),
          onVerified: (captures, similarity) =>
              unawaited(_onFaceVerified(captures, similarity)),
          // An alumni ID skips the server's ID check, so an unclear one first
          // shows up here, when no face can be matched against it: offer the
          // same manual registration fallback as the ID upload step.
          onManualRegistration: _isAlumni && _supportsManualRegistration
              ? () => unawaited(_switchToManualFromFaceScan())
              : null,
          idLabel: _isAlumni ? 'alumni ID' : 'ID',
        );
      case _RegisterStep.details:
        // The beneficiary session is created in the background on entry, so the
        // first step doubles as the session's loading / retry surface.
        if (_isBeneficiary) {
          if (registrationId == null) return _buildMissingSession();
          return RegisterBeneficiaryDetailsStep(
            // Rebuilt when Regular / Student flips, so its fields re-read the
            // details the other path left behind.
            key: ValueKey(
              'beneficiary-details-${_beneficiaryProfile.isStudent}',
            ),
            data: _ocrData,
            profile: _beneficiaryProfile,
            phoneError: _conflictMessageFor(
              RegistrationConflictField.phoneNumber,
            ),
            onChanged: (data) => setState(() {
              _clearConflictsChangedBy(data);
              _ocrData = data;
            }),
            onProfileChanged: _onBeneficiaryProfileChanged,
            document: _supportingDocument,
            onDocumentChanged: (document) =>
                setState(() => _supportingDocument = document),
          );
        }
        return _buildReviewStep();
      case _RegisterStep.review:
        return _buildReviewStep();
      case _RegisterStep.account:
        return _buildAccountStep();
    }
  }

  /// The details read off the ID (or typed in, for a director-reviewed
  /// sign-up), for a volunteer or a student beneficiary.
  Widget _buildReviewStep() {
    return RegisterOcrReviewStep(
      key: const ValueKey('ocr-review'),
      data: _ocrData,
      roleType: widget.roleType,
      volunteerType: _schoolVolunteerType,
      studentBeneficiary: _isStudentBeneficiary,
      unclearIdPhoto: _unclearSides.isNotEmpty,
      manualEntry: _isDirectorReviewed,
      manualRegistration: _manualRegistration,
      certificate: _collectsDocument ? _supportingDocument : null,
      onCertificateChanged: _collectsDocument
          ? (document) => setState(() => _supportingDocument = document)
          : null,
      isExtracting: _isDirectorReviewed ? false : _ocrExtracting,
      extractFailed: _isDirectorReviewed ? false : _ocrExtractFailed,
      extractErrorMessage: _ocrExtractError,
      extractionFlags: _extractionFlags,
      onRetry: () => unawaited(_runOcrExtract()),
      phoneError: _conflictMessageFor(RegistrationConflictField.phoneNumber),
      idNumberError: _conflictMessageFor(RegistrationConflictField.idNumber),
      onChanged: (data) => setState(() {
        _clearConflictsChangedBy(data);
        _ocrData = data;
      }),
    );
  }

  Widget _buildAccountStep() {
    return RegisterAccountStep(
      key: const ValueKey('account'),
      email: _email,
      password: _password,
      confirmPassword: _confirmPassword,
      emailError: _conflictMessageFor(RegistrationConflictField.email),
      onEmailChanged: (v) => setState(() {
        if (v.trim() != _email.trim()) {
          _clearConflict(RegistrationConflictField.email);
        }
        _email = v;
      }),
      onPasswordChanged: (v) => setState(() => _password = v),
      onConfirmPasswordChanged: (v) => setState(() => _confirmPassword = v),
      termsAudience: _isBeneficiary
          ? CaresTermsAudience.beneficiary
          : CaresTermsAudience.volunteer,
      acceptedTerms: _acceptedTerms,
      onAcceptedTermsChanged: (v) => setState(() => _acceptedTerms = v),
    );
  }

  /// Regular ↔ Student changes the whole path, so whatever the other path
  /// captured is dropped: a student's ID, face and scan, or a regular
  /// beneficiary's school-free details being read as a student's.
  void _onBeneficiaryProfileChanged(BeneficiaryProfile profile) {
    final pathChanged = profile.isStudent != _beneficiaryProfile.isStudent;
    setState(() {
      _beneficiaryProfile = profile;
      if (!pathChanged) return;
      _idFrontImage = null;
      _idBackImage = null;
      _idFrontText = '';
      _idBackText = '';
      _unclearSides.clear();
      _faceCaptures = const FaceCaptureSet();
      _extractionFlags = const [];
      _ocrExtracting = false;
      _ocrExtractFailed = false;
      _ocrExtractSucceeded = false;
      _ocrExtractError = null;
      // Back on the ID-less session; a student's upload opens its own.
      _registrationId = _beneficiarySessionId;
      if (!profile.isStudent) {
        _ocrData = _ocrData.copyWith(volunteerType: '');
      }
    });
  }

  Widget _buildMissingSession() {
    if (!_isBeneficiary || _currentStep != _RegisterStep.details) {
      return const Center(
        key: ValueKey('face-missing-session'),
        child: Text(
          'Missing registration session. Go back and upload your ID again.',
        ),
      );
    }

    if (_startingSession) {
      return const Padding(
        key: ValueKey('session-starting'),
        padding: EdgeInsets.symmetric(vertical: 64),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    return Padding(
      key: const ValueKey('session-failed'),
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          const Icon(
            Icons.wifi_off_rounded,
            size: 40,
            color: AppColors.textMuted,
          ),
          const SizedBox(height: 12),
          Text(
            _sessionError ?? 'Could not start your registration.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => unawaited(_startBeneficiarySession()),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try again'),
          ),
        ],
      ),
    );
  }
}

/// Green band at the top of the registration flow — back arrow, which flow you
/// are in, and how far along you are. It concentrates the brand colour in one
/// place so every step below it can sit on white.
class _FlowHeader extends StatelessWidget {
  const _FlowHeader({
    required this.stepLabel,
    required this.stepIndex,
    required this.stepCount,
    required this.onBack,
  });

  final String stepLabel;
  final int stepIndex;
  final int stepCount;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return HeaderBand(
      padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Semantics(
                button: true,
                label: 'Back',
                child: InkWell(
                  onTap: onBack,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(0, 8, 14, 8),
                    child: Icon(
                      Icons.arrow_back_rounded,
                      size: 26,
                      color: onBack == null ? Colors.white54 : Colors.white,
                    ),
                  ),
                ),
              ),
              Text(
                'Step ${stepIndex + 1} of $stepCount',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Colors.white.withValues(alpha: 0.95),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            stepLabel,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.15,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              for (var index = 0; index < stepCount; index++) ...[
                Expanded(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    height: 6,
                    decoration: BoxDecoration(
                      color: index <= stepIndex
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                if (index < stepCount - 1) const SizedBox(width: 8),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
