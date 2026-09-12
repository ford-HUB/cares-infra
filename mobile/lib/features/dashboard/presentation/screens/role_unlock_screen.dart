import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/domain/face_capture_set.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_face_scan_step.dart';
import 'package:mobile/features/auth/presentation/widgets/steps/register_id_upload_step.dart';
import 'package:mobile/features/dashboard/data/activity_log_service.dart';
import 'package:mobile/features/dashboard/presentation/widgets/verification_flow_header.dart';

enum _UnlockStep { intro, idUpload, faceScan, done }

/// Unlocks a locked role on the signed-in account by repeating the identity
/// check used at registration: upload the ID, then match a selfie against it.
///
/// On success the role is marked unlocked in [RoleAccountStore] and the app
/// lands on that role's dashboard.
///
/// The face match here is a local mock (see [_mockVerifySelfie]) — it is not
/// wired to the face-recognition service.
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
    _UnlockStep.done,
  ];

  late _UnlockStep _step = _steps.first;

  XFile? _idFrontImage;
  XFile? _idBackImage;
  FaceCaptureSet _faceCaptures = const FaceCaptureSet();
  double? _similarity;

  int get _stepIndex => _steps.indexOf(_step);

  RegistrationRoleType get _roleType =>
      switch (RoleAccountStore.normalize(widget.account.roleType)) {
        RoleAccountStore.donor => RegistrationRoleType.donor,
        RoleAccountStore.beneficiary => RegistrationRoleType.beneficiary,
        _ => RegistrationRoleType.volunteer,
      };

  String get _stepLabel => switch (_step) {
    _UnlockStep.intro => 'Unlock ${widget.account.roleLabel}',
    _UnlockStep.idUpload => 'Upload your school ID',
    _UnlockStep.faceScan => 'Verify your face',
    _UnlockStep.done => '${widget.account.roleLabel} unlocked',
  };

  bool get _canContinue => switch (_step) {
    _UnlockStep.intro => true,
    _UnlockStep.idUpload => _idFrontImage != null && _idBackImage != null,
    _UnlockStep.faceScan => false,
    _UnlockStep.done => true,
  };

  String get _continueLabel => switch (_step) {
    _UnlockStep.intro => 'Start verification',
    _UnlockStep.idUpload => 'Continue to face scan',
    _UnlockStep.faceScan => 'Continue',
    _UnlockStep.done => 'Go to ${widget.account.roleLabel} dashboard',
  };

  void _back() {
    if (_stepIndex == 0 || _step == _UnlockStep.done) {
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
        setState(() => _step = _UnlockStep.faceScan);
      case _UnlockStep.faceScan:
        break;
      case _UnlockStep.done:
        _enterDashboard();
    }
  }

  /// Mock face match: accepts any selfie after a short pause so the flow can
  /// be exercised without the fr-service. Swap for the real call when wiring.
  Future<VerifyFaceResponse> _mockVerifySelfie(XFile selfie) async {
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    return VerifyFaceResponse(
      registrationId: 'unlock-${widget.account.roleType.toLowerCase()}',
      match: true,
      similarity: 0.87,
      threshold: 0.4,
      step: 'FACE_VERIFIED',
      message: 'Face matched your ID.',
    );
  }

  void _onFaceVerified(FaceCaptureSet captures, double similarity) {
    RoleAccountStore.instance.unlock(widget.account.roleType);
    ActivityLogService.report(
      'account.role.unlocked',
      metadata: {
        'role': widget.account.roleType,
        'method': 'ID and face verification',
      },
    );
    setState(() {
      _faceCaptures = captures;
      _similarity = similarity;
      _step = _UnlockStep.done;
    });
  }

  void _enterDashboard() {
    final account =
        RoleAccountStore.instance.byType(widget.account.roleType) ??
        widget.account;
    final previous = RoleAccountStore.instance.active?.roleType;
    RoleAccountStore.instance.activate(account.roleType);
    if (previous != account.roleType) {
      ActivityLogService.report(
        'account.role.switched',
        metadata: {'from': ?previous, 'to': account.roleType},
      );
    }
    DashboardRouter.navigateToRoleDashboard(
      context,
      roleType: account.roleType,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      profileComplete: false,
      hasInterests: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final atEdge = _stepIndex == 0 || _step == _UnlockStep.done;
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
          registrationId: 'unlock-${widget.account.roleType.toLowerCase()}',
          captures: _faceCaptures,
          onCapturesChanged: (captures) =>
              setState(() => _faceCaptures = captures),
          verifySelfie: _mockVerifySelfie,
          onVerified: _onFaceVerified,
        );
      case _UnlockStep.done:
        return _UnlockSuccess(
          key: const ValueKey('done'),
          account: widget.account,
          similarity: _similarity,
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
          title: 'Upload a valid ID',
          subtitle: 'Front and back, clearly readable.',
        ),
        const SizedBox(height: 12),
        const _RequirementRow(
          icon: Icons.face_retouching_natural_outlined,
          title: 'Take a quick selfie',
          subtitle: 'We match your face against the photo on your ID.',
        ),
        const SizedBox(height: 12),
        _RequirementRow(
          icon: Icons.lock_open_rounded,
          title: 'Start using ${account.roleLabel}',
          subtitle:
              'Once verified you can switch between roles anytime from your profile.',
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

class _UnlockSuccess extends StatelessWidget {
  const _UnlockSuccess({super.key, required this.account, this.similarity});

  final RoleAccount account;
  final double? similarity;

  @override
  Widget build(BuildContext context) {
    final match = similarity == null
        ? null
        : '${(similarity! * 100).round()}% match';

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
            Icons.verified_rounded,
            size: 52,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          "You're verified",
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Your ${account.roleLabel} account is unlocked. You can now switch '
          'between ${account.roleLabel} and your other roles from the profile tab.',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
            height: 1.45,
          ),
        ),
        if (match != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: AppColors.fieldBorder),
            ),
            child: Text(
              'Face $match',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.primaryDark,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
