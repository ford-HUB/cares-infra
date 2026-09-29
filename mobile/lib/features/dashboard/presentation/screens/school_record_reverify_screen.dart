import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_face_scan_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_id_upload_step.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/presentation/widgets/school_record_reverify_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/verification_flow_header.dart';

enum _ReverifyStep { intro, idUpload, faceScan, extracting, done }

/// Re-runs the registration identity check to refresh a volunteer's school
/// record. The department is never typed in: the ID is uploaded and validated
/// (`/auth/upload-id`), a selfie is matched against it (`/auth/verify-face`),
/// the OCR service reads the card (`/auth/extract-id`), and the server then
/// rewrites department / program / year level / student ID from that read
/// (`POST /profile/me/mobile/school-record`).
class SchoolRecordReverifyScreen extends StatefulWidget {
  const SchoolRecordReverifyScreen({super.key});

  /// Resolves to the refreshed profile, or null when the person backed out.
  static Future<MobileProfile?> open(BuildContext context) {
    return Navigator.of(context).push<MobileProfile>(
      MaterialPageRoute<MobileProfile>(
        builder: (_) => const SchoolRecordReverifyScreen(),
      ),
    );
  }

  @override
  State<SchoolRecordReverifyScreen> createState() =>
      _SchoolRecordReverifyScreenState();
}

