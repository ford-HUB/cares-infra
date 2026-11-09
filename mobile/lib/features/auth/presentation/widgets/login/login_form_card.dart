import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';
import 'package:mobile/shared/widgets/gradient_button.dart';

/// The floating white sign-in card: welcome heading, soft email / password
/// fields, gradient Sign In, and the donor-only Google / Facebook row.
///
/// Presentation only — the screen owns the controllers and sign-in work.
class LoginFormCard extends StatelessWidget {
  const LoginFormCard({
    super.key,
    required this.emailController,
    required this.passwordController,
    required this.obscurePassword,
    required this.onToggleObscure,
    required this.isSigningIn,
    required this.isBusy,
    required this.pendingProvider,
    required this.onSignIn,
    required this.onForgotPassword,
    required this.onProviderTap,
  });

  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool obscurePassword;
  final VoidCallback onToggleObscure;
  final bool isSigningIn;

  /// Any sign-in (password or provider) in flight.
  final bool isBusy;
  final SocialAuthProvider? pendingProvider;
  final VoidCallback onSignIn;
  final VoidCallback onForgotPassword;
  final ValueChanged<SocialAuthProvider> onProviderTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
      decoration: AppDecorations.floatingCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            AppCopy.loginTitle,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: AppColors.primaryDark,
              letterSpacing: -0.5,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            AppCopy.loginSubtitle,
            style: TextStyle(fontSize: 15.5, height: 1.4, color: AppColors.ink),
          ),
          const SizedBox(height: 22),
          TextField(
            controller: emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.email],
            decoration: AppDecorations.softInput(
              hint: AppCopy.loginEmailHint,
              icon: Icons.mail_outline_rounded,
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: passwordController,
            obscureText: obscurePassword,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            onSubmitted: (_) => onSignIn(),
            decoration: AppDecorations.softInput(
              hint: AppCopy.loginPasswordHint,
              icon: Icons.lock_outline_rounded,
              suffix: IconButton(
                tooltip: obscurePassword ? 'Show password' : 'Hide password',
                icon: Icon(
                  obscurePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: AppColors.primary,
                ),
                onPressed: onToggleObscure,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: isBusy ? null : onForgotPassword,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                minimumSize: const Size(0, 36),
              ),
              child: const Text(
                AppCopy.loginForgotPassword,
                style: TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          GradientButton(
            label: AppCopy.loginSignIn,
            icon: Icons.login_rounded,
            loading: isSigningIn,
            onPressed: isBusy ? null : onSignIn,
          ),
          const SizedBox(height: 24),
          // Donors who signed up through Google / Facebook have no password to
          // type, so the same providers sign them in here.
          SocialAuthButtons(
            compact: true,
            dividerLabel: AppCopy.loginDonorDivider,
            enabled: !isBusy,
            pendingProvider: pendingProvider,
            onProviderTap: onProviderTap,
          ),
        ],
      ),
    );
  }
}

/// "Don't have an account? Register" under the card.
class LoginRegisterPrompt extends StatelessWidget {
  const LoginRegisterPrompt({super.key, required this.onRegister});

  final VoidCallback onRegister;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          AppCopy.loginNoAccount,
          style: TextStyle(color: AppColors.ink, fontSize: 14.5),
        ),
        TextButton(
          onPressed: onRegister,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          ),
          child: const Text(
            AppCopy.loginRegister,
            style: TextStyle(
              color: AppColors.primaryDark,
              fontSize: 14.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}
