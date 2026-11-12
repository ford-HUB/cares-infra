import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/constants/support_contact.dart';
import 'package:mobile/features/auth/presentation/providers/app_update_provider.dart';
import 'package:url_launcher/url_launcher.dart';

/// "Need help? careeesadmin@gmail.com" on the login footer band. Tapping it
/// opens the user's mail app with the support address, subject and a
/// pre-filled body (including the installed app version) already in place.
class LoginSupportEmail extends ConsumerWidget {
  const LoginSupportEmail({super.key});

  Future<void> _compose(BuildContext context, String? appVersion) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    final uri = SupportContact.mailtoUri(
      appVersion: appVersion == null ? null : 'v$appVersion',
      platform:
          '${Platform.operatingSystem} ${Platform.operatingSystemVersion}',
    );

    final opened = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    ).catchError((_) => false);
    if (!opened) {
      messenger?.showSnackBar(
        const SnackBar(
          content: Text(AppCopy.loginSupportOpenFailed),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appVersion = ref.watch(installedVersionProvider).valueOrNull;
    final baseStyle = TextStyle(
      fontSize: 12,
      color: Colors.white.withValues(alpha: 0.85),
      // Same lift as the version badge, so it stays legible on the wave.
      shadows: const [Shadow(color: Color(0x40000000), blurRadius: 3)],
    );

    return Semantics(
      link: true,
      label: 'Email CARES support at ${SupportContact.email}',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _compose(context, appVersion),
        child: Padding(
          // Widens the tap target without moving the text.
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.mail_outline_rounded,
                size: 14,
                color: Colors.white.withValues(alpha: 0.9),
              ),
              const SizedBox(width: 5),
              Text(AppCopy.loginSupportPrompt, style: baseStyle),
              Text(
                SupportContact.email,
                style: baseStyle.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  decoration: TextDecoration.underline,
                  decorationColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