class _SchoolRecordReverifyScreenState
    extends State<SchoolRecordReverifyScreen> {
  static const _steps = [
    _ReverifyStep.intro,
    _ReverifyStep.idUpload,
    _ReverifyStep.faceScan,
    _ReverifyStep.extracting,
    _ReverifyStep.done,
  ];

  final AuthRegistrationService _registration = AuthRegistrationService();
  final ProfileService _profileService = ProfileService();

  var _step = _ReverifyStep.intro;

  XFile? _idFrontImage;
  XFile? _idBackImage;
  FaceCaptureSet _faceCaptures = const FaceCaptureSet();

  /// Session handed back by `/auth/upload-id`; the face and OCR steps key
  /// off it.
  String? _registrationId;

  bool _submitting = false;

  /// Why the extract / apply step failed, shown with a retry.
  String? _extractError;

  /// OCR moves the session past `face_verified`, after which `/auth/extract-id`
  /// refuses to run again — so a retry after a failed apply skips it.
  bool _ocrDone = false;

  MobileProfile? _result;

  int get _stepIndex => _steps.indexOf(_step);

  String get _stepLabel => switch (_step) {
    _ReverifyStep.intro => 'Update school record',
    _ReverifyStep.idUpload => 'Upload your ID',
    _ReverifyStep.faceScan => 'Verify your face',
    _ReverifyStep.extracting => 'Reading your ID',
    _ReverifyStep.done => 'School record updated',
  };

  bool get _canContinue => switch (_step) {
    _ReverifyStep.intro => true,
    _ReverifyStep.idUpload =>
      !_submitting && _idFrontImage != null && _idBackImage != null,
    _ReverifyStep.faceScan => false,
    _ReverifyStep.extracting => false,
    _ReverifyStep.done => true,
  };

  String get _continueLabel => switch (_step) {
    _ReverifyStep.intro => 'Start verification',
    _ReverifyStep.idUpload => 'Continue to face scan',
    _ReverifyStep.faceScan || _ReverifyStep.extracting => 'Continue',
    _ReverifyStep.done => 'Back to profile',
  };

  bool get _showsContinue =>
      _step != _ReverifyStep.faceScan && _step != _ReverifyStep.extracting;

  void _back() {
    if (_submitting) return;
    if (_step == _ReverifyStep.done) {
      Navigator.of(context).pop(_result);
      return;
    }
    if (_stepIndex == 0 || _step == _ReverifyStep.extracting) {
      Navigator.of(context).maybePop();
      return;
    }
    setState(() => _step = _steps[_stepIndex - 1]);
  }

  void _next() {
    switch (_step) {
      case _ReverifyStep.intro:
        setState(() => _step = _ReverifyStep.idUpload);
      case _ReverifyStep.idUpload:
        unawaited(_uploadId());
      case _ReverifyStep.faceScan:
      case _ReverifyStep.extracting:
        break;
      case _ReverifyStep.done:
        Navigator.of(context).pop(_result);
    }
  }

  // ---------------------------------------------------------------------------
  // Steps

  Future<void> _uploadId() async {
    final front = _idFrontImage;
    final back = _idBackImage;
    if (front == null || back == null) return;

    setState(() => _submitting = true);
    try {
      final response = await _registration.uploadId(
        front: front,
        back: back,
        roleType: RegistrationRoleType.volunteer.apiValue,
      );
      if (!mounted) return;
      setState(() {
        _registrationId = response.registrationId;
        _ocrDone = false;
        _faceCaptures = const FaceCaptureSet();
        _step = _ReverifyStep.faceScan;
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      _showMessage(
        e is ApiException ? e.message : 'Could not upload your ID. Try again.',
      );
    }
  }

  void _onFaceVerified(FaceCaptureSet captures, double similarity) {
    setState(() {
      _faceCaptures = captures;
      _step = _ReverifyStep.extracting;
      _extractError = null;
    });
    unawaited(_extractAndApply());
  }

  /// OCR the card, then let the server rewrite the record from that read.
  Future<void> _extractAndApply() async {
    final registrationId = _registrationId;
    if (registrationId == null) return;

    setState(() {
      _submitting = true;
      _extractError = null;
    });

    try {
      if (!_ocrDone) {
        await _registration.extractId(registrationId: registrationId);
        _ocrDone = true;
      }
      final profile = await _profileService.applySchoolRecord(
        registrationId: registrationId,
      );
      if (!mounted) return;
      setState(() {
        _result = profile;
        _step = _ReverifyStep.done;
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _extractError = e is ApiException
            ? e.message
            : 'We could not read your ID. Please try again.';
      });
    }
  }

  /// A bad read means new photos, not a blind retry of the same ones.
  void _retakePhotos() {
    setState(() {
      _idFrontImage = null;
      _idBackImage = null;
      _registrationId = null;
      _ocrDone = false;
      _extractError = null;
      _step = _ReverifyStep.idUpload;
    });
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  // ---------------------------------------------------------------------------
  // Build

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_submitting,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Column(
          children: [
            VerificationFlowHeader(
              stepLabel: _stepLabel,
              stepIndex: _stepIndex,
              stepCount: _steps.length,
              onBack: _back,
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 350),
                  child: _buildStep(),
                ),
              ),
            ),
            if (_showsContinue)
              Container(
                padding: EdgeInsets.fromLTRB(
                  20,
                  12,
                  20,
                  12 + MediaQuery.paddingOf(context).bottom,
                ),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: Color(0xFFE6EFE3))),
                ),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _canContinue ? _next : null,
                    child: _submitting
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: Colors.white,
                            ),
                          )
                        : Text(_continueLabel),
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
      case _ReverifyStep.intro:
        return const SchoolRecordReverifyIntro(key: ValueKey('intro'));
      case _ReverifyStep.idUpload:
        return RegisterIdUploadStep(
          key: const ValueKey('id'),
          roleType: RegistrationRoleType.volunteer,
          frontImage: _idFrontImage,
          backImage: _idBackImage,
          onFrontPicked: (file) => setState(() => _idFrontImage = file),
          onBackPicked: (file) => setState(() => _idBackImage = file),
        );
      case _ReverifyStep.faceScan:
        final registrationId = _registrationId!;
        return RegisterFaceScanStep(
          key: const ValueKey('face'),
          registrationId: registrationId,
          captures: _faceCaptures,
          onCapturesChanged: (captures) =>
              setState(() => _faceCaptures = captures),
          verifySelfie: (selfie) => _registration.verifyFace(
            registrationId: registrationId,
            selfie: selfie,
          ),
          onVerified: _onFaceVerified,
        );
      case _ReverifyStep.extracting:
        return SchoolRecordExtracting(
          key: const ValueKey('extracting'),
          error: _extractError,
          onRetry: _extractAndApply,
          onRetakePhotos: _retakePhotos,
        );
      case _ReverifyStep.done:
        return SchoolRecordReverifyResult(
          key: const ValueKey('done'),
          school: _result?.volunteer?.school,
        );
    }
  }
}
