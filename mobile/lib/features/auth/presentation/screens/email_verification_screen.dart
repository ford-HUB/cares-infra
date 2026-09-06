import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/presentation/providers/register_flow_provider.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/features/auth/presentation/widgets/verification_code_input.dart';

class EmailVerificationScreen extends ConsumerStatefulWidget {
  const EmailVerificationScreen({
    super.key,
    required this.email,
    required this.registrationId,
    required this.ocrData,
    required this.roleType,
    required this.password,
    this.initialExpiresInSeconds = 0,
    this.emailAlreadyVerified = false,
    this.codeReused = false,
  });

  final String email;
  final String registrationId;
  final RegisterOcrSample ocrData;
  final RegistrationRoleType roleType;
  final String password;
  final int initialExpiresInSeconds;
  final bool emailAlreadyVerified;
  final bool codeReused;

  @override
  ConsumerState<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState
    extends ConsumerState<EmailVerificationScreen> {
  String _code = '';
  int _secondsRemaining = 0;
  bool _isSubmitting = false;
  bool _isResending = false;
  bool _emailVerified = false;
  Timer? _countdownTimer;

  bool get _codeComplete => _code.length == 6;
  bool get _codeExpired => _secondsRemaining <= 0;
  bool get _canResend => _codeExpired && !_isResending && !_isSubmitting;

  @override
  void initState() {
    super.initState();
    _emailVerified = widget.emailAlreadyVerified;
    _secondsRemaining = widget.initialExpiresInSeconds;
    _startCountdown(initialSeconds: widget.initialExpiresInSeconds);

    if (_secondsRemaining <= 0) {
      unawaited(_refreshVerificationStatus());
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshVerificationStatus() async {
    try {
      final service = ref.read(authRegistrationServiceProvider);
      final status = await service.getVerificationStatus(email: widget.email);
      if (!mounted) return;

      setState(() {
        _emailVerified = status.verified;
        if (status.expiresInSeconds > 0) {
          _startCountdown(initialSeconds: status.expiresInSeconds);
        }
      });
    } catch (_) {
      // Keep local countdown if status lookup fails.
    }
  }

  void _startCountdown({required int initialSeconds}) {
    _countdownTimer?.cancel();

    if (initialSeconds <= 0) {
      setState(() => _secondsRemaining = 0);
      return;
    }

    setState(() => _secondsRemaining = initialSeconds);

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      if (_secondsRemaining <= 1) {
        timer.cancel();
        setState(() => _secondsRemaining = 0);
      } else {
        setState(() => _secondsRemaining--);
      }
    });
  }

  String _formatCountdown(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '$minutes:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _showError(String message) {
    _showMessage(message);
  }

  Future<void> _resendCode() async {
    if (!_canResend) return;

    setState(() => _isResending = true);

    try {
      final service = ref.read(authRegistrationServiceProvider);
      final response = await service.sendVerificationCode(email: widget.email);
      if (!mounted) return;

      setState(() {
        _code = '';
        _isResending = false;
        _emailVerified = response.verified;
      });
      _startCountdown(initialSeconds: response.expiresInSeconds);
      _showMessage(
        response.sent
            ? 'A new verification code was sent to ${widget.email}'
            : 'Your existing verification code is still active.',
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isResending = false);
      _showError(
        e is ApiException ? e.message : 'Failed to resend verification code.',
      );
    }
  }

  void _onCodeChanged(String value) {
    setState(() => _code = value);

    if (value.length == 6 && !_isSubmitting) {
      FocusManager.instance.primaryFocus?.unfocus();
      unawaited(_completeRegistration());
    }
  }

  /// Lands on the dashboard for the role the user registered under — a
  /// beneficiary must never end up on the volunteer dashboard.
  void _goToRoleDashboard() {
    DashboardRouter.navigateToRoleDashboard(
      context,
      roleType: widget.roleType.apiValue,
      email: widget.email,
      firstName: widget.ocrData.firstname,
      lastName: widget.ocrData.lastname,
    );
  }

  Future<void> _completeRegistration() async {
    if (!_codeComplete || _isSubmitting) return;

    if (_codeExpired) {
      _showError('Verification code expired. Please request a new code.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final service = ref.read(authRegistrationServiceProvider);

      if (!_emailVerified) {
        await service.verifyOtp(email: widget.email, otp: _code);
        _emailVerified = true;
      }

      await service.registerFromSession(
        registrationId: widget.registrationId,
        ocrData: widget.ocrData,
        roleType: widget.roleType.apiValue,
        email: widget.email,
        password: widget.password,
      );

      if (!mounted) return;

      _goToRoleDashboard();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _code = '';
      });
      _showError(
        e is ApiException
            ? e.message
            : 'Registration failed. Please try again.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final countdownLabel = _formatCountdown(_secondsRemaining);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.primary,
        title: const Text(
          'Verify email',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 8),
                    Icon(
                      Icons.mark_email_read_outlined,
                      size: 64,
                      color: AppColors.primary.withValues(alpha: 0.85),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Check your inbox',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.codeReused
                          ? 'Use the verification code already sent to ${widget.email}. You can go back to fix your details and return without requesting a new code while it is still valid.'
                          : 'We sent a 6-digit code to ${widget.email}. Enter it below to finish registration.',
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.45,
                        color: AppColors.secondary.withValues(alpha: 0.9),
                      ),
                    ),
                    if (_emailVerified) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.25),
                          ),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.verified_outlined,
                              size: 20,
                              color: AppColors.primaryDark,
                            ),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Email verified. Fix any registration details if needed, then enter the same code again to finish.',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primaryDark,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 32),
                    VerificationCodeInput(
                      code: _code,
                      enabled: !_isSubmitting,
                      onChanged: _onCodeChanged,
                    ),
                    if (_isSubmitting) ...[
                      const SizedBox(height: 20),
                      const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _emailVerified
                            ? 'Creating your account…'
                            : 'Verifying code and creating your account…',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.secondary.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: _codeExpired
                            ? AppColors.heart.withValues(alpha: 0.08)
                            : AppColors.accent.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _codeExpired
                              ? AppColors.heart.withValues(alpha: 0.35)
                              : AppColors.accent.withValues(alpha: 0.45),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _codeExpired
                                ? Icons.timer_off_outlined
                                : Icons.timer_outlined,
                            size: 22,
                            color: _codeExpired
                                ? AppColors.heart
                                : AppColors.primaryDark,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _codeExpired
                                  ? 'Code expired. Tap resend to get a new one.'
                                  : 'Code expires in $countdownLabel',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: _codeExpired
                                    ? AppColors.heart
                                    : AppColors.primaryDark,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _canResend
                          ? () => unawaited(_resendCode())
                          : null,
                      child: Text(_isResending ? 'Sending…' : 'Resend code'),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
