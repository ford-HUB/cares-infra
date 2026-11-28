import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/domain/beneficiary_profile.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/domain/id_extraction_review.dart';
import 'package:mobile/features/auth/domain/id_image_quality.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_account_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_details_rules.dart';
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

/// Beneficiaries skip [_RegisterStep.idUpload] / [_RegisterStep.faceScan] and
/// type details in. Alumni: alumni ID + face scan, typed details, director
/// review. Partner barangay: ID front/back with no photo check or face scan,
/// typed details, director approval.
///
/// Unrecognized volunteer IDs may fall back to manual registration (no checks
/// or face scan; a MANUAL_REGISTRATION request in the Request module). A
/// student beneficiary continues like a student volunteer, ending on
/// [_RegisterStep.review], with no approval.
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

  /// On-device OCR per side, used to fill and cross-check the server's
  /// extraction.
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

  bool _manualRegistration = false;
  String? _sessionError;

  /// Sides kept via Continue Anyway; their details stay open for correction.
  final Set<IdCardSide> _unclearSides = {};

  /// A student beneficiary's ID upload opens a new session; switching back to
  /// Regular returns here.
  String? _beneficiarySessionId;

  late RegisterOcrSample _ocrData;
  BeneficiaryProfile _beneficiaryProfile = const BeneficiaryProfile();

  /// The document a director reviews, and the copy already attached
  /// (re-uploaded only when the pick changes).
  PlatformFile? _supportingDocument;
  PlatformFile? _uploadedDocument;
  String _email = '';
  String _password = '';
  String _confirmPassword = '';
  bool _acceptedTerms = false;

  /// Server-rejected unique field; the flow jumps back and the input shows it
  /// until edited.
  RegistrationConflict? _conflict;

  bool get _isBeneficiary =>
      widget.roleType == RegistrationRoleType.beneficiary;

  /// Face-matched against the alumni ID but not OCR'd.
  bool get _isAlumni => widget.volunteerType == VolunteerType.alumni;

  /// ID reviewed only by a director; no school record or ID number.
  bool get _isPartnerBarangay =>
      widget.volunteerType == VolunteerType.partnerBarangay;

  /// A partner-barangay ID is never checked, so there's nothing to fall back
  /// from.
  bool get _supportsManualRegistration =>
      widget.volunteerType != null && !_isPartnerBarangay;

  /// ID + face scan path, no director approval.
  bool get _isStudentBeneficiary =>
      _isBeneficiary && _beneficiaryProfile.isStudent;

  bool get _isRegularBeneficiary => _isBeneficiary && !_isStudentBeneficiary;

  /// A student beneficiary's ID is read like a student volunteer's.
  VolunteerType? get _schoolVolunteerType =>
      widget.volunteerType ??
      (_isStudentBeneficiary ? VolunteerType.student : null);

  _RegisterStep get _detailsStep =>
      _isStudentBeneficiary ? _RegisterStep.review : _RegisterStep.details;

  /// Typed-in details reviewed by a director, including manual registrations.
  bool get _isDirectorReviewed =>
      _manualRegistration ||
      (widget.volunteerType?.isDirectorReviewed ?? false);

  /// Alumni: Certificate of Graduation; partner barangay: supporting document.
  bool get _collectsDocument => _isAlumni || _isPartnerBarangay;

  bool get _requiresApproval => _isRegularBeneficiary || _isDirectorReviewed;

  /// Alumni are director-reviewed but still face-scanned.
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

  /// No ID upload to open the session, so it's created up front.
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
      // No ID number or school info for beneficiaries.
      return _ocrData.firstname.trim().isNotEmpty &&
          _ocrData.lastname.trim().isNotEmpty &&
          _beneficiaryProfile.isComplete &&
          _ocrData.gender.trim().isNotEmpty &&
          _ocrData.age >= 12 &&
          _ocrData.age <= 80 &&
          _beneficiaryProfile.address.isComplete &&
          _ocrData.currentAddress.trim().isNotEmpty &&
          isValidPhilippinePhone(_ocrData.phoneNumber) &&
          _supportingDocument != null;
    }

    // Partner-barangay volunteers are checked on their barangay; alumni and
    // partner-barangay sign-ups need the document.
    return VolunteerDetailsRules.isComplete(
      _ocrData,
      signUpType: _schoolVolunteerType,
      hasDocument: _supportingDocument != null,
    );
  }

  /// Typed in, so no extraction to wait for.
  bool get _detailsReady =>
      _isRegularBeneficiary || _isDirectorReviewed || _extractionReady;

  bool get _extractionReady =>
      !_ocrExtracting && !_ocrExtractFailed && _ocrExtractSucceeded;

  bool get _accountValid => RegistrationAccountRules.isComplete(
    email: _email,
    password: _password,
    confirmPassword: _confirmPassword,
    acceptedTerms: _acceptedTerms,
    // Continue unlocks on exactly what the chips ask for.
    policy: ref.watch(currentPasswordPolicyProvider),
  );

  bool get _canContinue {
    if (_isSubmitting) return false;

    return switch (_currentStep) {
      _RegisterStep.idUpload => _idFrontImage != null && _idBackImage != null,
      _RegisterStep.faceScan => false,
      // A student beneficiary only picks a path here; details come from the
      // school ID on review.
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
    // A taken email is a dead end, so it gets a modal; other fields are fixed
    // in place.
    if (conflict.field == RegistrationConflictField.email) {
      await showAccountExistsDialog(context, email: _email.trim());
      return;
    }
    _showError(conflict.message);
  }

  /// The next attempt re-validates on the server anyway.
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
        // Only document-collecting flows get here, and each requires the
        // document.
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

  /// Filed with the director's review request; skipped if already attached.
  /// False on upload failure.
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
      // Sent so a clash is caught before any code is mailed.
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
            // A clash pops the OTP screen; the verified email stays valid so
            // the same code finishes once fixed.
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

              // Approval-gated accounts end on the review screen.
              if (_requiresApproval || result['requires_approval'] == true) {
                Navigator.of(otpContext).pushAndRemoveUntil(
                  MaterialPageRoute<void>(
                    builder: (_) => RegistrationUnderReviewScreen(email: email),
                  ),
                  (route) => route.isFirst,
                );
                return;
              }

              // Sign-up does not sign in.
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
      // Manual, alumni and partner-barangay IDs skip the student-ID check and
      // OCR; only alumni then face-scan.
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
      // The server couldn't recognize a staff ID: offer the same manual
      // fallback, not a dead end.
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

  /// Drops the face scan; the ID goes up unchecked for director review.
  void _startManualRegistration() {
    setState(() {
      _manualRegistration = true;
      _faceCaptures = const FaceCaptureSet();
      _stepIndex = _indexOf(_RegisterStep.idUpload);
    });
  }

  /// The face scan couldn't match an unclear ID: resubmit it as a manual
  /// registration.
  Future<void> _switchToManualFromFaceScan() async {
    _startManualRegistration();
    await _uploadIdAndContinue();
  }

  /// The server rejected an ID the registrant kept: retake, or submit as
  /// manual.
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
    // Director-reviewed: details are typed in, not OCR'd.
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
        // The extractor's default volunteer type must not stick to a
        // beneficiary.
        ocrData = ocrData.copyWith(volunteerType: '');
      }
      // After the volunteer type is set, so staff raw text uses the staff
      // layout.
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
        // The flow header carries the brand green; steps sit on white cards.
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
          // Partner-barangay IDs are taken as uploaded; a director reviews
          // them.
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
            // Fresh photo; [onAcceptedUnclear] follows if it was kept unclear.
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
          // Alumni IDs skip the server check, so an unclear one surfaces here:
          // offer the manual fallback.
          onManualRegistration: _isAlumni && _supportsManualRegistration
              ? () => unawaited(_switchToManualFromFaceScan())
              : null,
          idLabel: _isAlumni ? 'alumni ID' : 'ID',
        );
      case _RegisterStep.details:
        // The beneficiary session starts in the background, so this step
        // doubles as its loading/retry surface.
        if (_isBeneficiary) {
          if (registrationId == null) return _buildMissingSession();
          return RegisterBeneficiaryDetailsStep(
            // Rebuilt when Regular/Student flips so fields re-read the other
            // path's details.
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

  /// Regular ↔ Student changes the whole path, so the other path's captures are
  /// dropped.
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
