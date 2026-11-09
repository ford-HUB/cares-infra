import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/models/app_release.dart';
import 'package:mobile/core/services/app_update_service.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/app_update_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/release_notes_markdown.dart';
import 'package:mobile/shared/widgets/gradient_button.dart';
import 'package:mobile/shared/widgets/ground_card.dart';
import 'package:url_launcher/url_launcher.dart';

/// Share of the screen the sheet rises to.
const double _sheetHeightFactor = 0.7;

/// Opens the release history read from GitHub Releases, newest first. The
/// sheet slides up to 70% of the screen and is dragged down by its header to
/// close; its notes scroll inside it.
Future<void> showReleaseNotesSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: AppColors.navBar.withValues(alpha: 0.45),
    sheetAnimationStyle: const AnimationStyle(
      duration: Duration(milliseconds: 520),
      reverseDuration: Duration(milliseconds: 320),
    ),
    builder: (_) => const _ReleaseNotesSheet(),
  );
}

class _ReleaseNotesSheet extends ConsumerWidget {
  const _ReleaseNotesSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final installed = ref.watch(installedVersionProvider).valueOrNull;
    final history = ref.watch(releaseHistoryProvider);
    final entries = history.valueOrNull ?? const <AppReleaseEntry>[];

    // Offer the newest installable release when it is above this build.
    final newest = entries.where((e) => e.installable != null).firstOrNull;
    final update =
        AppUpdateService.isSupported &&
            installed != null &&
            newest != null &&
            AppRelease.compareVersions(newest.version, installed) > 0
        ? newest.installable
        : null;

    final media = MediaQuery.of(context);
    final bottomInset = media.viewPadding.bottom;

    final Widget content = history.when(
      skipLoadingOnRefresh: false,
      loading: () => const _Loading(key: ValueKey('loading')),
      error: (_, _) => _Notice(
        key: const ValueKey('error'),
        text: AppCopy.releaseNotesLoadFailed,
        action: AppCopy.updateRetry,
        onAction: () => ref.invalidate(releaseHistoryProvider),
      ),
      data: (list) {
        if (AppUpdateService.releasesRepo == null) {
          return const _Notice(
            key: ValueKey('unavailable'),
            text: AppCopy.releaseNotesUnavailable,
          );
        }
        if (list.isEmpty) {
          return const _Notice(
            key: ValueKey('empty'),
            text: AppCopy.releaseNotesEmpty,
          );
        }
        return Column(
          key: const ValueKey('list'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < list.length; i++) ...[
              if (i > 0) const SizedBox(height: 12),
              _Entrance(
                index: i,
                child: _ReleaseCard(
                  entry: list[i],
                  isLatest: i == 0,
                  isInstalled: installed == list[i].version,
                ),
              ),
            ],
            if (AppUpdateService.releasesPageUrl case final url?) ...[
              const SizedBox(height: 10),
              Center(
                child: TextButton.icon(
                  onPressed: () => _openUrl(context, url),
                  icon: const Icon(Icons.open_in_new_rounded, size: 18),
                  label: const Text(AppCopy.releaseNotesAllOnGitHub),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primaryDark,
                    textStyle: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );

    return SizedBox(
      height: media.size.height * _sheetHeightFactor,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          boxShadow: [
            BoxShadow(
              color: Color(0x33000000),
              blurRadius: 24,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Pinned header — dragging it pulls the sheet down to close.
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Handle(),
                  const SizedBox(height: 14),
                  IconTileHeading(
                    icon: Icons.new_releases_rounded,
                    title: AppCopy.releaseNotesTitle,
                    body: installed == null
                        ? null
                        : update == null
                        ? AppCopy.releaseNotesInstalledBody(installed)
                        : AppCopy.releaseNotesUpdateBody(
                            installed,
                            update.version,
                          ),
                  ),
                  AnimatedSize(
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeOutCubic,
                    alignment: Alignment.topCenter,
                    child: update == null
                        ? const SizedBox(width: double.infinity)
                        : Padding(
                            padding: const EdgeInsets.only(top: 14),
                            child: _UpdateAction(release: update),
                          ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1, color: AppColors.cardBorder),
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics(),
                ),
                padding: EdgeInsets.fromLTRB(16, 16, 16, 24 + bottomInset),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  layoutBuilder: (current, previous) => Stack(
                    alignment: Alignment.topCenter,
                    children: [...previous, ?current],
                  ),
                  child: content,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Fades and lifts a release card in, one after another, once the sheet is up.
class _Entrance extends StatelessWidget {
  const _Entrance({required this.index, required this.child});

  final int index;
  final Widget child;

  static const int _stepMs = 70;
  static const int _runMs = 420;

  @override
  Widget build(BuildContext context) {
    final delay = index.clamp(0, 5) * _stepMs;
    final total = _runMs + delay;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: total),
      curve: Interval(delay / total, 1, curve: Curves.easeOutCubic),
      child: child,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, 18 * (1 - t)),
          child: child,
        ),
      ),
    );
  }
}

Future<void> _openUrl(BuildContext context, String url) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final opened = await launchUrl(
    Uri.parse(url),
    mode: LaunchMode.externalApplication,
  ).catchError((_) => false);
  if (!opened) {
    messenger?.showSnackBar(
      const SnackBar(
        content: Text(AppCopy.releaseNotesOpenFailed),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class _Handle extends StatelessWidget {
  const _Handle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: AppColors.cardBorder,
          borderRadius: BorderRadius.circular(AppColors.pillRadius),
        ),
      ),
    );
  }
}

/// "Update to vX" with download progress, reusing the splash's installer
/// flow through [appUpdateProvider].
class _UpdateAction extends ConsumerWidget {
  const _UpdateAction({required this.release});

  final AppRelease release;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final update = ref.watch(appUpdateProvider);
    final mine = update.release?.version == release.version;
    final phase = mine ? update.phase : AppUpdatePhase.available;
    final downloading = phase == AppUpdatePhase.downloading;
    final retry =
        phase == AppUpdatePhase.failed || phase == AppUpdatePhase.installing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (downloading) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(AppColors.pillRadius),
            child: LinearProgressIndicator(
              value: update.progress,
              minHeight: 6,
              backgroundColor: AppColors.softFieldFill,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            update.progress == null
                ? AppCopy.updateDownloading
                : '${AppCopy.updateDownloading} · ${(update.progress! * 100).round()}%',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryDark,
            ),
          ),
        ] else ...[
          if (phase == AppUpdatePhase.failed && update.error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                update.error!,
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.error,
                ),
              ),
            ),
          if (phase == AppUpdatePhase.installing)
            const Padding(
              padding: EdgeInsets.only(bottom: 10),
              child: Text(
                '${AppCopy.updateInstalling} ${AppCopy.updateInstallerHint}',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.inkMuted,
                ),
              ),
            ),
          GradientButton(
            label: retry
                ? AppCopy.updateRetry
                : AppCopy.releaseNotesUpdateTo(release.version),
            icon: retry ? Icons.refresh_rounded : Icons.download_rounded,
            onPressed: () =>
                ref.read(appUpdateProvider.notifier).startUpdateTo(release),
          ),
        ],
      ],
    );
  }
}

