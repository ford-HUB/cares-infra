import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Where a self-registered beneficiary's account stands with the director.
enum RegistrationReviewState { pending, rejected }

/// Reads the server's sign-in 403 for a beneficiary account that is still
/// waiting on — or was refused — a director's approval. Null for any other error.
RegistrationReviewState? registrationReviewStateOf(ApiException error) {
  if (error.statusCode != 403) return null;
  final errors = error.errors;
  if (errors is! List) return null;
  for (final issue in errors) {
    if (issue is! Map) continue;
    switch (issue['code']) {
      case 'ACCOUNT_PENDING_APPROVAL':
        return RegistrationReviewState.pending;
      case 'ACCOUNT_REJECTED':
        return RegistrationReviewState.rejected;
    }
  }
  return null;
}

/// Shown instead of the dashboard once a beneficiary finishes signing up, and
/// whenever they try to sign in before a director has approved the account.
/// "Back to sign in" returns to the first route — the sign-in screen.
class RegistrationUnderReviewScreen extends StatelessWidget {
  const RegistrationUnderReviewScreen({
    super.key,
    required this.email,
    this.state = RegistrationReviewState.pending,
    this.message,
  });

  final String email;
  final RegistrationReviewState state;

  /// The server's own wording — carries the director's reason on a rejection.
  final String? message;

  bool get _rejected => state == RegistrationReviewState.rejected;

  void _backToSignIn(BuildContext context) {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final accent = _rejected ? AppColors.error : AppColors.primary;
    final inbox = email.isEmpty ? 'your email' : email;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _backToSignIn(context);
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
                      color: accent.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _rejected
                          ? Icons.cancel_outlined
                          : Icons.hourglass_top_rounded,
                      size: 44,
                      color: accent,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  _rejected
                      ? 'Registration not approved'
                      : 'Your registration is under review',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _rejected
                      ? (message ??
                            'A director did not approve your beneficiary registration.')
                      : 'Thanks for signing up. A CARES director will review your '
                            'details and supporting document before your account '
                            'opens.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
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
                        Icons.mail_outline_rounded,
                        size: 20,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _rejected
                              ? 'The decision was also sent to $inbox. If you '
                                    'think this is a mistake, contact the CARES office.'
                              : 'We will send word to $inbox as soon as a '
                                    'decision is made. You can sign in once it is '
                                    'approved.',
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
                ElevatedButton(
                  onPressed: () => _backToSignIn(context),
                  child: const Text('Back to sign in'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
