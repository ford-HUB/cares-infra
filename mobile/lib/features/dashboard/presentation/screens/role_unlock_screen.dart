import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_face_scan_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_id_upload_step.dart';
import 'package:mobile/features/dashboard/data/activity_log_service.dart';
import 'package:mobile/features/dashboard/data/user_request_service.dart';
import 'package:mobile/features/dashboard/presentation/widgets/verification_flow_header.dart';

enum _UnlockStep { intro, idUpload, faceScan, underReview }

/// Requests a locked role on the signed-in account by repeating the identity
/// check used at registration: upload the ID, then match a selfie against it.
///
/// The ID goes through `POST /auth/upload-id`, so only cards the ucid-service
/// classifier was trained on (UCLM student IDs, front and back) are accepted;
/// the selfie goes through `POST /auth/verify-face` against that upload.
///
/// Passing both does not open the role. It is marked pending in
/// [RoleAccountStore] and stays that way until an administrator approves the
/// request.
class RoleUnlockScreen extends StatefulWidget {
  const RoleUnlockScreen({
    super.key,
    required this.account,
    this.skipIntro = false,
  });

  final RoleAccount account;

  /// Start straight on the ID upload — used when the caller has already
  /// explained the requirements (e.g. the confirm dialog on the Profile tab).
  final bool skipIntro;

  @override
  State<RoleUnlockScreen> createState() => _RoleUnlockScreenState();
}

class _RoleUnlockScreenState extends State<RoleUnlockScreen> {
  late final List<_UnlockStep> _steps = [
    if (!widget.skipIntro) _UnlockStep.intro,
    _UnlockStep.idUpload,
    _UnlockStep.faceScan,
    _UnlockStep.underReview,
  ];

  late _UnlockStep _step = _steps.first;

  final AuthRegistrationService _registration = AuthRegistrationService();
  final UserRequestService _userRequests = UserRequestService();

  XFile? _idFrontImage;
  XFile? _idBackImage;
  FaceCaptureSet _faceCaptures = const FaceCaptureSet();

  /// Handle for the server-side session created by the ID upload; the face
  /// check is matched against it.
  String? _registrationId;

  bool _submitting = false;

  int get _stepIndex => _steps.indexOf(_step);

  RegistrationRoleType get _roleType =>
      switch (RoleAccountStore.normalize(widget.account.roleType)) {
        RoleAccountStore.donor => RegistrationRoleType.donor,
        RoleAccountStore.beneficiary => RegistrationRoleType.beneficiary,
        _ => RegistrationRoleType.volunteer,
      };

  String get _stepLabel => switch (_step) {
    _UnlockStep.intro => 'Unlock ${widget.account.roleLabel}',
    _UnlockStep.idUpload => 'Upload your Valid ID',
    _UnlockStep.faceScan => 'Verify your face',
    _UnlockStep.underReview => 'Request under review',
  };

  bool get _canContinue => switch (_step) {
    _UnlockStep.intro => true,
    _UnlockStep.idUpload =>
      !_submitting && _idFrontImage != null && _idBackImage != null,
    _UnlockStep.faceScan => false,
    _UnlockStep.underReview => true,
  };

  String get _continueLabel => switch (_step) {
    _UnlockStep.intro => 'Start verification',
    _UnlockStep.idUpload =>
      _submitting ? 'Validating your ID…' : 'Continue to face scan',
    _UnlockStep.faceScan => 'Continue',
    _UnlockStep.underReview => 'Back to profile',
  };

  void _back() {
    if (_submitting) return;
    if (_stepIndex == 0 || _step == _UnlockStep.underReview) {
      Navigator.of(context).maybePop();
      return;
    }
    setState(() => _step = _steps[_stepIndex - 1]);
  }

  void _next() {
    switch (_step) {
      case _UnlockStep.intro:
        setState(() => _step = _UnlockStep.idUpload);
      case _UnlockStep.idUpload:
        unawaited(_uploadId());
      case _UnlockStep.faceScan:
        break;
      case _UnlockStep.underReview:
        Navigator.of(context).maybePop();
    }
  }