class _ReleaseCard extends StatelessWidget {
  const _ReleaseCard({
    required this.entry,
    required this.isLatest,
    required this.isInstalled,
  });

  final AppReleaseEntry entry;
  final bool isLatest;
  final bool isInstalled;

  @override
  Widget build(BuildContext context) {
    final date = entry.publishedAt;
    return GroundCard(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 2),
                      child: Text(
                        'v${entry.version}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                    if (isLatest)
                      const _Chip(
                        label: AppCopy.releaseNotesLatest,
                        fill: AppColors.primary,
                        text: Colors.white,
                      ),
                    if (isInstalled)
                      const _Chip(
                        label: AppCopy.releaseNotesInstalled,
                        fill: AppColors.softFieldFill,
                        text: AppColors.primaryDark,
                      ),
                    if (entry.isRequired)
                      _Chip(
                        label: AppCopy.releaseNotesRequired,
                        fill: AppColors.accentOrange.withValues(alpha: 0.12),
                        text: AppColors.accentOrange,
                      ),
                  ],
                ),
              ),
              if (date != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8, top: 4),
                  child: Text(
                    _formatDate(date),
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.inkMuted,
                    ),
                  ),
                ),
            ],
          ),
          if (entry.title != null) ...[
            const SizedBox(height: 4),
            Text(
              entry.title!,
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
          ],
          const SizedBox(height: 12),
          const Divider(
            height: 1,
            thickness: 1,
            color: AppColors.softFieldBorder,
          ),
          const SizedBox(height: 12),
          if (entry.markdown.isEmpty)
            const Text(
              AppCopy.releaseNotesNoNotes,
              style: TextStyle(fontSize: 13.5, color: AppColors.inkMuted),
            )
          else
            ReleaseNotesMarkdown(
              markdown: entry.markdown,
              onOpenLink: (url) => _openUrl(context, url),
            ),
          if (entry.pageUrl case final url?)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => _openUrl(context, url),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  textStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                child: const Text(AppCopy.releaseNotesViewOnGitHub),
              ),
            )
          else
            const SizedBox(height: 8),
        ],
      ),
    );
  }

  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  static String _formatDate(DateTime d) =>
      '${_months[d.month - 1]} ${d.day}, ${d.year}';
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.fill, required this.text});

  final String label;
  final Color fill;
  final Color text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: fill,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: text,
        ),
      ),
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 36),
      child: Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(
            strokeWidth: 2.6,
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({super.key, required this.text, this.action, this.onAction});

  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return GroundCard(
      child: Column(
        children: [
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              height: 1.45,
              color: AppColors.textSecondary,
            ),
          ),
          if (action != null && onAction != null) ...[
            const SizedBox(height: 6),
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primaryDark,
                textStyle: const TextStyle(fontWeight: FontWeight.w800),
              ),
              child: Text(action!),
            ),
          ],
        ],
      ),
    );
  }
}
