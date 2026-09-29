import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/password_reset_service.dart';
import 'package:mobile/features/auth/presentation/providers/password_policy_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/auth/registration/widgets/password_strength_indicator.dart';

/// Last step of the reset flow — reached only with a token the OTP dialog earned,
/// so it asks for nothing but the new password itself.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({
    super.key,
    required this.email,
    required this.resetToken,
  });

  final String email;
  final String resetToken;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _service = PasswordResetService();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  String _password = '';
  String _confirmPassword = '';
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isSaving = false;

  bool get _passwordsMatch =>
      _confirmPassword.isNotEmpty && _password == _confirmPassword;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _save() async {
    if (_isSaving) return;

    final policy = ref.read(currentPasswordPolicyProvider);
    if (!policy.isSatisfiedBy(_password)) {
      _showMessage('Your password does not meet all the rules yet.');
      return;
    }
    if (!_passwordsMatch) {
      _showMessage('The two passwords do not match.');
      return;
    }

    setState(() => _isSaving = true);
    FocusManager.instance.primaryFocus?.unfocus();

    try {
      await _service.resetPassword(
        email: widget.email,
        resetToken: widget.resetToken,
        newPassword: _password,
      );
      if (!mounted) return;

      // Back to sign-in: the reset signs every existing session out, so there is
      // nothing to carry forward except the new password.
      Navigator.of(context).pop(true);
      _showMessage('Password updated. Sign in with your new password.');
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      _showMessage(error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      _showMessage('Could not update your password. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _backControl(),
              const SizedBox(height: 18),
              const Text(
                'Set a new password',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'You verified ${widget.email}. Choose a password you have not '
                'used on this account before.',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.secondary.withValues(alpha: 0.9),
                ),
              ),
              const SizedBox(height: 24),
              _formCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _backControl() {
    return Align(
      alignment: Alignment.centerLeft,
      child: GestureDetector(
        onTap: _isSaving ? null : () => Navigator.of(context).pop(),
        behavior: HitTestBehavior.opaque,
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.chevron_left_rounded,
              color: AppColors.primaryDark,
              size: 26,
            ),
            Text(
              'Back',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.primaryDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _formCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: AppDecorations.surfaceCard().copyWith(
        boxShadow: const [
          BoxShadow(
            color: Color(0x121F5F28),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          RegisterFormField(
            label: 'New password',
            controller: _passwordController,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.next,
            autofocus: true,
            onChanged: (value) => setState(() => _password = value),
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
          PasswordStrengthIndicator(password: _password),
          const SizedBox(height: 10),
          PasswordRuleChips(password: _password),
          const SizedBox(height: 14),
          RegisterFormField(
            label: 'Confirm new password',
            controller: _confirmController,
            obscureText: _obscureConfirm,
            textInputAction: TextInputAction.done,
            onChanged: (value) => setState(() => _confirmPassword = value),
            onSubmitted: (_) => _save(),
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
          if (_confirmPassword.isNotEmpty) ...[
            const SizedBox(height: 8),
            PasswordMatchNote(matches: _passwordsMatch),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Update password'),
          ),
        ],
      ),
    );
  }
}