  /// Sends both sides to the server, which runs them through the
  /// ucid-service classifier. Anything outside the trained UCLM ID set is
  /// rejected there and the server's message is shown as-is.
  Future<void> _uploadId() async {
    final front = _idFrontImage;
    final back = _idBackImage;
    if (front == null || back == null || _submitting) return;

    setState(() => _submitting = true);
    try {
      final response = await _registration.uploadId(
        front: front,
        back: back,
        roleType: _roleType.apiValue,
      );
      if (!mounted) return;
      setState(() {
        _registrationId = response.registrationId;
        _faceCaptures = const FaceCaptureSet();
        _step = _UnlockStep.faceScan;
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      _showMessage(
        e is ApiException
            ? e.message
            : 'Could not validate your ID. Please try again.',
      );
    }
  }

  Future<VerifyFaceResponse> _verifySelfie(XFile selfie) async {
    final registrationId = _registrationId;
    if (registrationId == null) {
      throw ApiException(
        'Verification session expired. Please upload your ID again.',
      );
    }
    return _registration.verifyFace(
      registrationId: registrationId,
      selfie: selfie,
    );
  }

  /// Both checks passed — file the request so a director can rule on it. The
  /// role waits on that approval instead of opening straight away.
  void _onFaceVerified(FaceCaptureSet captures, double similarity) {
    setState(() => _faceCaptures = captures);
    unawaited(_submitRequest());
  }

  Future<void> _submitRequest() async {
    final registrationId = _registrationId;
    if (registrationId == null || _submitting) return;

    setState(() => _submitting = true);
    try {
      await _userRequests.requestRoleAccess(
        registrationId: registrationId,
        roleType: _roleType.apiValue,
      );
    } on ApiException catch (e) {
      // 409 means a request is already with the administrator — that is the
      // same outcome for the person, so fall through to the review screen.
      if (e.statusCode != 409) {
        if (!mounted) return;
        setState(() => _submitting = false);
        _showMessage(e.message);
        return;
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      _showMessage('Could not send your request. Please try again.');
      return;
    }
    if (!mounted) return;

    RoleAccountStore.instance.markPending(widget.account.roleType);
    ActivityLogService.report(
      'account.role.review_requested',
      metadata: {
        'role': widget.account.roleType,
        'method': 'ID and face verification',
      },
    );
    setState(() {
      _submitting = false;
      _step = _UnlockStep.underReview;
    });
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final atEdge = _stepIndex == 0 || _step == _UnlockStep.underReview;
    return PopScope(
      canPop: atEdge,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
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
            if (_step != _UnlockStep.faceScan)
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
                  child: ElevatedButton(
                    onPressed: _canContinue ? _next : null,
                    child: Text(_continueLabel),
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
      case _UnlockStep.intro:
        return _UnlockIntro(
          key: const ValueKey('intro'),
          account: widget.account,
        );
      case _UnlockStep.idUpload:
        return RegisterIdUploadStep(
          key: const ValueKey('id'),
          roleType: _roleType,
          frontImage: _idFrontImage,
          backImage: _idBackImage,
          onFrontPicked: (file) => setState(() => _idFrontImage = file),
          onBackPicked: (file) => setState(() => _idBackImage = file),
        );
      case _UnlockStep.faceScan:
        return RegisterFaceScanStep(
          key: const ValueKey('face'),
          registrationId: _registrationId ?? '',
          captures: _faceCaptures,
          onCapturesChanged: (captures) =>
              setState(() => _faceCaptures = captures),
          verifySelfie: _verifySelfie,
          onVerified: _onFaceVerified,
        );
      case _UnlockStep.underReview:
        return _UnlockUnderReview(
          key: const ValueKey('review'),
          account: widget.account,
        );
    }
  }
}

class _UnlockIntro extends StatelessWidget {
  const _UnlockIntro({super.key, required this.account});

  final RoleAccount account;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: account.avatarColor,
                child: const Icon(
                  Icons.lock_outline_rounded,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${account.roleLabel} account',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Locked until you verify your identity',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          "Here's what you'll do",
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        const _RequirementRow(
          icon: Icons.badge_outlined,
          title: 'Upload your Valid ID',
          subtitle: 'Front and back of your UCLM ID, clearly readable.',
        ),
        const SizedBox(height: 12),
        const _RequirementRow(
          icon: Icons.face_retouching_natural_outlined,
          title: 'Take a quick selfie',
          subtitle: 'We match your face against the photo on your ID.',
        ),
        const SizedBox(height: 12),
        const _RequirementRow(
          icon: Icons.admin_panel_settings_outlined,
          title: 'Wait for administrator approval',
          subtitle:
              'An administrator reviews your request before the role opens.',
        ),
        const SizedBox(height: 12),
        _RequirementRow(
          icon: Icons.lock_open_rounded,
          title: 'Start using ${account.roleLabel}',
          subtitle:
              'Once approved you can switch between roles anytime from your profile.',
        ),
      ],
    );
  }
}

class _RequirementRow extends StatelessWidget {
  const _RequirementRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.inputFill,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primaryDark, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _UnlockUnderReview extends StatelessWidget {
  const _UnlockUnderReview({super.key, required this.account});

  final RoleAccount account;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 24),
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            color: AppColors.inputFill,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.borderCard, width: 2),
          ),
          child: const Icon(
            Icons.hourglass_top_rounded,
            size: 52,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Your request is under review.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Your ID and face verification were successfully completed. Please '
          'wait for administrator approval before accessing the '
          '${account.roleLabel} role.',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.verified_rounded,
                size: 14,
                color: AppColors.primaryDark,
              ),
              SizedBox(width: 6),
              Text(
                'ID and face verified',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryDark,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
