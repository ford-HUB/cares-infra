import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Blocks the flow when the typed email already belongs to an account — the
/// user has to acknowledge it before going back to change the address.
Future<void> showAccountExistsDialog(
  BuildContext context, {
  required String email,
}) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      icon: const Icon(
        Icons.person_outline_rounded,
        size: 32,
        color: AppColors.primaryDark,
      ),
      title: const Text('Account already exists'),
      content: Text(
        'An account is already registered with $email. '
        'Use a different email address to continue, or sign in with this one.',
        textAlign: TextAlign.center,
      ),
      actions: [
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: const Text('Use another email'),
        ),
      ],
    ),
  );
}
