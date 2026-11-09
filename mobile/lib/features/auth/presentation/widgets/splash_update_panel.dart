import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/app_update_provider.dart';
import 'package:mobile/shared/widgets/gradient_button.dart';
import 'package:mobile/shared/widgets/ground_card.dart';

/// Floating card at the foot of the splash offering a newer release.
///
/// Reads [appUpdateProvider]: offer → download progress → installer hand-off,
/// with retry on failure. "Later" is hidden when the release is required.
class SplashUpdatePanel extends ConsumerWidget {
  const SplashUpdatePanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final update = ref.watch(appUpdateProvider);
    final controller = ref.read(appUpdateProvider.notifier);
    final release = update.release;
    if (release == null) return const SizedBox.shrink();

    final busy =
        update.phase == AppUpdatePhase.downloading ||
        update.phase == AppUpdatePhase.installing;
    final retry =
        update.phase == AppUpdatePhase.failed ||
        update.phase == AppUpdatePhase.installing;

    return Container(
      decoration: AppDecorations.floatingCard(),
      padding: const EdgeInsets.all(22),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          IconTileHeading(
            icon: Icons.system_update_rounded,
            title: release.isRequired
                ? AppCopy.updateRequiredTitle
                : AppCopy.updateTitle,
            body: release.isRequired
                ? AppCopy.updateRequiredBody
                : AppCopy.updateBody(release.version),
          ),
          if (release.notes.isNotEmpty) ...[
            const SizedBox(height: 16),
            _ReleaseNotes(notes: release.notes),
          ],
          const SizedBox(height: 18),
          if (busy)
            _DownloadProgress(
              installing: update.phase == AppUpdatePhase.installing,
              progress: update.progress,
            ),
          if (update.phase == AppUpdatePhase.failed && update.error != null)
            _Message(text: update.error!, color: AppColors.error),
          if (busy || update.phase == AppUpdatePhase.failed)
            const SizedBox(height: 14),
          if (update.phase != AppUpdatePhase.downloading)
            GradientButton(
              label: retry ? AppCopy.updateRetry : AppCopy.updateNow,
              icon: retry ? Icons.refresh_rounded : Icons.download_rounded,
              onPressed: controller.startUpdate,
            ),
          if (!release.isRequired && update.phase != AppUpdatePhase.downloading)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: TextButton(
                onPressed: controller.dismiss,
                child: const Text(
                  AppCopy.updateLater,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ReleaseNotes extends StatelessWidget {
  const _ReleaseNotes({required this.notes});

  final String notes;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 132),
      decoration: BoxDecoration(
        color: AppColors.softFieldFill,
        border: Border.all(color: AppColors.softFieldBorder),
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              AppCopy.updateWhatsNew,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              notes,
              style: const TextStyle(
                fontSize: 13,
                height: 1.45,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DownloadProgress extends StatelessWidget {
  const _DownloadProgress({required this.installing, required this.progress});

  final bool installing;
  final double? progress;

  @override
  Widget build(BuildContext context) {
    final percent = progress == null ? null : (progress! * 100).round();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                installing
                    ? AppCopy.updateInstalling
                    : AppCopy.updateDownloading,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            if (!installing && percent != null)
              Text(
                '$percent%',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppColors.pillRadius),
          child: LinearProgressIndicator(
            value: installing ? 1 : progress,
            minHeight: 6,
            backgroundColor: AppColors.softFieldFill,
            color: AppColors.primary,
          ),
        ),
        if (installing) ...[
          const SizedBox(height: 8),
          const _Message(
            text: AppCopy.updateInstallerHint,
            color: AppColors.inkMuted,
          ),
        ],
      ],
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(fontSize: 13, height: 1.4, color: color),
    );
  }
}
