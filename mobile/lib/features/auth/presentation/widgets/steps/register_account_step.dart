import 'package:flutter/material.dart';
import 'package:mobile/features/auth/presentation/utils/conflict_focus.dart';
import 'package:mobile/features/auth/presentation/widgets/cares_terms_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/auth/presentation/widgets/terms_agreement_checkbox.dart';
import 'package:mobile/features/auth/registration/widgets/password_strength_indicator.dart';

class RegisterAccountStep extends StatefulWidget {
  const RegisterAccountStep({
    super.key,
    required this.email,
    required this.password,
    required this.confirmPassword,
    required this.onEmailChanged,
    required this.onPasswordChanged,
    required this.onConfirmPasswordChanged,
    required this.termsAudience,
    required this.acceptedTerms,
    required this.onAcceptedTermsChanged,
    this.emailError,
  });

  final String email;
  final String password;
  final String confirmPassword;
  final ValueChanged<String> onEmailChanged;
  final ValueChanged<String> onPasswordChanged;
  final ValueChanged<String> onConfirmPasswordChanged;
  final CaresTermsAudience termsAudience;
  final bool acceptedTerms;
  final ValueChanged<bool> onAcceptedTermsChanged;

  /// Server-side conflict on the email — shown inline and focused.
  final String? emailError;

  @override
  State<RegisterAccountStep> createState() => _RegisterAccountStepState();
}

class _RegisterAccountStepState extends State<RegisterAccountStep> {
  late final TextEditingController _email;
  late final TextEditingController _password;
  late final TextEditingController _confirm;
  late final FocusNode _emailFocus;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(text: widget.email);
    _password = TextEditingController(text: widget.password);
    _confirm = TextEditingController(text: widget.confirmPassword);
    _emailFocus = FocusNode();
    if (widget.emailError != null) {
      focusConflictField(this, _emailFocus);
    }
  }

  @override
  void didUpdateWidget(RegisterAccountStep oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.emailError != null && oldWidget.emailError == null) {
      focusConflictField(this, _emailFocus);
    }
  }

  @override
  void dispose() {
    _emailFocus.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final passwordsMatch =
        widget.password.isNotEmpty && widget.password == widget.confirmPassword;

    return RegistrationFormCard(
      icon: Icons.lock_outline_rounded,
      title: 'Sign-in details',
      subtitle: 'Used every time you sign in to CARES.',
      children: [
        RegisterFormField(
          label: 'Email address',
          controller: _email,
          focusNode: _emailFocus,
          errorText: widget.emailError,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          onChanged: widget.onEmailChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Password',
          controller: _password,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.next,
          onChanged: widget.onPasswordChanged,
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
            onPressed: () =>
                setState(() => _obscurePassword = !_obscurePassword),
          ),
        ),
        const SizedBox(height: 10),
        PasswordStrengthIndicator(password: widget.password),
        const SizedBox(height: 10),
        PasswordRuleChips(password: widget.password),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Confirm password',
          controller: _confirm,
          obscureText: _obscureConfirm,
          textInputAction: TextInputAction.done,
          onChanged: widget.onConfirmPasswordChanged,
          suffixIcon: IconButton(
            icon: Icon(
              _obscureConfirm
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
        ),
        if (widget.confirmPassword.isNotEmpty) ...[
          const SizedBox(height: 8),
          PasswordMatchNote(matches: passwordsMatch),
        ],
        const SizedBox(height: 14),
        TermsAgreementCheckbox(
          audience: widget.termsAudience,
          accepted: widget.acceptedTerms,
          onChanged: widget.onAcceptedTermsChanged,
        ),
      ],
    );
  }
}
