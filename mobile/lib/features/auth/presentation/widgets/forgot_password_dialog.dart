import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/password_reset_service.dart';
import 'package:mobile/features/auth/presentation/widgets/verification_code_input.dart';

/// What the dialog hands back once the code checks out — the caller uses it to
/// open the new-password screen.
class ForgotPasswordResult {
  const ForgotPasswordResult({required this.email, required this.resetToken});

  final String email;
  final String resetToken;
}

/// Shows the reset dialog and resolves to the verified email + token, or null if
/// the user backed out.
Future<ForgotPasswordResult?> showForgotPasswordDialog(
  BuildContext context, {
  String initialEmail = '',
}) {
  return showDialog<ForgotPasswordResult>(
    context: context,
    barrierDismissible: false,
    builder: (_) => ForgotPasswordDialog(initialEmail: initialEmail),
  );
}

/// One dialog, two steps: ask for the email, then — once the server confirms an
/// account exists and mails a code — swap the same card over to the six OTP boxes.
/// Keeping it in one dialog means the user never loses the email they just typed.
class ForgotPasswordDialog extends StatefulWidget {
  const ForgotPasswordDialog({super.key, this.initialEmail = ''});

  final String initialEmail;

  @override
  State<ForgotPasswordDialog> createState() => _ForgotPasswordDialogState();
}

enum _Stage { email, code }

class _ForgotPasswordDialogState extends State<ForgotPasswordDialog> {
  final _service = PasswordResetService();
  late final TextEditingController _emailController;

  _Stage _stage = _Stage.email;
  String _code = '';
  String? _error;
  bool _isBusy = false;
  int _secondsRemaining = 0;
  Timer? _countdown;

  bool get _codeComplete => _code.length == 6;
  bool get _codeExpired => _secondsRemaining <= 0;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _countdown?.cancel();
    _emailController.dispose();
    super.dispose();
  }

  void _startCountdown(int seconds) {
    _countdown?.cancel();
    setState(() => _secondsRemaining = seconds);
    if (seconds <= 0) return;

    _countdown = Timer.periodic(const Duration(seconds: 1), (timer) {
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

  String get _formattedCountdown {
    final minutes = _secondsRemaining ~/ 60;
    final seconds = _secondsRemaining % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  Future<void> _sendCode({bool resend = false}) async {
    if (_isBusy) return;

    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter the email address you registered with.');
      return;
    }

    setState(() {
      _isBusy = true;
      _error = null;
    });
    FocusManager.instance.primaryFocus?.unfocus();

    try {
      final response = await _service.requestCode(email: email);
      if (!mounted) return;

      setState(() {
        _stage = _Stage.code;
        _isBusy = false;
        if (resend) _code = '';
      });
      _startCountdown(response.expiresInSeconds);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isBusy = false;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isBusy = false;
        _error = 'Could not send the reset code. Please try again.';
      });
    }
  }

  Future<void> _verifyCode() async {
    if (_isBusy || !_codeComplete) return;

    setState(() {
      _isBusy = true;
      _error = null;
    });

    try {
      final response = await _service.verifyCode(
        email: _emailController.text.trim(),
        otp: _code,
      );
      if (!mounted) return;

      _countdown?.cancel();
      Navigator.of(context).pop(
        ForgotPasswordResult(
          email: response.email,
          resetToken: response.resetToken,
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isBusy = false;
        _code = '';
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isBusy = false;
        _error = 'Could not verify that code. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 20, 22, 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _header(),
              const SizedBox(height: 18),
              // The step swaps inside the card so the dialog never jumps to a
              // different surface mid-flow.
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _stage == _Stage.email ? _emailStep() : _codeStep(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                _errorNote(_error!),
              ],
              const SizedBox(height: 18),
              _primaryButton(),
              const SizedBox(height: 6),
              TextButton(
                onPressed: _isBusy ? null : () => Navigator.of(context).pop(),
                child: const Text(
                  'Cancel',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    final isEmailStage = _stage == _Stage.email;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: const BoxDecoration(
            color: AppColors.background,
            shape: BoxShape.circle,
          ),
          child: Icon(
            isEmailStage
                ? Icons.lock_reset_rounded
                : Icons.mark_email_read_outlined,
            color: AppColors.primary,
            size: 22,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isEmailStage ? 'Forgot your password?' : 'Enter the code',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                isEmailStage
                    ? 'Enter your registered email and we will send you a '
                          'six-digit code.'
                    : 'We sent a six-digit code to '
                          '${_emailController.text.trim()}.',
                style: TextStyle(
                  fontSize: 12.5,
                  height: 1.35,
                  color: AppColors.secondary.withValues(alpha: 0.9),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _emailStep() {
    return TextField(
      key: const ValueKey('forgot-email'),
      controller: _emailController,
      enabled: !_isBusy,
      autofocus: true,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.done,
      onSubmitted: (_) => _sendCode(),
      decoration: const InputDecoration(
        hintText: 'Email address',
        prefixIcon: Icon(Icons.mail_outline_rounded),
        fillColor: AppColors.background,
      ),
    );
  }

  Widget _codeStep() {
    return Column(
      key: const ValueKey('forgot-code'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        VerificationCodeInput(
          code: _code,
          enabled: !_isBusy,
          onChanged: (value) => setState(() {
            _code = value;
            _error = null;
          }),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _codeExpired ? 'Code expired' : 'Expires in $_formattedCountdown',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _codeExpired ? AppColors.error : AppColors.textSecondary,
              ),
            ),
            // Resending before the current code lapses only returns the same
            // code, so the button waits for the countdown to run out.
            TextButton(
              onPressed: _codeExpired && !_isBusy
                  ? () => _sendCode(resend: true)
                  : null,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('Resend code'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _errorNote(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 16,
            color: AppColors.error,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.35,
                color: AppColors.error,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _primaryButton() {
    final isEmailStage = _stage == _Stage.email;
    final enabled = _isBusy ? false : (isEmailStage || _codeComplete);

    return ElevatedButton(
      onPressed: enabled ? (isEmailStage ? _sendCode : _verifyCode) : null,
      child: _isBusy
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2.2,
                color: Colors.white,
              ),
            )
          : Text(isEmailStage ? 'Send code' : 'Verify code'),
    );
  }
}
