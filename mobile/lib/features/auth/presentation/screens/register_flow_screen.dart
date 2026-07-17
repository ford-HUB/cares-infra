import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/presentation/providers/register_flow_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/register_step_indicator.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_account_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_face_scan_step.dart';
import 'package:mobile/features/auth/presentation/screens/email_verification_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_id_upload_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_ocr_review_step.dart';

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
  static const _stepLabels = [
    'Upload ID',
    'Face scan',
    'Your details',
    'Account',
  ];

  int _step = 0;
  XFile? _idFrontImage;
  XFile? _idBackImage;
  String? _registrationId;
  FaceCaptureSet _faceCaptures = const FaceCaptureSet();
  bool _ocrExtracting = false;
  bool _ocrExtractFailed = false;
  bool _ocrExtractSucceeded = false;
  String? _ocrExtractError;
  bool _isSubmitting = false;

  late RegisterOcrSample _ocrData;
  String _email = '';
  String _password = '';
  String _confirmPassword = '';

  bool get _isBeneficiary =>
      widget.roleType == RegistrationRoleType.beneficiary;

  String get _flowTitle => _isBeneficiary
      ? '${widget.roleType.title} registration'
      : '${widget.volunteerType!.label} registration';

  @override
  void initState() {
    super.initState();
    _ocrData = RegisterOcrSample.empty(
      volunteerType: widget.volunteerType?.apiValue ?? '',
    );
  }

  bool get _ocrDataValid {
    if (_isBeneficiary) {
      return _ocrData.firstname.trim().isNotEmpty &&
          _ocrData.lastname.trim().isNotEmpty &&
          _ocrData.gender.trim().isNotEmpty &&
          _ocrData.age > 0 &&
          _ocrData.currentAddress.trim().isNotEmpty &&
          _ocrData.phoneNumber.trim().length >= 7 &&
          _ocrData.idNumber.trim().isNotEmpty;
    }

    final baseValid = _ocrData.firstname.trim().isNotEmpty &&
        _ocrData.lastname.trim().isNotEmpty &&
        _ocrData.age > 0 &&
        _ocrData.currentAddress.trim().isNotEmpty &&
        _ocrData.phoneNumber.trim().length >= 7 &&
        _ocrData.idNumber.trim().isNotEmpty &&
        _ocrData.departmentName.trim().isNotEmpty;

    final volunteerType =
        VolunteerTypeX.fromApiValue(_ocrData.volunteerType) ??
            widget.volunteerType!;

    return switch (volunteerType) {
      VolunteerType.student => baseValid &&
          _ocrData.majorName.trim().isNotEmpty &&
          _ocrData.yearLevelName.trim().isNotEmpty &&
          _ocrData.graduationYear >= 1900 &&
          _ocrData.graduationMonth >= 1 &&
          _ocrData.graduationMonth <= 12 &&
          _ocrData.graduationDay >= 1 &&
          _ocrData.graduationDay <= 31,
      VolunteerType.staff => baseValid,
      VolunteerType.alumni => baseValid &&
          _ocrData.majorName.trim().isNotEmpty &&
          _ocrData.graduationYear >= 1900,
    };
  }

  bool get _accountValid {
    final emailOk = _email.contains('@') && _email.contains('.');
    final passwordOk = _password.length >= 8;
    final matchOk = _password == _confirmPassword && _confirmPassword.isNotEmpty;
    return emailOk && passwordOk && matchOk;
  }

  bool get _canContinue {
    if (_isSubmitting) return false;

    switch (_step) {
      case 0:
        return _idFrontImage != null && _idBackImage != null;
      case 1:
        return false;
      case 2:
        return !_ocrExtracting &&
            !_ocrExtractFailed &&
            _ocrExtractSucceeded &&
            _ocrDataValid;
      case 3:
        return _accountValid;
      default:
        return false;
    }
  }

  String get _continueLabel {
    if (_isSubmitting) return 'Please wait…';

    switch (_step) {
      case 0:
        return 'Upload and continue';
      case 2:
        return 'Continue to account';
      case 3:
        return 'Continue to verification';
      default:
        return 'Continue';
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _next() async {
    if (_step == 0) {
      await _uploadIdAndContinue();
      return;
    }

    if (_step == 2) {
      setState(() => _step = 3);
      return;
    }

    if (_step == 3) {
      await _sendVerificationCode();
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
      final sendResult = await service.sendVerificationCode(email: _email.trim());
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

      final completed = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => EmailVerificationScreen(
            email: _email.trim(),
            registrationId: registrationId,
            ocrData: _ocrData,
            roleType: widget.roleType,
            password: _password,
            initialExpiresInSeconds: sendResult.expiresInSeconds,
            emailAlreadyVerified: sendResult.verified,
            codeReused: sendResult.reused,
          ),
        ),
      );

      if (completed == true && mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
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
      final response = await service.uploadId(
        front: front,
        back: back,
        roleType: widget.roleType.apiValue,
      );
      if (!mounted) return;

      setState(() {
        _registrationId = response.registrationId;
        _step = 1;
        _isSubmitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      _showError(e is ApiException ? e.message : 'Failed to upload ID images: $e');
    }
  }

  Future<void> _onFaceVerified(FaceCaptureSet captures, double similarity) async {
    setState(() {
      _faceCaptures = captures;
      _step = 2;
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
      final response = await service.extractId(registrationId: registrationId);
      if (!mounted) return;

      var ocrData = response.ocrData.enrichFromRawText();
      final volunteerType = widget.volunteerType;
      if (volunteerType != null) {
        ocrData = ocrData.copyWith(volunteerType: volunteerType.apiValue);
      }

      setState(() {
        _ocrExtracting = false;
        _ocrExtractSucceeded = true;
        _ocrData = ocrData;
      });
    } catch (e) {
      if (!mounted) return;
      final message =
          e is ApiException ? e.message : 'Failed to extract ID details.';
      setState(() {
        _ocrExtracting = false;
        _ocrExtractFailed = true;
        _ocrExtractError = message;
      });
    }
  }

  void _back() {
    if (_isSubmitting) return;

    if (_step == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _step--;
      if (_step == 1) {
        _faceCaptures = const FaceCaptureSet();
      }
      if (_step < 2) {
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.primary,
        title: Text(
          _flowTitle,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _isSubmitting ? null : _back,
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
              child: RegisterStepIndicator(
                currentStep: _step,
                labels: _stepLabels,
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 350),
                  child: _buildStep(registrationId),
                ),
              ),
            ),
            if (_step != 1)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _canContinue ? () => unawaited(_next()) : null,
                    child: Text(_continueLabel),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(String? registrationId) {
    switch (_step) {
      case 0:
        return RegisterIdUploadStep(
          key: const ValueKey('id'),
          roleType: widget.roleType,
          frontImage: _idFrontImage,
          backImage: _idBackImage,
          onFrontPicked: (file) => setState(() => _idFrontImage = file),
          onBackPicked: (file) => setState(() => _idBackImage = file),
        );
      case 1:
        if (registrationId == null) {
          return const Center(
            key: ValueKey('face-missing-session'),
            child: Text('Missing registration session. Go back and upload your ID again.'),
          );
        }

        final service = ref.read(authRegistrationServiceProvider);
        return RegisterFaceScanStep(
          key: const ValueKey('face'),
          registrationId: registrationId,
          captures: _faceCaptures,
          onCapturesChanged: (captures) => setState(() => _faceCaptures = captures),
          verifySelfie: (selfie) => service.verifyFace(
            registrationId: registrationId,
            selfie: selfie,
          ),
          onVerified: (captures, similarity) =>
              unawaited(_onFaceVerified(captures, similarity)),
        );
      case 2:
        return RegisterOcrReviewStep(
          key: const ValueKey('ocr-review'),
          data: _ocrData,
          roleType: widget.roleType,
          volunteerType: widget.volunteerType,
          isExtracting: _ocrExtracting,
          extractFailed: _ocrExtractFailed,
          extractErrorMessage: _ocrExtractError,
          onRetry: () => unawaited(_runOcrExtract()),
          onChanged: (data) => setState(() => _ocrData = data),
        );
      case 3:
        return RegisterAccountStep(
          key: const ValueKey('account'),
          email: _email,
          password: _password,
          confirmPassword: _confirmPassword,
          onEmailChanged: (v) => setState(() => _email = v),
          onPasswordChanged: (v) => setState(() => _password = v),
          onConfirmPasswordChanged: (v) => setState(() => _confirmPassword = v),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
