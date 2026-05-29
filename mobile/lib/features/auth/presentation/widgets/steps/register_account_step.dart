import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';

class RegisterAccountStep extends StatefulWidget {
  const RegisterAccountStep({
    super.key,
    required this.email,
    required this.password,
    required this.confirmPassword,
    required this.onEmailChanged,
    required this.onPasswordChanged,
    required this.onConfirmPasswordChanged,
  });

  final String email;
  final String password;
  final String confirmPassword;
  final ValueChanged<String> onEmailChanged;
  final ValueChanged<String> onPasswordChanged;
  final ValueChanged<String> onConfirmPasswordChanged;

  @override
  State<RegisterAccountStep> createState() => _RegisterAccountStepState();
}

class _RegisterAccountStepState extends State<RegisterAccountStep> {
  late final TextEditingController _email;
  late final TextEditingController _password;
  late final TextEditingController _confirm;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(text: widget.email);
    _password = TextEditingController(text: widget.password);
    _confirm = TextEditingController(text: widget.confirmPassword);
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
  final passwordsMatch = widget.password.isNotEmpty &&
      widget.password == widget.confirmPassword;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Create your account',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Set the email and password you will use to sign in to CARES.',
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: AppColors.secondary.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 20),
        RegisterFormField(
          label: 'Email address',
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          onChanged: widget.onEmailChanged,
        ),
        const SizedBox(height: 16),
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
        const SizedBox(height: 8),
        Text(
          'At least 8 characters',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.secondary.withValues(alpha: 0.85),
          ),
        ),
        const SizedBox(height: 16),
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
            onPressed: () =>
                setState(() => _obscureConfirm = !_obscureConfirm),
          ),
        ),
        if (widget.confirmPassword.isNotEmpty && !passwordsMatch) ...[
          const SizedBox(height: 8),
          const Text(
            'Passwords do not match',
            style: TextStyle(color: AppColors.heart, fontSize: 13),
          ),
        ],
      ],
    );
  }
}
