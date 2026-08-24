import 'package:flutter/material.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_dashboard_screen.dart';

/// Local-only donor registration — no backend, API, or auth integration yet.
class RegisterDonorScreen extends StatefulWidget {
  const RegisterDonorScreen({super.key});

  @override
  State<RegisterDonorScreen> createState() => _RegisterDonorScreenState();
}

class _RegisterDonorScreenState extends State<RegisterDonorScreen> {
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  bool get _canSubmit {
    return _firstNameController.text.trim().isNotEmpty &&
        _lastNameController.text.trim().isNotEmpty &&
        _emailController.text.trim().contains('@') &&
        _passwordController.text.length >= 8 &&
        _confirmPasswordController.text == _passwordController.text;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_canSubmit) return;

    final donor = DonorSessionUser(
      firstName: _firstNameController.text.trim(),
      middleName: _middleNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    DonorSession.instance.register(donor);

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(
        builder: (_) => DonorDashboardScreen(donor: donor),
      ),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.primary,
        title: const Text(
          'Donor registration',
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
                    Text(
                      'Create your donor account',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Enter your details to start supporting donation campaigns.',
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.45,
                        color: AppColors.secondary.withValues(alpha: 0.9),
                      ),
                    ),
                    const SizedBox(height: 24),
                    RegisterFormField(
                      label: 'First Name',
                      controller: _firstNameController,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 16),
                    RegisterFormField(
                      label: 'Middle Name',
                      controller: _middleNameController,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 16),
                    RegisterFormField(
                      label: 'Last Name',
                      controller: _lastNameController,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 16),
                    RegisterFormField(
                      label: 'Email',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 16),
                    RegisterFormField(
                      label: 'Password',
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => setState(() {}),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword,
                        ),
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
                      label: 'Confirm Password',
                      controller: _confirmPasswordController,
                      obscureText: _obscureConfirmPassword,
                      textInputAction: TextInputAction.done,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _submit(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscureConfirmPassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () => setState(
                          () => _obscureConfirmPassword =
                              !_obscureConfirmPassword,
                        ),
                      ),
                    ),
                    if (_confirmPasswordController.text.isNotEmpty &&
                        _confirmPasswordController.text !=
                            _passwordController.text) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'Passwords do not match',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.heart,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _canSubmit ? _submit : null,
                  child: const Text('Create account'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
