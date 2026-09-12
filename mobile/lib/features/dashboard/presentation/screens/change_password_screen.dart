import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/account_security_service.dart';
import 'package:mobile/features/auth/presentation/providers/password_policy_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/auth/registration/widgets/password_strength_indicator.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Change password: current password, new password (validated against the
/// administrator's policy, same strength bar and rule chips as registration),
/// and a confirmation.
///
/// `PUT /account/mobile/password`; the server signs every other device out.
/// Resolves `true` on success, null when the person backs out.
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  static Future<bool?> open(BuildContext context) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const ChangePasswordScreen()),
    );
  }

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final AccountSecurityService _service = AccountSecurityService();

  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  final _nextFocus = FocusNode();
  final _confirmFocus = FocusNode();

  bool _obscureCurrent = true;
  bool _obscureNext = true;
  bool _obscureConfirm = true;
  bool _saving = false;

  /// Server rejection of the current password — kept as an inline error
  /// until the field changes, like the phone conflict on the profile edit
  /// screen.
  String? _currentError;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    _nextFocus.dispose();
    _confirmFocus.dispose();
    super.dispose();
  }

  bool get _sameAsCurrent =>
      _next.text.isNotEmpty && _next.text == _current.text;

  bool get _canSave {
    if (_saving) return false;
    if (_current.text.isEmpty || _next.text.isEmpty) return false;
    if (_sameAsCurrent) return false;
    final policy = ref.read(currentPasswordPolicyProvider);
    if (!policy.isSatisfiedBy(_next.text)) return false;
    return _confirm.text == _next.text;
  }

  Future<void> _save() async {
    if (!_canSave) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _saving = true);
    try {
      await _service.changePassword(
        currentPassword: _current.text,
        newPassword: _next.text,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        if (e.statusCode == 401) _currentError = e.message;
      });
      if (e.statusCode != 401) _showMessage(e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      _showMessage('Could not change your password. Please try again.');
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild the button state as the policy resolves.
    ref.watch(currentPasswordPolicyProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: _saving ? null : () => Navigator.of(context).pop(),
            title: 'Change password',
            subtitle:
                'Pick something you don\'t use anywhere else. You\'ll stay '
                'signed in on this device.',
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                RegistrationFormCard(
                  icon: Icons.lock_outline_rounded,
                  title: 'Confirm it\'s you',
                  subtitle: 'Enter the password you sign in with today.',
                  children: [
                    RegisterFormField(
                      label: 'Current password',
                      controller: _current,
                      obscureText: _obscureCurrent,
                      textInputAction: TextInputAction.next,
                      autofocus: true,
                      errorText: _currentError,
                      onChanged: (_) => setState(() => _currentError = null),
                      onSubmitted: (_) => _nextFocus.requestFocus(),
                      suffixIcon: PasswordVisibilityToggle(
                        obscured: _obscureCurrent,
                        onToggle: () =>
                            setState(() => _obscureCurrent = !_obscureCurrent),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                RegistrationFormCard(
                  icon: Icons.password_rounded,
                  title: 'New password',
                  subtitle: 'Must meet the rules below before you can save.',
                  children: [
                    RegisterFormField(
                      label: 'New password',
                      controller: _next,
                      focusNode: _nextFocus,
                      obscureText: _obscureNext,
                      textInputAction: TextInputAction.next,
                      errorText: _sameAsCurrent
                          ? 'New password must differ from the current one.'
                          : null,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _confirmFocus.requestFocus(),
                      suffixIcon: PasswordVisibilityToggle(
                        obscured: _obscureNext,
                        onToggle: () =>
                            setState(() => _obscureNext = !_obscureNext),
                      ),
                    ),
                    if (_next.text.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      PasswordStrengthIndicator(password: _next.text),
                      const SizedBox(height: 10),
                      PasswordRuleChips(password: _next.text),
                    ],
                    const SizedBox(height: 16),
                    RegisterFormField(
                      label: 'Confirm new password',
                      controller: _confirm,
                      focusNode: _confirmFocus,
                      obscureText: _obscureConfirm,
                      textInputAction: TextInputAction.done,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => unawaited(_save()),
                      suffixIcon: PasswordVisibilityToggle(
                        obscured: _obscureConfirm,
                        onToggle: () =>
                            setState(() => _obscureConfirm = !_obscureConfirm),
                      ),
                    ),
                    if (_confirm.text.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      PasswordMatchNote(matches: _confirm.text == _next.text),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                const SecurityInfoNote(
                  icon: Icons.devices_outlined,
                  text:
                      'Other devices signed in to your account will be asked '
                      'to sign in again with the new password.',
                  color: AppColors.primaryDark,
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SecurityActionBar(
        label: 'Update password',
        busy: _saving,
        onPressed: _canSave ? () => unawaited(_save()) : null,
      ),
    );
  }
}
