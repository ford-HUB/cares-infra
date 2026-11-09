import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/app_release.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/app_update_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/release_notes_sheet.dart';

/// Small `v1.2.0` label in the bottom-right corner of login. Tapping it opens the
/// release notes from GitHub Releases. A lime dot shows when the splash
/// found a newer release, e.g. after the user tapped "Later".
class AppVersionBadge extends ConsumerWidget {
  const AppVersionBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final installed = ref.watch(installedVersionProvider).valueOrNull;
    if (installed == null) return const SizedBox.shrink();

    final offered = ref.watch(appUpdateProvider.select((s) => s.release));
    final hasUpdate =
        offered != null &&
        AppRelease.compareVersions(offered.version, installed) > 0;

    return Semantics(
      button: true,
      label: 'Version $installed. Show release notes.',
      excludeSemantics: true,
      // Bare text, no pill: the padding only widens the tap target.
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => showReleaseNotesSheet(context),
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (hasUpdate) ...[
                Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(
                    color: AppColors.navActive,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
              ],
              Text(
                'v$installed',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                  color: Colors.white.withValues(alpha: 0.85),
                  // Keeps it legible if the nav-bar inset lifts it onto the
                  // paler back wave.
                  shadows: const [
                    Shadow(color: Color(0x40000000), blurRadius: 3),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
