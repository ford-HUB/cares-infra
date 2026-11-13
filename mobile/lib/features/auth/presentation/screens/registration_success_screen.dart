import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Shown once a new account has been created. Sign-up never opens a dashboard
/// on its own: the person is told the account is ready and sent back to the
/// sign-in screen (the first route) to sign in with it — automatically after a
/// short countdown, or straight away with the button.
class RegistrationSuccessScreen extends StatefulWidget {
  const RegistrationSuccessScreen({
    super.key,
    required this.email,
    this.signInHint,
    this.redirectAfter = const Duration(seconds: 5),
  });

  final String email;

  /// How to sign in, when it is not the usual email + password — e.g. a donor
  /// who registered through Google.
  final String? signInHint;

  final Duration redirectAfter;

  @override
  State<RegistrationSuccessScreen> createState() =>
      _RegistrationSuccessScreenState();
}

class _RegistrationSuccessScreenState extends State<RegistrationSuccessScreen> {
  Timer? _ticker;
  late int _secondsLeft;
  bool _left = false;

  @override
  void initState() {
    super.initState();
    _secondsLeft = widget.redirectAfter.inSeconds;
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_secondsLeft <= 1) {
        _backToSignIn();
        return;
      }
      setState(() => _secondsLeft--);
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _backToSignIn() {
    if (_left) return;
    _left = true;
    _ticker?.cancel();
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final inbox = widget.email.isEmpty ? 'your email' : widget.email;
    final hint =
        widget.signInHint ??
        'Sign in with $inbox and the password you just created.';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _backToSignIn();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                Center(
                  child: Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle_outline_rounded,
                      size: 48,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Account created successfully',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Welcome to CARES! Your account is ready. Sign in to start '
                  'using the app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14.5,
                    color: AppColors.textSecondary,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.login_rounded,
                        size: 20,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          hint,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textPrimary,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(flex: 2),
                Text(
                  'Taking you to sign in in $_secondsLeft '
                  '${_secondsLeft == 1 ? 'second' : 'seconds'}…',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 10),
                ElevatedButton(
                  onPressed: _backToSignIn,
                  child: const Text('Go to Sign In'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
