import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/presentation/widgets/register_step_indicator.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_account_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_face_scan_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_id_upload_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_ocr_review_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_verification_step.dart';

class RegisterFlowScreen extends StatefulWidget {
  const RegisterFlowScreen({super.key});

  @override
  State<RegisterFlowScreen> createState() => _RegisterFlowScreenState();
}

class _RegisterFlowScreenState extends State<RegisterFlowScreen> {
  static const _stepLabels = [
    'Upload ID',
    'Face scan',
    'Your details',
    'Account',
    'Verify',
  ];

  int _step = 0;
  XFile? _idFrontImage;
  XFile? _idBackImage;
  FaceCaptureSet _faceCaptures = const FaceCaptureSet();
  bool _ocrExtracting = false;
  bool _preparingFaceStep = false;
  bool _verificationCodeSent = false;

  RegisterOcrSample _ocrData = RegisterOcrSample.sample;
  String _email = RegisterOcrSample.suggestedEmail;
  String _password = '';
  String _confirmPassword = '';
  String _verificationCode = '';

  bool get _ocrDataValid {
    return _ocrData.firstname.trim().isNotEmpty &&
        _ocrData.lastname.trim().isNotEmpty &&
        _ocrData.age > 0 &&
        _ocrData.currentAddress.trim().isNotEmpty &&
        _ocrData.phoneNumber.trim().length >= 7 &&
        _ocrData.idNumber.trim().isNotEmpty &&
        _ocrData.departmentName.trim().isNotEmpty &&
        _ocrData.majorName.trim().isNotEmpty &&
        _ocrData.yearLevelName.trim().isNotEmpty &&
        _ocrData.graduationYear >= 1900 &&
        _ocrData.graduationMonth >= 1 &&
        _ocrData.graduationMonth <= 12 &&
        _ocrData.graduationDay >= 1 &&
        _ocrData.graduationDay <= 31;
  }

  bool get _accountValid {
    final emailOk = _email.contains('@') && _email.contains('.');
    final passwordOk = _password.length >= 8;
    final matchOk = _password == _confirmPassword && _confirmPassword.isNotEmpty;
    return emailOk && passwordOk && matchOk;
  }

  bool get _verificationValid =>
      _verificationCode.length == 6 &&
      _verificationCode == RegisterVerificationStep.demoCode;

  bool get _canContinue {
    switch (_step) {
      case 0:
        return _idFrontImage != null && _idBackImage != null;
      case 1:
        return _faceCaptures.isComplete;
      case 2:
        return !_ocrExtracting && _ocrDataValid;
      case 3:
        return _accountValid;
      case 4:
        return _verificationValid;
      default:
        return false;
    }
  }

  String get _continueLabel {
    switch (_step) {
      case 2:
        return 'Continue to account';
      case 3:
        return 'Send verification code';
      case 4:
        return 'Complete registration';
      default:
        return 'Continue';
    }
  }

  Future<void> _next() async {
    if (_step == 0) {
      setState(() => _preparingFaceStep = true);
      await Future<void>.delayed(const Duration(seconds: 2));
      if (!mounted) return;
      setState(() {
        _step = 1;
        _preparingFaceStep = false;
      });
      return;
    }

    if (_step == 1) {
      setState(() => _step = 2);
      await _runOcrPreview();
      return;
    }

    if (_step == 2) {
      setState(() => _step = 3);
      return;
    }

    if (_step == 3) {
      setState(() {
        _step = 4;
        _verificationCodeSent = true;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Verification code sent to $_email (preview: ${RegisterVerificationStep.demoCode})',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    _finish();
  }

  void _back() {
    if (_step == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _step--;
      if (_step < 2) _ocrExtracting = false;
      if (_step < 4) _verificationCodeSent = false;
    });
  }

  Future<void> _runOcrPreview() async {
    setState(() => _ocrExtracting = true);
    await Future<void>.delayed(const Duration(milliseconds: 1800));
    if (mounted) {
      setState(() {
        _ocrExtracting = false;
        _ocrData = RegisterOcrSample.sample;
      });
    }
  }

  void _finish() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Registration UI complete — connect to POST /auth when ready.',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.primary,
        title: const Text(
          'Create account',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _preparingFaceStep ? null : _back,
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
              child: _preparingFaceStep
                  ? const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: AppColors.primary),
                          SizedBox(height: 16),
                          Text(
                            'Preparing face scan…',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                          SizedBox(height: 6),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 32),
                            child: Text(
                              'Waiting for the camera to be released after your ID photos.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppColors.secondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 350),
                        child: _buildStep(),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (_canContinue && !_preparingFaceStep)
                      ? () => unawaited(_next())
                      : null,
                  child: Text(_preparingFaceStep ? 'Please wait…' : _continueLabel),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return RegisterIdUploadStep(
          key: const ValueKey('id'),
          frontImage: _idFrontImage,
          backImage: _idBackImage,
          onFrontPicked: (file) => setState(() => _idFrontImage = file),
          onBackPicked: (file) => setState(() => _idBackImage = file),
        );
      case 1:
        return RegisterFaceScanStep(
          key: const ValueKey('face'),
          captures: _faceCaptures,
          onCapturesChanged: (captures) =>
              setState(() => _faceCaptures = captures),
        );
      case 2:
        return RegisterOcrReviewStep(
          key: const ValueKey('ocr'),
          data: _ocrData,
          isExtracting: _ocrExtracting,
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
      case 4:
        return RegisterVerificationStep(
          key: const ValueKey('verify'),
          code: _verificationCode,
          codeSent: _verificationCodeSent,
          onCodeChanged: (v) => setState(() => _verificationCode = v),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
