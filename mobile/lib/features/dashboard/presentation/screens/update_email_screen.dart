import 'dart:async';

import 'package:flutter/material.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/account_security_service.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/account_security_widgets.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Step 2 of the email update, reached only after the OTP on the current
/// address passed. The current email is shown locked; the person types the
/// replacement and confirms.
///
/// `PUT /account/mobile/email` writes the address and hands back a token
/// re-signed with it, which replaces the session token before returning.
class UpdateEmailScreen extends StatefulWidget {
  const UpdateEmailScreen({
    super.key,
    required this.currentEmail,
    required this.changeToken,
  });

  final String currentEmail;

  /// Issued by the OTP step; single-use and short-lived on the server.
  final String changeToken;

  static Future<String?> open(
    BuildContext context, {
    required String currentEmail,
    required String changeToken,
  }) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute<String>(
        builder: (_) => UpdateEmailScreen(
          currentEmail: currentEmail,
          changeToken: changeToken,
        ),
      ),
    );
  }

  @override
  State<UpdateEmailScreen> createState() => _UpdateEmailScreenState();
}

class _UpdateEmailScreenState extends State<UpdateEmailScreen> {
  final AccountSecurityService _service = AccountSecurityService();
  static final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

  late final _current = TextEditingController(text: widget.currentEmail);
  final _replacement = TextEditingController();

  bool _saving = false;
  bool _touched = false;

  /// Server rejection of the address (already on another account).
  String? _serverError;

  @override
  void dispose() {
    _current.dispose();
    _replacement.dispose();
    super.dispose();
  }

  String get _value => _replacement.text.trim();

  String? get _error {
    if (_serverError != null) return _serverError;
    if (!_touched || _value.isEmpty) return null;
    if (!_emailPattern.hasMatch(_value)) return 'Enter a valid email address.';
    if (_value.toLowerCase() == widget.currentEmail.trim().toLowerCase()) {
      return 'That\'s already your current email.';
    }
    return null;
  }

  bool get _canSave => _value.isNotEmpty && _error == null && !_saving;

  Future<void> _save() async {
    if (!_canSave) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _saving = true);
    try {
      final result = await _service.changeEmail(
        changeToken: widget.changeToken,
        newEmail: _value,
      );
      // The old token still carries the old address; swap before anything
      // else on the stack makes a call.
      if (result.accessToken.isNotEmpty) {
        AuthSession.setAccessToken(result.accessToken);
      }
      RoleAccountStore.instance.updateEmailEverywhere(result.email);
      if (!mounted) return;
      Navigator.of(context).pop(result.email);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        // 409 is about the address itself, so it belongs under the field;
        // anything else (expired token, network) goes to the snackbar.
        if (e.statusCode == 409) {
          _serverError = e.message;
        }
      });
      if (e.statusCode != 409) _showMessage(e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      _showMessage('Could not update your email. Please try again.');
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: _saving ? null : () => Navigator.of(context).pop(),
            title: 'Update email',
            subtitle:
                'Step 2 of 2 — enter the address you\'d like to sign in with '
                'from now on.',
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                const SecurityInfoNote(
                  icon: Icons.check_circle_outline_rounded,
                  text: 'Current email verified. You can now choose a new one.',
                  color: AppColors.secondary,
                ),
                const SizedBox(height: 20),
                RegistrationFormCard(
                  icon: Icons.alternate_email_rounded,
                  title: 'Email address',
                  subtitle:
                      'Your sign-in email — this is where we\'ll reach you.',
                  children: [
                    RegisterFormField(
                      label: 'Current email',
                      controller: _current,
                      readOnly: true,
                    ),
                    const SizedBox(height: 16),
                    RegisterFormField(
                      label: 'New email',
                      controller: _replacement,
                      hint: 'name@example.com',
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.done,
                      autofocus: true,
                      errorText: _error,
                      onChanged: (_) => setState(() {
                        _touched = true;
                        _serverError = null;
                      }),
                      onSubmitted: (_) => unawaited(_save()),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'You\'ll use the new address the next time you sign in. '
                  'Notifications and certificates will be sent there too.',
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.4,
                    color: AppColors.textSecondary.withValues(alpha: 0.95),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SecurityActionBar(
        label: 'Save new email',
        busy: _saving,
        onPressed: _canSave ? () => unawaited(_save()) : null,
      ),
    );
  }
}
