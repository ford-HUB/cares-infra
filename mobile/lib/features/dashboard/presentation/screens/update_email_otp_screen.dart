import 'dart:async';

import 'package:flutter/material.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/account_security_service.dart';
import 'package:mobile/features/auth/presentation/widgets/verification_code_input.dart';
import 'package:mobile/features/dashboard/presentation/screens/update_email_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Step 1 of the email update: a one-time code goes to the *current* address
/// and must be entered before the replacement can be typed. Proves the person
/// still controls the mailbox they signed up with. Nothing is sent until the
/// person taps "Send code" — opening the screen by mistake costs nothing.
///
/// `POST /account/mobile/email/send-code` mails the code; `verify-code`
/// trades it for a change token that step 2 spends. Resolves to the new
/// email once step 2 saves, or null on back-out.
class UpdateEmailOtpScreen extends StatefulWidget {
  const UpdateEmailOtpScreen({super.key, required this.currentEmail});

  final String currentEmail;

  static Future<String?> open(
    BuildContext context, {
    required String currentEmail,
  }) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute<String>(
        builder: (_) => UpdateEmailOtpScreen(currentEmail: currentEmail),
      ),
    );
  }

  @override
  State<UpdateEmailOtpScreen> createState() => _UpdateEmailOtpScreenState();
}

class _UpdateEmailOtpScreenState extends State<UpdateEmailOtpScreen> {
  static const _codeLength = 6;

  /// Matches the server's OTP TTL; the real countdown comes from the reply.
  static const _codeLifetimeSeconds = 600;

  final AccountSecurityService _service = AccountSecurityService();

  String _code = '';

  /// False until the first "Send code" tap; the code input stays hidden.
  bool _sent = false;
  bool _sending = false;
  bool _verifying = false;
  int _secondsRemaining = 0;
  Timer? _countdown;

  bool get _codeExpired => _sent && _secondsRemaining <= 0 && !_sending;
  bool get _canResend => _codeExpired && !_verifying;
  bool get _canVerify =>
      _code.length == _codeLength && !_sending && !_verifying && !_codeExpired;

  @override
  void dispose() {
    _countdown?.cancel();
    super.dispose();
  }

  Future<void> _sendCode() async {
    setState(() {
      _sending = true;
      _code = '';
    });
    try {
      final result = await _service.sendEmailChangeCode();
      if (!mounted) return;
      setState(() {
        _sending = false;
        _sent = true;
      });
      _startCountdown(seconds: result.expiresInSeconds);
      _showMessage(
        result.reused
            ? 'A code was already sent to ${result.email}. Check your inbox.'
            : 'Code sent to ${result.email}.',
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      _showMessage(e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      _showMessage('Could not send the code. Please try again.');
    }
  }

  void _startCountdown({required int seconds}) {
    _countdown?.cancel();
    setState(
      () => _secondsRemaining = seconds > 0 ? seconds : _codeLifetimeSeconds,
    );
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

  Future<void> _verify() async {
    if (!_canVerify) return;
    setState(() => _verifying = true);
    String changeToken;
    try {
      final result = await _service.verifyEmailChangeCode(_code);
      changeToken = result.changeToken;
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _verifying = false);
      _showMessage(e.message);
      return;
    } catch (_) {
      if (!mounted) return;
      setState(() => _verifying = false);
      _showMessage('Could not verify the code. Please try again.');
      return;
    }
    if (!mounted) return;
    setState(() => _verifying = false);

    final updated = await UpdateEmailScreen.open(
      context,
      currentEmail: widget.currentEmail,
      changeToken: changeToken,
    );
    if (!mounted || updated == null) return;
    Navigator.of(context).pop(updated);
  }

  String get _countdownLabel {
    final minutes = _secondsRemaining ~/ 60;
    final seconds = _secondsRemaining % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  void _showMessage(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final busy = _sending || _verifying;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: _verifying ? null : () => Navigator.of(context).pop(),
            title: 'Verify it\'s you',
            subtitle:
                'Step 1 of 2 — confirm your current email before choosing a '
                'new one.',
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                SecurityInfoNote(
                  icon: _sent
                      ? Icons.mark_email_read_outlined
                      : Icons.mark_email_unread_outlined,
                  text: _sent
                      ? 'We sent a $_codeLength-digit code to '
                            '${widget.currentEmail}. Enter it below to continue.'
                      : 'We\'ll send a $_codeLength-digit code to '
                            '${widget.currentEmail}. Tap "Send code" when '
                            'you\'re ready to check your inbox.',
                ),
                if (_sent) ...[
                  const SizedBox(height: 24),
                  Text(
                    'Verification code',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 10),
                  VerificationCodeInput(
                    code: _code,
                    enabled: !busy && !_codeExpired,
                    onChanged: (value) => setState(() => _code = value),
                  ),
                  const SizedBox(height: 20),
                  _CountdownBanner(
                    sending: _sending,
                    expired: _codeExpired,
                    label: _countdownLabel,
                  ),
                  const SizedBox(height: 4),
                  Center(
                    child: TextButton(
                      onPressed: _canResend
                          ? () => unawaited(_sendCode())
                          : null,
                      child: Text(_sending ? 'Sending…' : 'Resend code'),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 16),
                  Text(
                    'The code expires ${_codeLifetimeSeconds ~/ 60} minutes '
                    'after it\'s sent. Check your spam folder if it doesn\'t '
                    'arrive.',
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: AppColors.textSecondary.withValues(alpha: 0.95),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _sent
          ? SecurityActionBar(
              label: 'Verify & continue',
              busy: _verifying,
              onPressed: _canVerify ? () => unawaited(_verify()) : null,
            )
          : SecurityActionBar(
              label: 'Send code',
              busy: _sending,
              onPressed: () => unawaited(_sendCode()),
            ),
    );
  }
}

class _CountdownBanner extends StatelessWidget {
  const _CountdownBanner({
    required this.sending,
    required this.expired,
    required this.label,
  });

  final bool sending;
  final bool expired;
  final String label;

  @override
  Widget build(BuildContext context) {
    final color = expired ? AppColors.heart : AppColors.primaryDark;
    final text = sending
        ? 'Sending your code…'
        : expired
        ? 'Code expired. Tap resend to get a new one.'
        : 'Code expires in $label';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: expired
            ? AppColors.heart.withValues(alpha: 0.08)
            : AppColors.accent.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: expired
              ? AppColors.heart.withValues(alpha: 0.35)
              : AppColors.accent.withValues(alpha: 0.45),
        ),
      ),
      child: Row(
        children: [
          Icon(
            expired ? Icons.timer_off_outlined : Icons.timer_outlined,
            size: 22,
            color: color,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
